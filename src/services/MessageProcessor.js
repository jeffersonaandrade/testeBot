const { logger } = require('../utils/logger');
const { WhatsAppUtils } = require('../utils/whatsapp');
const { messageGrouper } = require('../utils/optimization');

class MessageProcessor {
  constructor(services) {
    this.userController = services.userController;
    this.opcoesController = services.opcoesController;
    this.apiController = services.apiController;
    this.rateLimitController = services.rateLimitController;
    this.leadService = services.leadService;
    this.config = services.config;
  }

  async processMessage(message) {
    const prompt = message.body;
    
    if (!prompt || prompt.length < 1) return;

    // Ignorar mensagens de status/stories
    if (message.from === 'status@broadcast') {
      logger.info('Ignorando mensagem de status', { 
        mensagem: WhatsAppUtils.formatarMensagem(prompt) 
      });
      return;
    }

    // Verificar se sistema está ativo (rate limits)
    if (!this.rateLimitController.sistemaEstaAtivo()) {
      const mensagemForaDoAr = this.rateLimitController.getMensagemSistemaForaDoAr();
      await message.reply(mensagemForaDoAr);
      logger.warn('Sistema fora do ar - Mensagem de manutenção enviada', { 
        telefone: WhatsAppUtils.extrairTelefone(message.from),
        motivo: this.rateLimitController.motivoDesativacao 
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
      const verificacao = this.userController.podeReceberResposta(telefone);
      if (!verificacao.pode) {
        let mensagemBloqueio;
        
        if (verificacao.motivo === 'bloqueado') {
          mensagemBloqueio = this.userController.getMensagemBloqueio(telefone);
          logger.info('Usuário bloqueado - SEM gastar tokens', { telefone, motivo: verificacao.motivo });
        } else if (verificacao.motivo === 'limite_respostas') {
          mensagemBloqueio = this.userController.getMensagemLimite(telefone);
          logger.info('Usuário atingiu limite - SEM gastar tokens', { telefone, motivo: verificacao.motivo });
        }
        
        await message.reply(mensagemBloqueio);
        return; // Para aqui - NÃO processa mais nada
      }
      
      // 2. Processar com sistema de opções primeiro
      const resultadoOpcoes = await this.opcoesController.processarMensagem(telefone, prompt);
      
      // Se deve mostrar menu
      if (resultadoOpcoes.mostrarMenu) {
        const textoMenu = this.opcoesController.gerarTextoMenu(resultadoOpcoes.menu);
        await message.reply(textoMenu);
        
        if (resultadoOpcoes.mensagemErro) {
          await message.reply(resultadoOpcoes.mensagemErro);
        }
        
        logger.info('Menu exibido', { telefone, menu: resultadoOpcoes.menu });
        return;
      }
      
      // Se opção foi selecionada
      if (resultadoOpcoes.opcaoSelecionada) {
        await this.processarOpcaoSelecionada(message, telefone, resultadoOpcoes);
        return;
      }
      
      // 3. Se não for opção, usar IA (fallback)
      if (resultadoOpcoes.usarIA) {
        await this.processarComIA(message, telefone, prompt);
      }

    } catch (error) {
      await this.handleError(message, error);
    }
  }

  async processarOpcaoSelecionada(message, telefone, resultadoOpcoes) {
    const resposta = this.opcoesController.obterRespostaOpcao(resultadoOpcoes.resposta);
    
    if (resposta) {
      await message.reply(WhatsAppUtils.formatarMensagem(resposta));
      this.userController.incrementarContador(telefone);
      
      // Se próximo menu, mostrar
      if (resultadoOpcoes.proximoMenu) {
        const proximoMenu = this.opcoesController.gerarTextoMenu(resultadoOpcoes.proximoMenu);
        await message.reply(proximoMenu);
      }
      
      // Se for comprador, bloquear
      if (resultadoOpcoes.intencao === 'COMPRADOR') {
        this.userController.bloquearUsuario(telefone, 'comprador_opcao');
        
        setTimeout(async () => {
          const mensagemTransferencia = "🔄 Sua solicitação foi encaminhada para nosso time de vendas. Você receberá um contato em breve!";
          await WhatsAppUtils.enviarMensagemComDelay(
            this.client, 
            message.from, 
            mensagemTransferencia, 
            this.config.bot.tempoResposta
          );
          logger.info('Transferência iniciada via opção', { telefone });
        }, this.config.bot.tempoResposta);
      }
      
      logger.info('Opção processada', { 
        telefone, 
        intencao: resultadoOpcoes.intencao,
        contador: this.userController.getContadorRespostas(telefone)
      });
    }
  }

  async processarComIA(message, telefone, prompt) {
    // Tentar agrupar mensagens para otimizar API
    const mensagemAgrupada = messageGrouper.adicionarMensagem(telefone, prompt);
    
    // Se ainda não processar (aguardando mais mensagens), responder com confirmação
    if (!mensagemAgrupada) {
      await message.reply("✅ Mensagem recebida! Processando...");
      return;
    }
    
    // Verificar rate limits antes de usar IA
    if (!this.rateLimitController.podeFazerRequisicao(200)) {
      const mensagemForaDoAr = this.rateLimitController.getMensagemSistemaForaDoAr();
      await message.reply(mensagemForaDoAr);
      logger.warn('Rate limit próximo - IA desabilitada', { 
        telefone,
        mensagem: mensagemAgrupada 
      });
      return;
    }
    
    // 4. Classificar intenção do cliente
    const intencao = await this.apiController.classificarIntencao(mensagemAgrupada);
    this.rateLimitController.registrarUso(50); // Registrar uso da classificação
    logger.info('Intenção classificada via IA', { intencao, mensagemAgrupada });
    
    // 5. Verificar limite novamente (agora com a intenção conhecida)
    const verificacaoFinal = this.userController.podeReceberResposta(telefone, intencao);
    if (!verificacaoFinal.pode) {
      let mensagemLimite = this.userController.getMensagemLimite(telefone);
      await message.reply(mensagemLimite);
      logger.info('Usuário atingiu limite após classificação', { telefone, intencao });
      return;
    }
    
    // 6. Gerar resposta apropriada
    const resposta = await this.apiController.gerarResposta(mensagemAgrupada, intencao);
    this.rateLimitController.registrarUso(150); // Registrar uso da geração de resposta
    
    // 7. Salvar lead se for comprador ou interessado
    if (intencao === "COMPRADOR" || intencao === "INTERESSADO") {
      const lead = {
        telefone: telefone,
        nome: WhatsAppUtils.extrairNomeContato(message.from),
        intencao: intencao,
        mensagem: mensagemAgrupada
      };
      this.leadService.salvarLead(lead);
    }
    
    // 8. Enviar resposta e incrementar contador
    await message.reply(resposta);
    this.userController.incrementarContador(telefone);
    
    logger.info('Resposta enviada via IA', { 
      intencao, 
      resposta: WhatsAppUtils.formatarMensagem(resposta, { truncar: 50 }),
      contador: this.userController.getContadorRespostas(telefone)
    });
    
    // 9. Se for comprador, bloquear usuário e notificar sobre transferência
    if (intencao === "COMPRADOR" && this.config.bot.notificarTransferencia) {
      // Bloquear usuário para evitar mais respostas automáticas
      this.userController.bloquearUsuario(telefone, 'comprador_transferido');
      
      setTimeout(async () => {
        const mensagemTransferencia = "🔄 Sua solicitação foi encaminhada para nosso time de vendas. Você receberá um contato em breve!";
        await WhatsAppUtils.enviarMensagemComDelay(
          this.client, 
          message.from, 
          mensagemTransferencia, 
          this.config.bot.tempoResposta
        );
        logger.info('Notificação de transferência enviada e usuário bloqueado', { telefone });
      }, this.config.bot.tempoResposta);
    }
  }

  async handleError(message, error) {
    logger.error('Erro ao processar mensagem', {
      error: error.message,
      mensagem: message.body,
      stack: error.stack
    });

    try {
      await message.reply("❌ Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.");
    } catch (finalError) {
      logger.error('Erro crítico ao notificar usuário', { error: finalError.message });
    }
  }
}

module.exports = MessageProcessor; 