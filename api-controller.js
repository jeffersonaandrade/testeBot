const { FileUtils, ApiUtils, logger, cacheManager, messageOptimizer, messageGrouper } = require('./utils');
const config = require('./config');

class ApiController {
  constructor() {
    this.config = config.api.groq;
    this.arquivoControle = this.config.arquivoControle;
    this.dadosControle = this.carregarDadosControle();
  }

  // Carregar dados de controle
  carregarDadosControle() {
    const dados = FileUtils.carregarJSON(this.arquivoControle);
    if (dados) return dados;

    // Dados padrão se arquivo não existir
    return {
      chamadasHoje: 0,
      chamadasMinuto: 0,
      tokensMinuto: 0,
      tokensDia: 0,
      ultimaData: new Date().toISOString().split('T')[0],
      ultimoMinuto: Math.floor(Date.now() / 60000),
      ultimoMes: new Date().getFullYear() + '-' + (new Date().getMonth() + 1)
    };
  }

  // Salvar dados de controle
  salvarDadosControle() {
    return FileUtils.salvarJSON(this.dadosControle, this.arquivoControle);
  }

  // Verificar se pode usar API
  podeUsarAPI(mensagem = "") {
    const hoje = new Date().toISOString().split('T')[0];
    const minutoAtual = Math.floor(Date.now() / 60000);
    const tokensEstimados = ApiUtils.calcularTokens(mensagem);

    // Reset diário
    if (this.dadosControle.ultimaData !== hoje) {
      this.dadosControle.chamadasHoje = 0;
      this.dadosControle.tokensDia = 0;
      this.dadosControle.ultimaData = hoje;
    }

    // Reset por minuto
    if (this.dadosControle.ultimoMinuto !== minutoAtual) {
      this.dadosControle.chamadasMinuto = 0;
      this.dadosControle.tokensMinuto = 0;
      this.dadosControle.ultimoMinuto = minutoAtual;
    }

    // Verificar limites
    const podeUsarRPM = this.dadosControle.chamadasMinuto < this.config.rateLimits.RPM;
    const podeUsarRPD = this.dadosControle.chamadasHoje < this.config.rateLimits.RPD;
    const podeUsarTPM = (this.dadosControle.tokensMinuto + tokensEstimados) <= this.config.rateLimits.TPM;
    const podeUsarTPD = (this.dadosControle.tokensDia + tokensEstimados) <= this.config.rateLimits.TPD;

    const podeUsar = podeUsarRPM && podeUsarRPD && podeUsarTPM && podeUsarTPD;

    if (podeUsar) {
      this.dadosControle.chamadasHoje++;
      this.dadosControle.chamadasMinuto++;
      this.dadosControle.tokensMinuto += tokensEstimados;
      this.dadosControle.tokensDia += tokensEstimados;
      this.salvarDadosControle();
    }

    // Log detalhado
    this.logarStatus();

    return podeUsar;
  }

  // Logar status da API
  logarStatus() {
    const rpm = this.dadosControle.chamadasMinuto;
    const rpd = this.dadosControle.chamadasHoje;
    const tpm = this.dadosControle.tokensMinuto;
    const tpd = this.dadosControle.tokensDia;

    const percentualRPM = ((rpm / this.config.rateLimits.RPM) * 100).toFixed(1);
    const percentualRPD = ((rpd / this.config.rateLimits.RPD) * 100).toFixed(1);
    const percentualTPM = ((tpm / this.config.rateLimits.TPM) * 100).toFixed(1);
    const percentualTPD = ((tpd / this.config.rateLimits.TPD) * 100).toFixed(1);

    logger.info('Status API', {
      RPM: `${rpm}/${this.config.rateLimits.RPM} (${percentualRPM}%)`,
      RPD: `${rpd}/${this.config.rateLimits.RPD} (${percentualRPD}%)`,
      TPM: `${tpm}/${this.config.rateLimits.TPM} (${percentualTPM}%)`,
      TPD: `${tpd}/${this.config.rateLimits.TPD} (${percentualTPD}%)`
    });

    // Avisos de limite próximo
    if (rpm >= this.config.rateLimits.RPM * 0.8) {
      logger.warn('Limite RPM próximo');
    }
    if (rpd >= this.config.rateLimits.RPD * 0.8) {
      logger.warn('Limite RPD próximo');
    }
    if (tpm >= this.config.rateLimits.TPM * 0.8) {
      logger.warn('Limite TPM próximo');
    }
    if (tpd >= this.config.rateLimits.TPD * 0.8) {
      logger.warn('Limite TPD próximo');
    }
  }

  // Aguardar se necessário (backoff)
  async aguardarSeNecessario() {
    const minutoAtual = Math.floor(Date.now() / 60000);

    if (this.dadosControle.ultimoMinuto === minutoAtual && 
        this.dadosControle.chamadasMinuto >= this.config.rateLimits.RPM * 0.9) {
      const tempoRestante = 60000 - (Date.now() % 60000);
      logger.info(`Aguardando ${Math.ceil(tempoRestante/1000)}s para reset do RPM`);
      await new Promise(resolve => setTimeout(resolve, tempoRestante));
    }
  }

