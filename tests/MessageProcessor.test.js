const MessageProcessor = require('../src/services/MessageProcessor');

describe('MessageProcessor', () => {
  let messageProcessor;
  let mockServices;

  beforeEach(() => {
    mockServices = {
      userController: {
        podeReceberResposta: jest.fn().mockReturnValue({ pode: true }),
        incrementarContador: jest.fn()
      },
      opcoesController: {
        processarMensagem: jest.fn().mockResolvedValue({ usarIA: true })
      },
      apiController: {
        classificarIntencao: jest.fn().mockResolvedValue('CURIOSO'),
        gerarResposta: jest.fn().mockResolvedValue('Resposta teste')
      },
      rateLimitController: {
        sistemaEstaAtivo: jest.fn().mockReturnValue(true),
        podeFazerRequisicao: jest.fn().mockReturnValue(true),
        registrarUso: jest.fn()
      },
      leadService: {
        salvarLead: jest.fn()
      },
      config: {
        bot: {
          tempoResposta: 2000,
          notificarTransferencia: false
        }
      }
    };

    messageProcessor = new MessageProcessor(mockServices);
  });

  test('should process valid message', async () => {
    const mockMessage = {
      body: 'Olá, tudo bem?',
      from: '5511999999999@c.us',
      reply: jest.fn().mockResolvedValue(true)
    };

    await messageProcessor.processMessage(mockMessage);

    expect(mockServices.userController.podeReceberResposta).toHaveBeenCalled();
    expect(mockServices.opcoesController.processarMensagem).toHaveBeenCalled();
  });

  test('should handle empty message', async () => {
    const mockMessage = {
      body: '',
      from: '5511999999999@c.us',
      reply: jest.fn()
    };

    await messageProcessor.processMessage(mockMessage);

    expect(mockMessage.reply).not.toHaveBeenCalled();
  });
});
