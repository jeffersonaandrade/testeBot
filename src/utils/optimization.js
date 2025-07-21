const { FileUtils } = require('./file');

// Sistema de cache para otimizar tokens
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheFile = 'cache-respostas.json';
    this.maxCacheSize = 1000; // Máximo de itens no cache
    this.cacheExpiry = 3600000; // 1 hora em ms
    this.carregarCache();
  }

  // Gerar chave única para cache
  gerarChave(mensagem, intencao) {
    const mensagemLimpa = mensagem.toLowerCase().trim().substring(0, 100);
    return `${intencao}:${mensagemLimpa}`;
  }

  // Adicionar ao cache
  adicionar(mensagem, intencao, resposta) {
    const chave = this.gerarChave(mensagem, intencao);
    const item = {
      resposta,
      timestamp: Date.now(),
      tokens: ApiUtils.calcularTokens(mensagem + resposta)
    };

    this.cache.set(chave, item);
    
    // Limpar cache se muito grande
    if (this.cache.size > this.maxCacheSize) {
      this.limparCacheAntigo();
    }

    this.salvarCache();
    console.log('Item adicionado ao cache', { chave, tokens: item.tokens });
  }

  // Buscar no cache
  buscar(mensagem, intencao) {
    const chave = this.gerarChave(mensagem, intencao);
    const item = this.cache.get(chave);

    if (item && (Date.now() - item.timestamp) < this.cacheExpiry) {
      console.log('Resposta encontrada no cache', { chave, tokens: item.tokens });
      return item.resposta;
    }

    return null;
  }

  // Limpar cache antigo
  limparCacheAntigo() {
    const agora = Date.now();
    for (const [chave, item] of this.cache.entries()) {
      if (agora - item.timestamp > this.cacheExpiry) {
        this.cache.delete(chave);
      }
    }
  }

  // Carregar cache do arquivo
  carregarCache() {
    try {
      const dados = FileUtils.carregarJSON(this.cacheFile);
      if (dados) {
        this.cache = new Map(dados);
        console.log('Cache carregado', { tamanho: this.cache.size });
      }
    } catch (error) {
      console.error('Erro ao carregar cache', { error: error.message });
    }
  }

  // Salvar cache no arquivo
  salvarCache() {
    try {
      const dados = Array.from(this.cache.entries());
      FileUtils.salvarJSON(dados, this.cacheFile);
    } catch (error) {
      console.error('Erro ao salvar cache', { error: error.message });
    }
  }

  // Estatísticas do cache
  getEstatisticas() {
    return {
      tamanho: this.cache.size,
      tamanhoMaximo: this.maxCacheSize,
      taxaUso: this.calcularTaxaUso()
    };
  }

  calcularTaxaUso() {
    return (this.cache.size / this.maxCacheSize * 100).toFixed(1);
  }
}

// Otimizador de mensagens para reduzir tokens
class MessageOptimizer {
  constructor() {
    this.maxMensagemLength = 500; // Máximo de caracteres por mensagem
    this.maxTokensEstimados = 150; // Máximo de tokens estimados
  }

  // Otimizar mensagem para reduzir tokens
  otimizarMensagem(mensagem, tipo = 'classificacao') {
    let mensagemOtimizada = mensagem;

    // Remover caracteres desnecessários
    mensagemOtimizada = this.removerCaracteresDesnecessarios(mensagemOtimizada);

    // Truncar se muito longa
    if (mensagemOtimizada.length > this.maxMensagemLength) {
      mensagemOtimizada = this.truncarInteligente(mensagemOtimizada);
    }

    // Para classificação, ser mais agressivo
    if (tipo === 'classificacao') {
      mensagemOtimizada = this.otimizarParaClassificacao(mensagemOtimizada);
    }

    const tokensAntes = ApiUtils.calcularTokens(mensagem);
    const tokensDepois = ApiUtils.calcularTokens(mensagemOtimizada);
    const economia = tokensAntes - tokensDepois;

    if (economia > 0) {
      console.log('Mensagem otimizada', { 
        tokensAntes, 
        tokensDepois, 
        economia,
        percentual: ((economia / tokensAntes) * 100).toFixed(1) + '%'
      });
    }

    return mensagemOtimizada;
  }