  // Fazer requisição para classificação
  async classificarIntencao(mensagem) {
    // 1. Verificar cache primeiro
    const respostaCache = cacheManager.buscar(mensagem, 'classificacao');
    if (respostaCache) {
      logger.info('Classificação encontrada no cache');
      return respostaCache;
    }

    // 2. Otimizar mensagem para reduzir tokens
    const mensagemOtimizada = messageOptimizer.otimizarMensagem(mensagem, 'classificacao');
    
    // 3. Verificar se pode usar API
    if (!this.podeUsarAPI(mensagemOtimizada)) {
      logger.info('Usando classificação local (limite API atingido)');
      return this.classificarIntencaoLocal(mensagem);
    }

    await this.aguardarSeNecessario();

    const payload = ApiUtils.criarPayload(
      this.config.model,
      [
        { role: "system", content: config.ia.classificacao.systemPrompt },
        { role: "user", content: mensagemOtimizada }
      ],
      config.ia.classificacao
    );

    const headers = ApiUtils.criarHeaders(process.env.GROQ_API_KEY);
    const resultado = await ApiUtils.fazerRequisicao(
      this.config.baseUrl,
      payload,
      headers,
      this.config.timeout
    );

    if (resultado.success) {
      const classificacao = resultado.data.choices[0]?.message?.content?.trim();
      
      // Salvar no cache
      cacheManager.adicionar(mensagem, 'classificacao', classificacao);
      
      logger.info('Classificação via API', { 
        mensagem: Formatter.truncarTexto(mensagem), 
        mensagemOtimizada: Formatter.truncarTexto(mensagemOtimizada),
        classificacao 
      });
      return classificacao;
    } else {
      logger.error('Erro na classificação via API', resultado);
      return this.classificarIntencaoLocal(mensagem);
    }
  }

  // Classificação local (fallback)
  classificarIntencaoLocal(mensagem) {
    const msg = mensagem.toLowerCase();

    // Verificar COMPRADOR primeiro (mais específico)
    for (const palavra of config.palavrasChave.comprador) {
      if (msg.includes(palavra)) {
        logger.info('Classificação local: COMPRADOR', { palavra });
        return "COMPRADOR";
      }
    }

    // Verificar INTERESSADO
    for (const palavra of config.palavrasChave.interessado) {
      if (msg.includes(palavra)) {
        logger.info('Classificação local: INTERESSADO', { palavra });
        return "INTERESSADO";
      }
    }

    // Se não encontrou palavras específicas, é CURIOSO
    logger.info('Classificação local: CURIOSO');
    return "CURIOSO";
  }

  // Fazer requisição para gerar resposta
  async gerarResposta(mensagem, intencao) {
    // 1. Verificar cache primeiro
    const respostaCache = cacheManager.buscar(mensagem, intencao);
    if (respostaCache) {
      logger.info('Resposta encontrada no cache');
      return respostaCache;
    }

    // 2. Otimizar mensagem para reduzir tokens
    const mensagemOtimizada = messageOptimizer.otimizarMensagem(mensagem, 'resposta');
    
    // 3. Verificar se pode usar API
    if (!this.podeUsarAPI(mensagemOtimizada)) {
      logger.info('Usando resposta pré-definida (limite API atingido)');
      return this.obterRespostaPredefinida(intencao);
    }

    await this.aguardarSeNecessario();

    const payload = ApiUtils.criarPayload(
      this.config.model,
      [
        { role: "system", content: config.ia.resposta.systemPrompt },
        { role: "user", content: `Intenção: ${intencao}\nMensagem: ${mensagemOtimizada}` }
      ],
      config.ia.resposta
    );

    const headers = ApiUtils.criarHeaders(process.env.GROQ_API_KEY);
    const resultado = await ApiUtils.fazerRequisicao(
      this.config.baseUrl,
      payload,
      headers,
      this.config.timeout
    );

    if (resultado.success) {
      const resposta = resultado.data.choices[0]?.message?.content?.trim();
      
      // Salvar no cache
      cacheManager.adicionar(mensagem, intencao, resposta);
      
      logger.info('Resposta gerada via API', { 
        intencao, 
        mensagemOtimizada: Formatter.truncarTexto(mensagemOtimizada),
        resposta: Formatter.truncarTexto(resposta) 
      });
      return resposta;
    } else {
      logger.error('Erro na geração de resposta via API', resultado);
      return this.obterRespostaPredefinida(intencao);
    }
  }

  // Obter resposta pré-definida
  obterRespostaPredefinida(intencao) {
    const respostas = config.respostas[intencao.toLowerCase()];
    if (!respostas || respostas.length === 0) {
      logger.warn('Tipo de resposta não encontrado', { intencao });
      return config.respostas.limiteExcedido[0];
    }

    const indice = Math.floor(Math.random() * respostas.length);
    const resposta = respostas[indice];
    
    logger.info('Resposta pré-definida', { intencao, indice });
    return resposta;
  }

  // Obter estatísticas de uso
  getEstatisticas() {
    return {
      chamadasHoje: this.dadosControle.chamadasHoje,
      chamadasMinuto: this.dadosControle.chamadasMinuto,
      tokensMinuto: this.dadosControle.tokensMinuto,
      tokensDia: this.dadosControle.tokensDia,
      percentualRPM: ((this.dadosControle.chamadasMinuto / this.config.rateLimits.RPM) * 100).toFixed(1),
      percentualRPD: ((this.dadosControle.chamadasHoje / this.config.rateLimits.RPD) * 100).toFixed(1),
      percentualTPM: ((this.dadosControle.tokensMinuto / this.config.rateLimits.TPM) * 100).toFixed(1),
      percentualTPD: ((this.dadosControle.tokensDia / this.config.rateLimits.TPD) * 100).toFixed(1)
    };
  }

  // Resetar contadores
  resetarContadores() {
    this.dadosControle = {
      chamadasHoje: 0,
      chamadasMinuto: 0,
      tokensMinuto: 0,
      tokensDia: 0,
      ultimaData: new Date().toISOString().split('T')[0],
      ultimoMinuto: Math.floor(Date.now() / 60000),
      ultimoMes: new Date().getFullYear() + '-' + (new Date().getMonth() + 1)
    };
    this.salvarDadosControle();
    logger.info('Contadores resetados');
  }
}

module.exports = ApiController; 