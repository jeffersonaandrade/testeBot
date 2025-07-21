const fs = require("fs");
const path = require("path");

class Logger {
  constructor(config) {
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
      const logPath = path.join(__dirname, '..', '..', this.config.arquivoLogs || 'bot-logs.txt');
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

module.exports = Logger; 