  // Remover caracteres desnecessários
  removerCaracteresDesnecessarios(texto) {
    return texto
      .replace(/\s+/g, ' ') // Múltiplos espaços
      .replace(/[^\w\s.,!?@#$%&*()\-+=]/g, '') // Remover caracteres especiais desnecessários
      .trim();
  }

  // Truncar de forma inteligente
  truncarInteligente(texto) {
    // Tentar truncar em ponto final
    const frases = texto.split(/[.!?]/);
    if (frases.length > 1) {
      const primeiraFrase = frases[0].trim();
      if (primeiraFrase.length <= this.maxMensagemLength) {
        return primeiraFrase + '.';
      }
    }

    // Se não conseguir, truncar simples
    return texto.substring(0, this.maxMensagemLength) + '...';
  }

  // Otimizar especificamente para classificação
  otimizarParaClassificacao(mensagem) {
    // Remover palavras comuns que não afetam classificação
    const palavrasComuns = [
      'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite',
      'por favor', 'obrigado', 'obrigada', 'valeu',
      'tudo bem', 'tudo bom', 'beleza'
    ];

    let mensagemLimpa = mensagem.toLowerCase();
    for (const palavra of palavrasComuns) {
      mensagemLimpa = mensagemLimpa.replace(new RegExp(`\\b${palavra}\\b`, 'g'), '');
    }

    // Remover espaços extras
    mensagemLimpa = mensagemLimpa.replace(/\s+/g, ' ').trim();

    return mensagemLimpa || mensagem; // Se ficou vazio, retorna original
  }

  // Detectar se mensagem é muito longa
  isMensagemMuitoLonga(mensagem) {
    const tokens = ApiUtils.calcularTokens(mensagem);
    return tokens > this.maxTokensEstimados;
  }

  // Sugerir otimização
  sugerirOtimizacao(mensagem) {
    const tokens = ApiUtils.calcularTokens(mensagem);
    const sugestoes = [];

    if (tokens > this.maxTokensEstimados) {
      sugestoes.push(`Mensagem muito longa (${tokens} tokens). Considere resumir.`);
    }

    if (mensagem.length > this.maxMensagemLength) {
      sugestoes.push(`Mensagem muito extensa (${mensagem.length} chars). Máximo recomendado: ${this.maxMensagemLength}.`);
    }

    return sugestoes;
  }
}

// Agrupador de mensagens para reduzir chamadas à API
class MessageGrouper {
  constructor() {
    this.grupos = new Map();
    this.tempoAgrupamento = 30000; // 30 segundos
    this.maxMensagensPorGrupo = 5;
  }

  // Adicionar mensagem ao grupo
  adicionarMensagem(telefone, mensagem) {
    const agora = Date.now();
    const grupo = this.grupos.get(telefone) || {
      mensagens: [],
      ultimaAtualizacao: agora
    };

    grupo.mensagens.push({
      texto: mensagem,
      timestamp: agora
    });

    // Limpar mensagens antigas
    grupo.mensagens = grupo.mensagens.filter(msg => 
      agora - msg.timestamp < this.tempoAgrupamento
    );

    this.grupos.set(telefone, grupo);

    // Verificar se deve processar o grupo
    if (this.deveProcessarGrupo(telefone)) {
      return this.processarGrupo(telefone);
    }

    return null; // Ainda aguardando mais mensagens
  }

  // Verificar se deve processar o grupo
  deveProcessarGrupo(telefone) {
    const grupo = this.grupos.get(telefone);
    if (!grupo) return false;

    const agora = Date.now();
    const tempoDecorrido = agora - grupo.ultimaAtualizacao;
    const numMensagens = grupo.mensagens.length;

    return numMensagens >= this.maxMensagensPorGrupo || 
           tempoDecorrido >= this.tempoAgrupamento;
  }

  // Processar grupo de mensagens
  processarGrupo(telefone) {
    const grupo = this.grupos.get(telefone);
    if (!grupo) return null;

    // Combinar mensagens
    const mensagemCombinada = grupo.mensagens
      .map(msg => msg.texto)
      .join(' | ');

    // Limpar grupo
    this.grupos.delete(telefone);

    console.log('Grupo processado', { 
      telefone, 
      numMensagens: grupo.mensagens.length,
      mensagemCombinada: this.truncarTexto(mensagemCombinada, 100)
    });

    return mensagemCombinada;
  }

  // Limpar grupos antigos
  limparGruposAntigos() {
    const agora = Date.now();
    for (const [telefone, grupo] of this.grupos.entries()) {
      if (agora - grupo.ultimaAtualizacao > this.tempoAgrupamento * 2) {
        this.grupos.delete(telefone);
      }
    }
  }

  truncarTexto(texto, maxLength = 100) {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  }
}

// Utilitários para API
class ApiUtils {
  static calcularTokens(texto) {
    // Aproximação conservadora: 1 token ≈ 4 caracteres
    return Math.ceil(texto.length / 4);
  }

  static criarHeaders(apiKey) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  static criarPayload(modelo, mensagens, config) {
    return {
      model: modelo,
      messages: mensagens,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };
  }

  static async fazerRequisicao(url, payload, headers, timeout) {
    try {
      const response = await require('axios').post(url, payload, {
        headers,
        timeout
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }
}

// Instâncias globais dos otimizadores
const cacheManager = new CacheManager();
const messageOptimizer = new MessageOptimizer();
const messageGrouper = new MessageGrouper();

module.exports = {
  CacheManager,
  MessageOptimizer,
  MessageGrouper,
  ApiUtils,
  cacheManager,
  messageOptimizer,
  messageGrouper
}; 