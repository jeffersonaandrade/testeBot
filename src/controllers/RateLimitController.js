const config = require('../../config');
const fs = require('fs');
const path = require('path');

class RateLimitController {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.arquivoControle = this.config.api.groq.arquivoControle;
    this.rateLimits = this.config.api.groq.rateLimits;
    this.controle = this.carregarControle();
    
    // Margem de segurança (80% dos limites)
    this.margemSeguranca = 0.8;
    
    // Status do sistema
    this.sistemaAtivo = true;
    this.motivoDesativacao = null;
    
    this.logger.info('Rate Limit Controller inicializado', {
      margemSeguranca: `${this.margemSeguranca * 100}%`,
      limites: this.rateLimits
    });
  }

  // Carregar dados de controle
  carregarControle() {
    try {
      if (fs.existsSync(this.arquivoControle)) {
        const dados = JSON.parse(fs.readFileSync(this.arquivoControle, 'utf8'));
        this.logger.info('Controle de rate limits carregado', dados);
        return dados;
      }
    } catch (error) {
      this.logger.error('Erro ao carregar controle de rate limits', { error: error.message });
    }

    // Inicializar controle
    const controle = {
      requests: {
        minuto: { contador: 0, resetTime: this.getNextMinute() },
        dia: { contador: 0, resetTime: this.getNextDay() }
      },
      tokens: {
        minuto: { contador: 0, resetTime: this.getNextMinute() },
        dia: { contador: 0, resetTime: this.getNextDay() }
      },
      ultimaVerificacao: Date.now()
    };

    this.salvarControle(controle);
    return controle;
  }

  // Salvar dados de controle
  salvarControle(controle) {
    try {
      fs.writeFileSync(this.arquivoControle, JSON.stringify(controle, null, 2));
    } catch (error) {
      this.logger.error('Erro ao salvar controle de rate limits', { error: error.message });
    }
  }

  // Obter próximo minuto
  getNextMinute() {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + 1, 0, 0);
    return agora.getTime();
  }

  // Obter próximo dia
  getNextDay() {
    const agora = new Date();
    agora.setDate(agora.getDate() + 1);
    agora.setHours(0, 0, 0, 0);
    return agora.getTime();
  }

  // Verificar e resetar contadores se necessário
  verificarReset() {
    const agora = Date.now();
    
    // Reset por minuto
    if (agora >= this.controle.requests.minuto.resetTime) {
      this.controle.requests.minuto = { contador: 0, resetTime: this.getNextMinute() };
      this.controle.tokens.minuto = { contador: 0, resetTime: this.getNextMinute() };
      this.logger.info('Contadores por minuto resetados');
    }
    
    // Reset por dia
    if (agora >= this.controle.requests.dia.resetTime) {
      this.controle.requests.dia = { contador: 0, resetTime: this.getNextDay() };
      this.controle.tokens.dia = { contador: 0, resetTime: this.getNextDay() };
      this.logger.info('Contadores por dia resetados');
    }
    
    this.controle.ultimaVerificacao = agora;
  }

  // Verificar se pode fazer requisição
  podeFazerRequisicao(tokensEstimados = 100) {
    this.verificarReset();
    
    // Verificar limites com margem de segurança
    const limitesRPM = Math.floor(this.rateLimits.RPM * this.margemSeguranca);
    const limitesRPD = Math.floor(this.rateLimits.RPD * this.margemSeguranca);
    const limitesTPM = Math.floor(this.rateLimits.TPM * this.margemSeguranca);
    const limitesTPD = Math.floor(this.rateLimits.TPD * this.margemSeguranca);
    
    // Verificar se está próximo dos limites
    const proximoLimiteRPM = this.controle.requests.minuto.contador >= limitesRPM;
    const proximoLimiteRPD = this.controle.requests.dia.contador >= limitesRPD;
    const proximoLimiteTPM = (this.controle.tokens.minuto.contador + tokensEstimados) >= limitesTPM;
    const proximoLimiteTPD = (this.controle.tokens.dia.contador + tokensEstimados) >= limitesTPD;
    
    // Se qualquer limite está próximo, desativar sistema
    if (proximoLimiteRPM || proximoLimiteRPD || proximoLimiteTPM || proximoLimiteTPD) {
      this.desativarSistema('rate_limit_proximo');
      
      this.logger.warn('Rate limit próximo - Sistema desativado', {
        RPM: `${this.controle.requests.minuto.contador}/${limitesRPM}`,
        RPD: `${this.controle.requests.dia.contador}/${limitesRPD}`,
        TPM: `${this.controle.tokens.minuto.contador}/${limitesTPM}`,
        TPD: `${this.controle.tokens.dia.contador}/${limitesTPD}`
      });
      
      return false;
    }
    
    return true;
  }

  // Registrar uso
  registrarUso(tokens = 100) {
    this.verificarReset();
    
    // Incrementar contadores
    this.controle.requests.minuto.contador++;
    this.controle.requests.dia.contador++;
    this.controle.tokens.minuto.contador += tokens;
    this.controle.tokens.dia.contador += tokens;
    
    this.salvarControle(this.controle);
    
    this.logger.info('Uso registrado', {
      requests: {
        minuto: this.controle.requests.minuto.contador,
        dia: this.controle.requests.dia.contador
      },
      tokens: {
        minuto: this.controle.tokens.minuto.contador,
        dia: this.controle.tokens.dia.contador
      }
    });
  }

  // Desativar sistema
  desativarSistema(motivo) {
    this.sistemaAtivo = false;
    this.motivoDesativacao = motivo;
    
    this.logger.warn('Sistema desativado por proteção de rate limits', { motivo });
  }

  // Reativar sistema (manual)
  reativarSistema() {
    this.sistemaAtivo = true;
    this.motivoDesativacao = null;
    
    this.logger.info('Sistema reativado manualmente');
  }

  // Verificar se sistema está ativo
  sistemaEstaAtivo() {
    return this.sistemaAtivo;
  }

  // Obter mensagem de sistema fora do ar
  getMensagemSistemaForaDoAr() {
    const mensagens = [
      "🔧 Estamos passando por uma manutenção técnica momentânea. Por favor, tente novamente em alguns minutos.",
      "⚠️ Nosso sistema está temporariamente indisponível. Em breve estaremos de volta!",
      "🛠️ Estamos fazendo alguns ajustes técnicos. Tente novamente em breve.",
      "📱 Sistema temporariamente fora do ar para manutenção. Volte em alguns minutos!"
    ];
    
    return mensagens[Math.floor(Math.random() * mensagens.length)];
  }

  // Obter estatísticas
  getEstatisticas() {
    this.verificarReset();
    
    return {
      sistemaAtivo: this.sistemaAtivo,
      motivoDesativacao: this.motivoDesativacao,
      requests: {
        minuto: {
          usado: this.controle.requests.minuto.contador,
          limite: this.rateLimits.RPM,
          limiteSeguro: Math.floor(this.rateLimits.RPM * this.margemSeguranca),
          resetTime: new Date(this.controle.requests.minuto.resetTime)
        },
        dia: {
          usado: this.controle.requests.dia.contador,
          limite: this.rateLimits.RPD,
          limiteSeguro: Math.floor(this.rateLimits.RPD * this.margemSeguranca),
          resetTime: new Date(this.controle.requests.dia.resetTime)
        }
      },
      tokens: {
        minuto: {
          usado: this.controle.tokens.minuto.contador,
          limite: this.rateLimits.TPM,
          limiteSeguro: Math.floor(this.rateLimits.TPM * this.margemSeguranca),
          resetTime: new Date(this.controle.tokens.minuto.resetTime)
        },
        dia: {
          usado: this.controle.tokens.dia.contador,
          limite: this.rateLimits.TPD,
          limiteSeguro: Math.floor(this.rateLimits.TPD * this.margemSeguranca),
          resetTime: new Date(this.controle.tokens.dia.resetTime)
        }
      }
    };
  }
}

module.exports = RateLimitController; 