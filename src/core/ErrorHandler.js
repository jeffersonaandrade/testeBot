class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
    this.errorCounts = new Map();
    this.maxErrorsPerMinute = 10;
    this.errorWindow = 60000; // 1 minuto
  }

  // Tratar erro geral
  handleError(error, context = {}) {
    const errorKey = this.getErrorKey(error);
    this.incrementErrorCount(errorKey);

    // Verificar se está excedendo limite de erros
    if (this.isErrorLimitExceeded(errorKey)) {
      this.logger.warn('Limite de erros excedido', { 
        errorKey, 
        count: this.getErrorCount(errorKey),
        context 
      });
      return this.getFallbackResponse(errorKey);
    }

    // Log do erro
    this.logger.error('Erro capturado', {
      message: error.message,
      stack: error.stack,
      errorKey,
      context,
      count: this.getErrorCount(errorKey)
    });

    // Retornar resposta apropriada baseada no tipo de erro
    return this.getErrorResponse(error, context);
  }

  // Tratar erro específico de API
  handleApiError(error, context = {}) {
    const apiError = {
      type: 'API_ERROR',
      originalError: error,
      context,
      timestamp: new Date().toISOString()
    };

    // Classificar tipo de erro da API
    if (error.status === 429) {
      apiError.subtype = 'RATE_LIMIT';
      apiError.message = 'Rate limit excedido';
    } else if (error.status >= 500) {
      apiError.subtype = 'SERVER_ERROR';
      apiError.message = 'Erro do servidor';
    } else if (error.status === 401) {
      apiError.subtype = 'AUTH_ERROR';
      apiError.message = 'Erro de autenticação';
    } else {
      apiError.subtype = 'UNKNOWN_API_ERROR';
      apiError.message = 'Erro desconhecido da API';
    }

    this.logger.error('Erro de API', apiError);
    return this.getApiErrorResponse(apiError);
  }

  // Tratar erro de validação
  handleValidationError(error, context = {}) {
    const validationError = {
      type: 'VALIDATION_ERROR',
      field: error.field,
      value: error.value,
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    };

    this.logger.warn('Erro de validação', validationError);
    return this.getValidationErrorResponse(validationError);
  }

  // Tratar erro de WhatsApp
  handleWhatsAppError(error, context = {}) {
    const whatsappError = {
      type: 'WHATSAPP_ERROR',
      originalError: error,
      context,
      timestamp: new Date().toISOString()
    };

    // Classificar erro do WhatsApp
    if (error.message.includes('connection')) {
      whatsappError.subtype = 'CONNECTION_ERROR';
      whatsappError.message = 'Erro de conexão com WhatsApp';
    } else if (error.message.includes('message')) {
      whatsappError.subtype = 'MESSAGE_ERROR';
      whatsappError.message = 'Erro ao enviar mensagem';
    } else {
      whatsappError.subtype = 'UNKNOWN_WHATSAPP_ERROR';
      whatsappError.message = 'Erro desconhecido do WhatsApp';
    }

    this.logger.error('Erro do WhatsApp', whatsappError);
    return this.getWhatsAppErrorResponse(whatsappError);
  }

  // Obter chave única para o erro
  getErrorKey(error) {
    const message = error.message || 'unknown';
    const type = error.constructor.name;
    return `${type}:${message.substring(0, 50)}`;
  }

  // Incrementar contador de erros
  incrementErrorCount(errorKey) {
    const now = Date.now();
    const errorData = this.errorCounts.get(errorKey) || { count: 0, firstError: now };
    
    errorData.count++;
    errorData.lastError = now;
    
    this.errorCounts.set(errorKey, errorData);
  }

  // Obter contagem de erros
  getErrorCount(errorKey) {
    const errorData = this.errorCounts.get(errorKey);
    return errorData ? errorData.count : 0;
  }

  // Verificar se limite de erros foi excedido
  isErrorLimitExceeded(errorKey) {
    const errorData = this.errorCounts.get(errorKey);
    if (!errorData) return false;

    const now = Date.now();
    const timeSinceFirstError = now - errorData.firstError;

    // Se passou mais de 1 minuto, resetar contador
    if (timeSinceFirstError > this.errorWindow) {
      this.errorCounts.delete(errorKey);
      return false;
    }

    return errorData.count >= this.maxErrorsPerMinute;
  }

  // Obter resposta de erro genérica
  getErrorResponse(error, context) {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'NETWORK':
        return {
          success: false,
          message: "❌ Erro de conexão. Verifique sua internet e tente novamente.",
          retry: true,
          delay: 5000
        };
      
      case 'TIMEOUT':
        return {
          success: false,
          message: "⏰ Tempo limite excedido. Tente novamente em alguns segundos.",
          retry: true,
          delay: 3000
        };
      
      case 'VALIDATION':
        return {
          success: false,
          message: "⚠️ Dados inválidos. Verifique as informações e tente novamente.",
          retry: false
        };
      
      case 'PERMISSION':
        return {
          success: false,
          message: "🚫 Sem permissão para executar esta ação.",
          retry: false
        };
      
      default:
        return {
          success: false,
          message: "❌ Ocorreu um erro inesperado. Tente novamente mais tarde.",
          retry: true,
          delay: 10000
        };
    }
  }

  // Obter resposta específica para erro de API
  getApiErrorResponse(apiError) {
    switch (apiError.subtype) {
      case 'RATE_LIMIT':
        return {
          success: false,
          message: "🔄 Sistema temporariamente sobrecarregado. Tente novamente em alguns minutos.",
          retry: true,
          delay: 30000
        };
      
      case 'SERVER_ERROR':
        return {
          success: false,
          message: "🔧 Serviço temporariamente indisponível. Tente novamente em breve.",
          retry: true,
          delay: 15000
        };
      
      case 'AUTH_ERROR':
        return {
          success: false,
          message: "🔑 Erro de autenticação. Contate o suporte técnico.",
          retry: false
        };
      
      default:
        return {
          success: false,
          message: "❌ Erro no serviço. Tente novamente mais tarde.",
          retry: true,
          delay: 10000
        };
    }
  }

  // Obter resposta específica para erro de validação
  getValidationErrorResponse(validationError) {
    return {
      success: false,
      message: `⚠️ ${validationError.message}`,
      field: validationError.field,
      retry: false
    };
  }

  // Obter resposta específica para erro do WhatsApp
  getWhatsAppErrorResponse(whatsappError) {
    switch (whatsappError.subtype) {
      case 'CONNECTION_ERROR':
        return {
          success: false,
          message: "📱 Erro de conexão com WhatsApp. Verificando conexão...",
          retry: true,
          delay: 10000
        };
      
      case 'MESSAGE_ERROR':
        return {
          success: false,
          message: "💬 Erro ao enviar mensagem. Tentando novamente...",
          retry: true,
          delay: 5000
        };
      
      default:
        return {
          success: false,
          message: "📱 Erro no WhatsApp. Tentando reconectar...",
          retry: true,
          delay: 15000
        };
    }
  }

  // Obter resposta de fallback quando limite de erros é excedido
  getFallbackResponse(errorKey) {
    return {
      success: false,
      message: "🛠️ Sistema em manutenção. Tente novamente em alguns minutos.",
      retry: false,
      fallback: true
    };
  }

  // Classificar tipo de erro
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'NETWORK';
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION';
    }
    
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'PERMISSION';
    }
    
    return 'UNKNOWN';
  }

  // Limpar contadores antigos
  cleanup() {
    const now = Date.now();
    for (const [errorKey, errorData] of this.errorCounts.entries()) {
      if (now - errorData.lastError > this.errorWindow) {
        this.errorCounts.delete(errorKey);
      }
    }
  }

  // Obter estatísticas de erros
  getStatistics() {
    const stats = {
      totalErrors: 0,
      errorTypes: {},
      recentErrors: []
    };

    for (const [errorKey, errorData] of this.errorCounts.entries()) {
      stats.totalErrors += errorData.count;
      
      const errorType = errorKey.split(':')[0];
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + errorData.count;
      
      if (Date.now() - errorData.lastError < 300000) { // Últimos 5 minutos
        stats.recentErrors.push({
          errorKey,
          count: errorData.count,
          lastError: new Date(errorData.lastError).toISOString()
        });
      }
    }

    return stats;
  }

  // Resetar contadores de erro
  resetErrorCounts() {
    this.errorCounts.clear();
    this.logger.info('Contadores de erro resetados');
  }
}

module.exports = ErrorHandler; 