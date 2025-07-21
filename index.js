require("dotenv").config();

// Importações centralizadas
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const config = require("./config");
const { logger, FileUtils, WhatsAppUtils, messageGrouper } = require("./utils");
const ApiController = require("./api-controller");
const UserController = require("./user-controller");
const OpcoesController = require("./opcoes-controller");
const RateLimitController = require("./rate-limit-controller");

// Inicializar controladores
const apiController = new ApiController();
const userController = new UserController();
const opcoesController = new OpcoesController();
const rateLimitController = new RateLimitController();

// Configurar cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: config.whatsapp
});

// Função para salvar leads
function salvarLead(lead) {
  if (!config.bot.salvarLeads) return;

  const dados = {
    timestamp: new Date().toISOString(),
    telefone: lead.telefone,
    nome: lead.nome,
    intencao: lead.intencao,
    mensagem: lead.mensagem
  };

  if (FileUtils.salvarCSV([dados], config.bot.arquivoLeads)) {
    logger.info('Lead salvo', { nome: lead.nome, intencao: lead.intencao });
  } else {
    logger.error('Erro ao salvar lead', { nome: lead.nome });
  }
}

// Função para processar mensagem
async function processarMensagem(message) {
  const prompt = message.body;
  
  if (!prompt || prompt.length < 1) return;

  // Ignorar mensagens de status/stories
  if (message.from === 'status@broadcast') {
    logger.info('Ignorando mensagem de status', { mensagem: WhatsAppUtils.formatarMensagem(prompt) });
    return;
  }

  // Verificar se sistema está ativo (rate limits)
  if (!rateLimitController.sistemaEstaAtivo()) {
    const mensagemForaDoAr = rateLimitController.getMensagemSistemaForaDoAr();
    await message.reply(mensagemForaDoAr);
    logger.warn('Sistema fora do ar - Mensagem de manutenção enviada', { 
      telefone: WhatsAppUtils.extrairTelefone(message.from),
      motivo: rateLimitController.motivoDesativacao 
    });
    return;
  }

  try {
    const telefone = WhatsAppUtils.extrairTelefone(message.from);
    
    logger.info('Nova mensagem recebida', { 
      from: telefone,
      mensagem: WhatsAppUtils.formatarMensagem(prompt)
    });
    
    // 1. Verificar se usuário pode receber resposta (ANTES de processar)
    const verificacao = userController.podeReceberResposta(telefone);
    if (!verificacao.pode) {
      let mensagemBloqueio;
      
      if (verificacao.motivo === 'bloqueado') {
        mensagemBloqueio = userController.getMensagemBloqueio(telefone);
        logger.info('Usuário bloqueado - SEM gastar tokens', { telefone, motivo: verificacao.motivo });
      } else if (verificacao.motivo === 'limite_respostas') {
        mensagemBloqueio = userController.getMensagemLimite(telefone);
        logger.info('Usuário atingiu limite - SEM gastar tokens', { telefone, motivo: verificacao.motivo });
      }
      
      await message.reply(mensagemBloqueio);
      return; // Para aqui - NÃO processa mais nada
    }
    
    // 2. Processar com sistema de opções primeiro
    const resultadoOpcoes = await opcoesController.processarMensagem(telefone, prompt);
    
    // Se deve mostrar menu
    if (resultadoOpcoes.mostrarMenu) {
      const textoMenu = opcoesController.gerarTextoMenu(resultadoOpcoes.menu);
      await message.reply(textoMenu);
      
      if (resultadoOpcoes.mensagemErro) {
        await message.reply(resultadoOpcoes.mensagemErro);
      }
      
      logger.info('Menu exibido', { telefone, menu: resultadoOpcoes.menu });
      return;
    }
    
    // Se opção foi selecionada
    if (resultadoOpcoes.opcaoSelecionada) {
      const resposta = opcoesController.obterRespostaOpcao(resultadoOpcoes.resposta);
      
      if (resposta) {
        await message.reply(WhatsAppUtils.formatarMensagem(resposta));
        userController.incrementarContador(telefone);
        
        // Se próximo menu, mostrar
        if (resultadoOpcoes.proximoMenu) {
          const proximoMenu = opcoesController.gerarTextoMenu(resultadoOpcoes.proximoMenu);
          await message.reply(proximoMenu);
        }
        
        // Se for comprador, bloquear
        if (resultadoOpcoes.intencao === 'COMPRADOR') {
          userController.bloquearUsuario(telefone, 'comprador_opcao');
          
          setTimeout(async () => {
            const mensagemTransferencia = "🔄 Sua solicitação foi encaminhada para nosso time de vendas. Você receberá um contato em breve!";
            await WhatsAppUtils.enviarMensagemComDelay(client, message.from, mensagemTransferencia, config.bot.tempoResposta);
            logger.info('Transferência iniciada via opção', { telefone });
          }, config.bot.tempoResposta);
        }
        
        logger.info('Opção processada', { 
          telefone, 
          intencao: resultadoOpcoes.intencao,
          contador: userController.getContadorRespostas(telefone)
        });
        return;
      }
    }
    
    // 3. Se não for opção, usar IA (fallback)
    if (resultadoOpcoes.usarIA) {
      // Tentar agrupar mensagens para otimizar API
      const mensagemAgrupada = messageGrouper.adicionarMensagem(telefone, prompt);
      
      // Se ainda não processar (aguardando mais mensagens), responder com confirmação
      if (!mensagemAgrupada) {
        await message.reply("✅ Mensagem recebida! Processando...");
        return;
      }
      
      // Verificar rate limits antes de usar IA
      if (!rateLimitController.podeFazerRequisicao(200)) {
        const mensagemForaDoAr = rateLimitController.getMensagemSistemaForaDoAr();
        await message.reply(mensagemForaDoAr);
        logger.warn('Rate limit próximo - IA desabilitada', { 
          telefone,
          mensagem: mensagemAgrupada 
        });
        return;
      }
      
      // 4. Classificar intenção do cliente
      const intencao = await apiController.classificarIntencao(mensagemAgrupada);
      rateLimitController.registrarUso(50); // Registrar uso da classificação
      logger.info('Intenção classificada via IA', { intencao, mensagemAgrupada });
      
      // 5. Verificar limite novamente (agora com a intenção conhecida)
      const verificacaoFinal = userController.podeReceberResposta(telefone, intencao);
      if (!verificacaoFinal.pode) {
        let mensagemLimite = userController.getMensagemLimite(telefone);
        await message.reply(mensagemLimite);
        logger.info('Usuário atingiu limite após classificação', { telefone, intencao });
        return;
      }
      
      // 6. Gerar resposta apropriada
      const resposta = await apiController.gerarResposta(mensagemAgrupada, intencao);
      rateLimitController.registrarUso(150); // Registrar uso da geração de resposta
      
      // 7. Salvar lead se for comprador ou interessado
      if (intencao === "COMPRADOR" || intencao === "INTERESSADO") {
        const lead = {
          telefone: telefone,
          nome: WhatsAppUtils.extrairNomeContato(message.from),
          intencao: intencao,
          mensagem: mensagemAgrupada
        };
        salvarLead(lead);
      }
      
      // 8. Enviar resposta e incrementar contador
      await message.reply(resposta);
      userController.incrementarContador(telefone);
      
      logger.info('Resposta enviada via IA', { 
        intencao, 
        resposta: WhatsAppUtils.formatarMensagem(resposta, { truncar: 50 }),
        contador: userController.getContadorRespostas(telefone)
      });
      
      // 9. Se for comprador, bloquear usuário e notificar sobre transferência
      if (intencao === "COMPRADOR" && config.bot.notificarTransferencia) {
        // Bloquear usuário para evitar mais respostas automáticas
        userController.bloquearUsuario(telefone, 'comprador_transferido');
        
        setTimeout(async () => {
          const mensagemTransferencia = "🔄 Sua solicitação foi encaminhada para nosso time de vendas. Você receberá um contato em breve!";
          await WhatsAppUtils.enviarMensagemComDelay(
            client, 
            message.from, 
            mensagemTransferencia, 
            config.bot.tempoResposta
          );
          logger.info('Notificação de transferência enviada e usuário bloqueado', { telefone });
        }, config.bot.tempoResposta);
      }
    }

  } catch (error) {
    logger.error('Erro ao processar mensagem', {
      error: error.message,
      mensagem: prompt,
      stack: error.stack
    });

    try {
      await message.reply("❌ Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.");
    } catch (finalError) {
      logger.error('Erro crítico ao notificar usuário', { error: finalError.message });
    }
  }
}

// Eventos do WhatsApp
client.on("qr", (qr) => {
  logger.info("QR Code gerado - Escaneie com o WhatsApp");
  qrcode.generate(qr, config.whatsapp.qrCode);
});

client.on("ready", () => {
  logger.info("Bot conectado com sucesso", {
    empresa: config.empresa.nome,
    rateLimits: config.api.groq.rateLimits
  });
});

client.on("message", processarMensagem);

// Tratamento de erros globais
process.on('unhandledRejection', (error) => {
  logger.error('Erro não tratado', { error: error.message, stack: error.stack });
});

process.on('SIGINT', () => {
  logger.info('Bot sendo encerrado...');
  process.exit(0);
});

// Inicializar bot
logger.info('Iniciando bot de pré-atendimento...');
client.initialize();