const config = require('./config');
const { logger, WhatsAppUtils } = require('./utils');

class OpcoesController {
  constructor() {
    this.sessoes = new Map(); // Sessões ativas por usuário
    this.config = config.opcoes;
  }

  // Verificar se mensagem é uma opção válida
  isOpcaoValida(mensagem, menuAtual = 'principal') {
    const menu = this.getMenu(menuAtual);
    if (!menu) return false;

    const opcao = menu.opcoes.find(op => 
      op.numero === mensagem.trim() || 
      mensagem.toLowerCase().includes(op.numero)
    );

    return opcao || false;
  }

  // Obter menu atual
  getMenu(tipo = 'principal') {
    if (tipo === 'principal') {
      return this.config.menuPrincipal;
    }
    return this.config.submenus[tipo] || null;
  }

  // Processar opção selecionada
  processarOpcao(telefone, mensagem, menuAtual = 'principal') {
    const menu = this.getMenu(menuAtual);
    if (!menu) return null;

    const opcao = menu.opcoes.find(op => 
      op.numero === mensagem.trim() || 
      mensagem.toLowerCase().includes(op.numero)
    );

    if (!opcao) return null;

    // Atualizar sessão do usuário
    this.atualizarSessao(telefone, {
      menuAtual: tipo,
      ultimaOpcao: opcao,
      timestamp: Date.now()
    });

    logger.info('Opção selecionada', { 
      telefone, 
      opcao: opcao.numero, 
      intencao: opcao.intencao,
      menuAtual 
    });

    return {
      opcao,
      intencao: opcao.intencao,
      resposta: opcao.resposta || null,
      proximoMenu: this.getProximoMenu(opcao, menuAtual)
    };
  }

  // Obter próximo menu baseado na opção
  getProximoMenu(opcao, menuAtual) {
    if (opcao.intencao === 'VOLTAR') {
      return menuAtual === 'principal' ? null : 'principal';
    }

    // Mapear opções para submenus
    const mapeamento = {
      'resposta_interessado_produtos': 'produtos',
      'resposta_interessado_orcamento': 'orcamento'
    };

    return mapeamento[opcao.resposta] || null;
  }

  // Gerar texto do menu
  gerarTextoMenu(tipo = 'principal') {
    const menu = this.getMenu(tipo);
    if (!menu) return null;

    let texto = `${menu.titulo}\n\n`;
    
    if (menu.subtitulo) {
      texto += `${menu.subtitulo}\n\n`;
    }

    menu.opcoes.forEach(opcao => {
      texto += `${opcao.numero}. ${opcao.texto}\n`;
    });

    texto += `\n💡 Digite o número da opção desejada.`;
    
    return WhatsAppUtils.formatarMensagem(texto);
  }

  // Verificar se deve mostrar menu inicial
  deveMostrarMenuInicial(telefone) {
    if (!this.config.configuracao.mostrarMenuInicial) return false;
    
    const sessao = this.sessoes.get(telefone);
    return !sessao || !sessao.primeiraInteracao;
  }

  // Marcar primeira interação
  marcarPrimeiraInteracao(telefone) {
    const sessao = this.sessoes.get(telefone) || {};
    sessao.primeiraInteracao = true;
    this.sessoes.set(telefone, sessao);
  }

  // Atualizar sessão do usuário
  atualizarSessao(telefone, dados) {
    const sessao = this.sessoes.get(telefone) || {};
    Object.assign(sessao, dados);
    this.sessoes.set(telefone, sessao);
  }

  // Obter sessão do usuário
  getSessao(telefone) {
    return this.sessoes.get(telefone) || null;
  }

  // Verificar timeout do menu
  verificarTimeout(telefone) {
    const sessao = this.getSessao(telefone);
    if (!sessao || !sessao.timestamp) return false;

    const timeout = this.config.configuracao.timeoutMenu;
    const agora = Date.now();
    
    return (agora - sessao.timestamp) > timeout;
  }

  // Limpar sessão expirada
  limparSessaoExpirada(telefone) {
    if (this.verificarTimeout(telefone)) {
      this.sessoes.delete(telefone);
      logger.info('Sessão expirada removida', { telefone });
      return true;
    }
    return false;
  }

