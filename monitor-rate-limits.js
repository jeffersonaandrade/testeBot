require("dotenv").config();
const RateLimitController = require("./rate-limit-controller");
const { logger } = require("./utils");

class MonitorRateLimits {
  constructor() {
    this.rateLimitController = new RateLimitController();
    this.intervalo = 30000; // 30 segundos
    this.ativo = false;
  }

  iniciar() {
    if (this.ativo) {
      logger.warn('Monitor já está ativo');
      return;
    }

    this.ativo = true;
    logger.info('Monitor de Rate Limits iniciado', { intervalo: `${this.intervalo/1000}s` });

    this.monitorar();
  }

  parar() {
    this.ativo = false;
    logger.info('Monitor de Rate Limits parado');
  }

  monitorar() {
    if (!this.ativo) return;

    const estatisticas = this.rateLimitController.getEstatisticas();
    
    // Calcular percentuais
    const percentualRPM = (estatisticas.requests.minuto.usado / estatisticas.requests.minuto.limiteSeguro) * 100;
    const percentualRPD = (estatisticas.requests.dia.usado / estatisticas.requests.dia.limiteSeguro) * 100;
    const percentualTPM = (estatisticas.tokens.minuto.usado / estatisticas.tokens.minuto.limiteSeguro) * 100;
    const percentualTPD = (estatisticas.tokens.dia.usado / estatisticas.tokens.dia.limiteSeguro) * 100;

    // Log de status
    logger.info('Status Rate Limits', {
      sistemaAtivo: estatisticas.sistemaAtivo,
      motivoDesativacao: estatisticas.motivoDesativacao,
      requests: {
        minuto: `${estatisticas.requests.minuto.usado}/${estatisticas.requests.minuto.limiteSeguro} (${percentualRPM.toFixed(1)}%)`,
        dia: `${estatisticas.requests.dia.usado}/${estatisticas.requests.dia.limiteSeguro} (${percentualRPD.toFixed(1)}%)`
      },
      tokens: {
        minuto: `${estatisticas.tokens.minuto.usado}/${estatisticas.tokens.minuto.limiteSeguro} (${percentualTPM.toFixed(1)}%)`,
        dia: `${estatisticas.tokens.dia.usado}/${estatisticas.tokens.dia.limiteSeguro} (${percentualTPD.toFixed(1)}%)`
      }
    });

    // Alertas
    if (percentualRPM > 70 || percentualRPD > 70 || percentualTPM > 70 || percentualTPD > 70) {
      logger.warn('⚠️ ALERTA: Rate limits próximos do limite seguro', {
        RPM: percentualRPM > 70 ? `${percentualRPM.toFixed(1)}%` : 'OK',
        RPD: percentualRPD > 70 ? `${percentualRPD.toFixed(1)}%` : 'OK',
        TPM: percentualTPM > 70 ? `${percentualTPM.toFixed(1)}%` : 'OK',
        TPD: percentualTPD > 70 ? `${percentualTPD.toFixed(1)}%` : 'OK'
      });
    }

    if (percentualRPM > 90 || percentualRPD > 90 || percentualTPM > 90 || percentualTPD > 90) {
      logger.error('🚨 CRÍTICO: Rate limits muito próximos do limite!', {
        RPM: percentualRPM > 90 ? `${percentualRPM.toFixed(1)}%` : 'OK',
        RPD: percentualRPD > 90 ? `${percentualRPD.toFixed(1)}%` : 'OK',
        TPM: percentualTPM > 90 ? `${percentualTPM.toFixed(1)}%` : 'OK',
        TPD: percentualTPD > 90 ? `${percentualTPD.toFixed(1)}%` : 'OK'
      });
    }

    // Agendar próxima verificação
    setTimeout(() => this.monitorar(), this.intervalo);
  }

  // Comandos de controle
  reativarSistema() {
    this.rateLimitController.reativarSistema();
    logger.info('✅ Sistema reativado manualmente');
  }

  mostrarEstatisticas() {
    const estatisticas = this.rateLimitController.getEstatisticas();
    
    console.log('\n📊 ESTATÍSTICAS DE RATE LIMITS');
    console.log('================================');
    console.log(`Status: ${estatisticas.sistemaAtivo ? '🟢 ATIVO' : '🔴 INATIVO'}`);
    if (estatisticas.motivoDesativacao) {
      console.log(`Motivo: ${estatisticas.motivoDesativacao}`);
    }
    console.log('\n📈 REQUESTS:');
    console.log(`  Por minuto: ${estatisticas.requests.minuto.usado}/${estatisticas.requests.minuto.limiteSeguro} (${((estatisticas.requests.minuto.usado / estatisticas.requests.minuto.limiteSeguro) * 100).toFixed(1)}%)`);
    console.log(`  Por dia: ${estatisticas.requests.dia.usado}/${estatisticas.requests.dia.limiteSeguro} (${((estatisticas.requests.dia.usado / estatisticas.requests.dia.limiteSeguro) * 100).toFixed(1)}%)`);
    console.log('\n🔤 TOKENS:');
    console.log(`  Por minuto: ${estatisticas.tokens.minuto.usado}/${estatisticas.tokens.minuto.limiteSeguro} (${((estatisticas.tokens.minuto.usado / estatisticas.tokens.minuto.limiteSeguro) * 100).toFixed(1)}%)`);
    console.log(`  Por dia: ${estatisticas.tokens.dia.usado}/${estatisticas.tokens.dia.limiteSeguro} (${((estatisticas.tokens.dia.usado / estatisticas.tokens.dia.limiteSeguro) * 100).toFixed(1)}%)`);
    console.log('\n⏰ PRÓXIMOS RESETS:');
    console.log(`  Minuto: ${estatisticas.requests.minuto.resetTime.toLocaleTimeString()}`);
    console.log(`  Dia: ${estatisticas.requests.dia.resetTime.toLocaleDateString()} ${estatisticas.requests.dia.resetTime.toLocaleTimeString()}`);
    console.log('================================\n');
  }
}

// Interface de linha de comando
if (require.main === module) {
  const monitor = new MonitorRateLimits();
  
  console.log('🔍 Monitor de Rate Limits - WhatsApp Bot');
  console.log('Comandos disponíveis:');
  console.log('  start    - Iniciar monitoramento');
  console.log('  stop     - Parar monitoramento');
  console.log('  stats    - Mostrar estatísticas');
  console.log('  reactivate - Reativar sistema');
  console.log('  exit     - Sair\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const processarComando = (comando) => {
    switch (comando.trim().toLowerCase()) {
      case 'start':
        monitor.iniciar();
        break;
      case 'stop':
        monitor.parar();
        break;
      case 'stats':
        monitor.mostrarEstatisticas();
        break;
      case 'reactivate':
        monitor.reativarSistema();
        break;
      case 'exit':
        console.log('👋 Saindo...');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('❌ Comando inválido. Use: start, stop, stats, reactivate ou exit');
    }
  };

  rl.on('line', processarComando);
  
  // Mostrar estatísticas iniciais
  monitor.mostrarEstatisticas();
}

module.exports = MonitorRateLimits; 