require("dotenv").config();

// Importações
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// Importar configuração e container de serviços
const config = require("../config");
const ServiceContainer = require("./core/ServiceContainer");
const ErrorHandler = require("./core/ErrorHandler");

class WhatsAppBot {
  constructor() {
    this.serviceContainer = new ServiceContainer();
    this.client = null;
    this.errorHandler = null;
    this.isRunning = false;
  }

  // Inicializar bot
  async initialize() {
    try {
      console.log('🚀 Iniciando WhatsApp Bot...');

      // Inicializar container de serviços
      this.serviceContainer.initialize(config);
      this.serviceContainer.validate();

      // Obter serviços
      const services = this.serviceContainer.getBotServices();
      this.logger = services.logger;
      this.messageProcessor = services.messageProcessor;
      this.errorHandler = new ErrorHandler(this.logger);

      // Configurar cliente WhatsApp
      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: config.whatsapp
      });

      // Configurar eventos do WhatsApp
      this.setupWhatsAppEvents();

      // Configurar tratamento de erros globais
      this.setupGlobalErrorHandling();

      // Inicializar cliente
      await this.client.initialize();

      this.isRunning = true;
      this.logger.info('Bot inicializado com sucesso', {
        empresa: config.empresa.nome,
        rateLimits: config.api.groq.rateLimits
      });

    } catch (error) {
      console.error('❌ Erro ao inicializar bot:', error.message);
      throw error;
    }
  }

  // Configurar eventos do WhatsApp
  setupWhatsAppEvents() {
    // Evento QR Code
    this.client.on("qr", (qr) => {
      this.logger.info("QR Code gerado - Escaneie com o WhatsApp");
      qrcode.generate(qr, config.whatsapp.qrCode);
    });

    // Evento Ready
    this.client.on("ready", () => {
      this.logger.info("Bot conectado com sucesso", {
        empresa: config.empresa.nome,
        rateLimits: config.api.groq.rateLimits
      });
    });

    // Evento Message
    this.client.on("message", async (message) => {
      await this.handleMessage(message);
    });

    // Evento de desconexão
    this.client.on("disconnected", (reason) => {
      this.logger.warn("Bot desconectado", { reason });
      this.isRunning = false;
    });

    // Evento de autenticação
    this.client.on("auth_failure", (message) => {
      this.logger.error("Falha na autenticação", { message });
    });
  }

  // Configurar tratamento de erros globais
  setupGlobalErrorHandling() {
    // Tratamento de rejeições não capturadas
    process.on('unhandledRejection', (error) => {
      this.errorHandler.handleError(error, { context: 'unhandledRejection' });
    });

    // Tratamento de exceções não capturadas
    process.on('uncaughtException', (error) => {
      this.errorHandler.handleError(error, { context: 'uncaughtException' });
      // Para erros críticos, encerrar o processo
      setTimeout(() => {
        this.logger.error('Encerrando processo devido a erro crítico');
        process.exit(1);
      }, 1000);
    });

    // Tratamento de sinal de interrupção
    process.on('SIGINT', () => {
      this.logger.info('Sinal SIGINT recebido - Encerrando bot...');
      this.shutdown();
    });

    // Tratamento de sinal de término
    process.on('SIGTERM', () => {
      this.logger.info('Sinal SIGTERM recebido - Encerrando bot...');
      this.shutdown();
    });
  }

  // Processar mensagem recebida
  async handleMessage(message) {
    try {
      // Definir cliente no messageProcessor
      this.messageProcessor.client = this.client;
      
      // Processar mensagem
      await this.messageProcessor.processMessage(message);

    } catch (error) {
      // Usar error handler para tratar erro
      const errorResponse = this.errorHandler.handleError(error, {
        context: 'message_processing',
        messageId: message.id,
        from: message.from
      });

      // Se erro for crítico, tentar notificar usuário
      if (errorResponse.retry) {
        try {
          await message.reply(errorResponse.message);
        } catch (finalError) {
          this.logger.error('Erro crítico ao notificar usuário', { 
            error: finalError.message 
          });
        }
      }
    }
  }

  // Obter estatísticas do bot
  getStatistics() {
    const services = this.serviceContainer.getBotServices();
    
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: this.serviceContainer.getStatistics(),
      api: services.apiController.getEstatisticas(),
      users: services.userController.getEstatisticas(),
      cache: services.cacheManager.getEstatisticas(),
      errors: this.errorHandler.getStatistics()
    };
  }

  // Reiniciar bot
  async restart() {
    this.logger.info('Reiniciando bot...');
    
    try {
      await this.shutdown();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
      await this.initialize();
      
      this.logger.info('Bot reiniciado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao reiniciar bot', { error: error.message });
      throw error;
    }
  }

  // Encerrar bot
  async shutdown() {
    this.logger.info('Encerrando bot...');
    this.isRunning = false;

    try {
      // Limpar recursos dos serviços
      this.serviceContainer.cleanup();

      // Desconectar cliente WhatsApp
      if (this.client) {
        await this.client.destroy();
      }

      // Limpar contadores de erro
      if (this.errorHandler) {
        this.errorHandler.cleanup();
      }

      this.logger.info('Bot encerrado com sucesso');
    } catch (error) {
      console.error('Erro ao encerrar bot:', error.message);
    }
  }

  // Verificar saúde do bot
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Verificar se está rodando
      health.checks.running = this.isRunning;

      // Verificar cliente WhatsApp
      health.checks.whatsapp = this.client && this.client.isConnected;

      // Verificar serviços
      const services = this.serviceContainer.getBotServices();
      health.checks.services = {
        api: services.apiController !== null,
        user: services.userController !== null,
        options: services.opcoesController !== null,
        rateLimit: services.rateLimitController !== null
      };

      // Verificar se há muitos erros
      const errorStats = this.errorHandler.getStatistics();
      health.checks.errors = errorStats.totalErrors < 50; // Menos de 50 erros

      // Determinar status geral
      const allChecks = [
        health.checks.running,
        health.checks.whatsapp,
        ...Object.values(health.checks.services),
        health.checks.errors
      ];

      if (allChecks.every(check => check === true)) {
        health.status = 'healthy';
      } else if (allChecks.some(check => check === true)) {
        health.status = 'degraded';
      } else {
        health.status = 'unhealthy';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

// Função principal
async function main() {
  const bot = new WhatsAppBot();

  try {
    await bot.initialize();
    
    // Expor bot globalmente para monitoramento
    global.whatsappBot = bot;
    
    console.log('✅ Bot iniciado com sucesso!');
    console.log('📊 Para ver estatísticas: global.whatsappBot.getStatistics()');
    console.log('🏥 Para verificar saúde: global.whatsappBot.healthCheck()');
    console.log('🔄 Para reiniciar: global.whatsappBot.restart()');

  } catch (error) {
    console.error('❌ Falha ao iniciar bot:', error.message);
    process.exit(1);
  }
}

// Executar se for o arquivo principal
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = WhatsAppBot; 