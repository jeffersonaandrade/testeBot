const fs = require("fs");
const path = require("path");
const config = require("./config");

// Sistema de logs centralizado
class Logger {
  constructor() {
    this.config = config.logs;
  }

  log(nivel, mensagem, dados = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      nivel,
      mensagem,
      dados
    };

    // Log no console
    if (this.config.mostrarConsole) {
      const emoji = this.getEmoji(nivel);
      console.log(`${emoji} [${nivel.toUpperCase()}] ${mensagem}`);
      if (dados) {
        console.log(`   Dados:`, dados);
      }
    }

    // Salvar no arquivo
    if (this.config.salvarArquivo) {
      this.salvarLog(logEntry);
    }
  }

  getEmoji(nivel) {
    const emojis = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    return emojis[nivel] || '📝';
  }

  salvarLog(logEntry) {
    try {
      const logPath = path.join(__dirname, config.bot.arquivoLogs);
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logPath, logLine);
    } catch (error) {
      console.error('Erro ao salvar log:', error.message);
    }
  }

  debug(mensagem, dados) { this.log('debug', mensagem, dados); }
  info(mensagem, dados) { this.log('info', mensagem, dados); }
  warn(mensagem, dados) { this.log('warn', mensagem, dados); }
  error(mensagem, dados) { this.log('error', mensagem, dados); }
}

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
    logger.debug('Item adicionado ao cache', { chave, tokens: item.tokens });
  }

  // Buscar no cache
  buscar(mensagem, intencao) {
    const chave = this.gerarChave(mensagem, intencao);
    const item = this.cache.get(chave);

    if (item && (Date.now() - item.timestamp) < this.cacheExpiry) {
      logger.info('Resposta encontrada no cache', { chave, tokens: item.tokens });
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
      if (fs.existsSync(this.cacheFile)) {
        const dados = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.cache = new Map(dados);
        logger.info('Cache carregado', { tamanho: this.cache.size });
      }
    } catch (error) {
      logger.error('Erro ao carregar cache', { error: error.message });
    }
  }

  // Salvar cache no arquivo
  salvarCache() {
    try {
      const dados = Array.from(this.cache.entries());
      fs.writeFileSync(this.cacheFile, JSON.stringify(dados, null, 2));
    } catch (error) {
      logger.error('Erro ao salvar cache', { error: error.message });
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
    // Implementar cálculo de taxa de uso do cache
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
      logger.info('Mensagem otimizada', { 
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

    logger.info('Grupo processado', { 
      telefone, 
      numMensagens: grupo.mensagens.length,
      mensagemCombinada: Formatter.truncarTexto(mensagemCombinada, 100)
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
}

// Utilitários para manipulação de arquivos
class FileUtils {
  static salvarCSV(dados, arquivo) {
    try {
      const csvPath = path.join(__dirname, arquivo);
      
      // Criar cabeçalho se arquivo não existir
      if (!fs.existsSync(csvPath)) {
        const cabecalho = Object.keys(dados[0]).join(',') + '\n';
        fs.writeFileSync(csvPath, cabecalho);
      }
      
      // Adicionar linha
      const linha = Object.values(dados).join(',') + '\n';
      fs.appendFileSync(csvPath, linha);
      
      return true;
    } catch (error) {
      logger.error('Erro ao salvar CSV', { arquivo, error: error.message });
      return false;
    }
  }

  static carregarJSON(arquivo) {
    try {
      if (fs.existsSync(arquivo)) {
        return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
      }
    } catch (error) {
      logger.error('Erro ao carregar JSON', { arquivo, error: error.message });
    }
    return null;
  }

  static salvarJSON(dados, arquivo) {
    try {
      fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
      return true;
    } catch (error) {
      logger.error('Erro ao salvar JSON', { arquivo, error: error.message });
      return false;
    }
  }
}

// Utilitários para validação
class Validator {
  static validarTelefone(telefone) {
    // Remove caracteres especiais e valida formato brasileiro
    const limpo = telefone.replace(/\D/g, '');
    return limpo.length >= 10 && limpo.length <= 11;
  }

  static validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  static validarMensagem(mensagem) {
    return mensagem && mensagem.trim().length > 0 && mensagem.length <= 1000;
  }

  static sanitizarTexto(texto) {
    return texto
      .trim()
      .replace(/[<>]/g, '') // Remove caracteres potencialmente perigosos
      .substring(0, 1000); // Limita tamanho
  }
}

// Utilitários para formatação
class Formatter {
  static formatarData(data) {
    return new Date(data).toLocaleString('pt-BR');
  }

  static formatarTelefone(telefone) {
    const limpo = telefone.replace(/\D/g, '');
    if (limpo.length === 11) {
      return `(${limpo.slice(0,2)}) ${limpo.slice(2,7)}-${limpo.slice(7)}`;
    }
    return telefone;
  }

  static formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  static truncarTexto(texto, maxLength = 100) {
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

// Utilitários para WhatsApp
class WhatsAppUtils {
  static extrairNomeContato(from) {
    return from.split('@')[0] || 'Contato';
  }

  static extrairTelefone(from) {
    return from.replace('@c.us', '');
  }

  static formatarMensagem(mensagem, dados = {}) {
    // Substituir placeholders por dados reais
    return mensagem
      .replace('{nome_empresa}', config.empresa.nome)
      .replace('{telefone_empresa}', config.empresa.telefone)
      .replace('{email_empresa}', config.empresa.email)
      .replace('{horario_atendimento}', config.empresa.horarioAtendimento)
      .replace('{website}', config.empresa.website);
  }

  static async enviarMensagemComDelay(client, to, mensagem, delay = 2000) {
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      await client.sendMessage(to, mensagem);
      return true;
    } catch (error) {
      logger.error('Erro ao enviar mensagem com delay', { to, error: error.message });
      return false;
    }
  }
}

// Instância global do logger
const logger = new Logger();

// Instâncias globais dos otimizadores
const cacheManager = new CacheManager();
const messageOptimizer = new MessageOptimizer();
const messageGrouper = new MessageGrouper();

module.exports = {
  Logger,
  CacheManager,
  MessageOptimizer,
  MessageGrouper,
  FileUtils,
  Validator,
  Formatter,
  ApiUtils,
  WhatsAppUtils,
  logger,
  cacheManager,
  messageOptimizer,
  messageGrouper
}; 