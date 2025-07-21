const Logger = require('../utils/logger');
const { FileUtils } = require('../utils/file');
const { WhatsAppUtils } = require('../utils/whatsapp');
const { cacheManager, messageOptimizer, messageGrouper, ApiUtils } = require('../utils/optimization');

// Importar controladores
const ApiController = require('../controllers/ApiController');
const UserController = require('../controllers/UserController');
const OpcoesController = require('../controllers/OpcoesController');
const RateLimitController = require('../controllers/RateLimitController');

// Importar serviços
const MessageProcessor = require('../services/MessageProcessor');
const LeadService = require('../services/LeadService');

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  // Registrar configuração
  registerConfig(config) {
    this.services.set('config', config);
    return this;
  }

  // Registrar logger
  registerLogger() {
    const config = this.services.get('config');
    const logger = new Logger(config);
    this.services.set('logger', logger);
    return this;
  }

  // Registrar utilitários
  registerUtils() {
    this.services.set('fileUtils', FileUtils);
    this.services.set('whatsappUtils', WhatsAppUtils);
    this.services.set('apiUtils', ApiUtils);
    this.services.set('cacheManager', cacheManager);
    this.services.set('messageOptimizer', messageOptimizer);
    this.services.set('messageGrouper', messageGrouper);
    return this;
  }

  // Registrar controladores
  registerControllers() {
    const config = this.services.get('config');
    const logger = this.services.get('logger');

    // Registrar controladores como singletons, passando logger
    this.singletons.set('apiController', new ApiController(config, logger));
    this.singletons.set('userController', new UserController(config, logger));
    this.singletons.set('opcoesController', new OpcoesController(config, logger));
    this.singletons.set('rateLimitController', new RateLimitController(config, logger));

    return this;
  }

  // Registrar serviços
  registerServices() {
    const config = this.services.get('config');
    const logger = this.services.get('logger');

    // Registrar serviços como singletons
    this.singletons.set('leadService', new LeadService(config, logger));
    
    // MessageProcessor precisa de todos os controladores
    const messageProcessor = new MessageProcessor({
      userController: this.singletons.get('userController'),
      opcoesController: this.singletons.get('opcoesController'),
      apiController: this.singletons.get('apiController'),
      rateLimitController: this.singletons.get('rateLimitController'),
      leadService: this.singletons.get('leadService'),
      config: config
    });
    
    this.singletons.set('messageProcessor', messageProcessor);

    return this;
  }

  // Obter serviço
  get(serviceName) {
    // Verificar se é singleton
    if (this.singletons.has(serviceName)) {
      return this.singletons.get(serviceName);
    }

    // Verificar se é serviço regular
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    throw new Error(`Serviço '${serviceName}' não encontrado`);
  }

  // Obter todos os serviços necessários para o bot
  getBotServices() {
    return {
      config: this.get('config'),
      logger: this.get('logger'),
      messageProcessor: this.get('messageProcessor'),
      apiController: this.get('apiController'),
      userController: this.get('userController'),
      opcoesController: this.get('opcoesController'),
      rateLimitController: this.get('rateLimitController'),
      leadService: this.get('leadService'),
      cacheManager: this.get('cacheManager'),
      messageOptimizer: this.get('messageOptimizer'),
      messageGrouper: this.get('messageGrouper')
    };
  }

  // Inicializar todos os serviços
  initialize(config) {
    return this
      .registerConfig(config)
      .registerLogger()
      .registerUtils()
      .registerControllers()
      .registerServices();
  }

  // Verificar se todos os serviços estão registrados
  validate() {
    const requiredServices = [
      'config', 'logger', 'messageProcessor', 'apiController',
      'userController', 'opcoesController', 'rateLimitController',
      'leadService', 'cacheManager', 'messageOptimizer', 'messageGrouper'
    ];

    const missing = [];
    for (const service of requiredServices) {
      try {
        this.get(service);
      } catch (error) {
        missing.push(service);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Serviços não registrados: ${missing.join(', ')}`);
    }

    return true;
  }

  // Obter estatísticas dos serviços
  getStatistics() {
    const stats = {
      services: this.services.size,
      singletons: this.singletons.size,
      total: this.services.size + this.singletons.size
    };

    // Adicionar estatísticas específicas dos serviços
    try {
      const apiController = this.get('apiController');
      stats.api = apiController.getEstatisticas();
    } catch (error) {
      stats.api = { error: 'Não disponível' };
    }

    try {
      const userController = this.get('userController');
      stats.users = userController.getEstatisticas();
    } catch (error) {
      stats.users = { error: 'Não disponível' };
    }

    try {
      const cacheManager = this.get('cacheManager');
      stats.cache = cacheManager.getEstatisticas();
    } catch (error) {
      stats.cache = { error: 'Não disponível' };
    }

    return stats;
  }

  // Limpar recursos
  cleanup() {
    // Limpar singletons
    for (const [name, service] of this.singletons.entries()) {
      if (service && typeof service.cleanup === 'function') {
        try {
          service.cleanup();
        } catch (error) {
          console.error(`Erro ao limpar serviço ${name}:`, error.message);
        }
      }
    }

    this.singletons.clear();
    this.services.clear();
  }
}

module.exports = ServiceContainer; 