  // Processar mensagem com opções
  async processarMensagem(telefone, mensagem) {
    // Verificar se sistema de opções está ativo
    if (!this.config.ativo) {
      return { usarIA: true };
    }

    // Limpar sessão expirada
    this.limparSessaoExpirada(telefone);

    // Verificar se é primeira interação
    if (this.deveMostrarMenuInicial(telefone)) {
      this.marcarPrimeiraInteracao(telefone);
      return {
        mostrarMenu: true,
        menu: 'principal',
        usarIA: false
      };
    }

    // Verificar se é comando de menu
    if (mensagem.toLowerCase().includes('menu')) {
      return {
        mostrarMenu: true,
        menu: 'principal',
        usarIA: false
      };
    }

    // Verificar se é opção válida
    const sessao = this.getSessao(telefone);
    const menuAtual = sessao?.menuAtual || 'principal';
    
    if (this.isOpcaoValida(mensagem, menuAtual)) {
      const resultado = this.processarOpcao(telefone, mensagem, menuAtual);
      
      if (resultado) {
        return {
          opcaoSelecionada: true,
          intencao: resultado.intencao,
          resposta: resultado.resposta,
          proximoMenu: resultado.proximoMenu,
          usarIA: false
        };
      }
    }

    // Se não for opção válida e permitir texto livre
    if (this.config.configuracao.permitirTextoLivre) {
      return { usarIA: true };
    }

    // Se não permitir texto livre, mostrar menu
    return {
      mostrarMenu: true,
      menu: menuAtual,
      mensagemErro: "❌ Opção inválida. Por favor, escolha uma das opções disponíveis:",
      usarIA: false
    };
  }

  // Obter resposta baseada na opção
  obterRespostaOpcao(resposta) {
    const respostas = {
      'resposta_interessado_produtos': `📋 **Nossos Produtos/Serviços**

Aqui estão nossos principais produtos:

🛍️ **Produto A** - Descrição do produto A
💰 **Produto B** - Descrição do produto B  
🔧 **Produto C** - Descrição do produto C

Para mais detalhes sobre qualquer produto, digite o número correspondente ou entre em contato: {telefone_empresa}`,

      'resposta_interessado_orcamento': `💰 **Solicitar Orçamento**

Para fazer um orçamento personalizado, precisamos de algumas informações:

📝 **Orçamento Rápido** - Apenas informações básicas
📋 **Orçamento Detalhado** - Análise completa

Qual tipo de orçamento você prefere?

Digite 1 para rápido ou 2 para detalhado.`,

      'resposta_comprador': `🛒 **Compra Direta**

Perfeito! Vamos facilitar sua compra.

Para prosseguir, preciso de algumas informações:

📱 **Telefone para contato**
📧 **Email (opcional)**
🏢 **Empresa (se aplicável)**

Ou se preferir, posso transferir você diretamente para nosso time de vendas.

Digite suas informações ou "transferir" para falar com um atendente.`,

      'resposta_curioso': `❓ **Dúvidas Gerais**

Olá! Fico feliz em ajudar com suas dúvidas.

Aqui estão algumas informações gerais sobre a {nome_empresa}:

🏢 **Sobre nós**: {descricao_empresa}
⏰ **Horário de atendimento**: {horario_atendimento}
📧 **Email**: {email_empresa}
🌐 **Website**: {website}

Tem alguma dúvida específica? Estou aqui para ajudar!`,

      'resposta_atendente_humano': `👨‍💼 **Atendimento Humano**

Entendo que você prefere falar com um atendente humano.

🔄 **Transferindo você agora...**

Um de nossos especialistas entrará em contato em breve.

⏰ **Tempo estimado**: 5-10 minutos
📱 **Telefone**: {telefone_empresa}

Obrigado pela preferência!`
    };

    return respostas[resposta] || null;
  }

  // Limpar todas as sessões
  limparTodasSessoes() {
    this.sessoes.clear();
    logger.info('Todas as sessões foram limpas');
  }

  // Obter estatísticas
  getEstatisticas() {
    return {
      sessoesAtivas: this.sessoes.size,
      sistemaAtivo: this.config.ativo,
      usarIAFallback: this.config.usarIAComoFallback,
      timeoutMenu: this.config.configuracao.timeoutMenu / 60000 + ' minutos'
    };
  }
}

module.exports = OpcoesController; 