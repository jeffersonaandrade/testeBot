module.exports = {
  // Configurações da empresa
  empresa: {
    nome: "Sua Empresa",
    telefone: "(11) 99999-9999",
    email: "contato@suaempresa.com",
    horarioAtendimento: "Segunda a Sexta, 8h às 18h",
    website: "https://suaempresa.com"
  },

  // Rate limits oficiais da Groq para llama3-70b-8192
  api: {
    groq: {
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama3-70b-8192",
      rateLimits: {
        RPM: 30,        // Requests por minuto
        RPD: 14400,     // Requests por dia
        TPM: 6000,      // Tokens por minuto
        TPD: 500000     // Tokens por dia
      },
      timeout: 10000,   // Timeout em ms
      arquivoControle: 'controle-api.json'
    }
  },

  // Configurações da IA
  ia: {
    // Configuração para classificação de intenção
    classificacao: {
      temperature: 0.2,
      maxTokens: 20,
      systemPrompt: `Você é um classificador especializado em intenção de compra. Analise a mensagem e responda APENAS com uma das opções:

"CURIOSO" - Quando a pessoa:
• Faz perguntas gerais sobre a empresa
• Cumprimenta ou pergunta "tudo bem?"
• Pergunta horário de funcionamento
• Faz perguntas básicas sem interesse específico
• Exemplo: "Oi", "Tudo bem?", "Que horas abrem?", "Onde fica?"

"INTERESSADO" - Quando a pessoa:
• Pergunta sobre produtos/serviços específicos
• Quer saber como funciona algo
• Pede informações detalhadas
• Mostra interesse mas não menciona compra
• Exemplo: "Como funciona?", "Quais benefícios?", "Tem garantia?"

"COMPRADOR" - Quando a pessoa:
• Pergunta sobre preços
• Menciona compra, pagamento ou orçamento
• Quer saber formas de pagamento
• Pede desconto ou condições
• Exemplo: "Qual o preço?", "Quero comprar", "Tem desconto?", "Como pago?"

Responda APENAS com: CURIOSO, INTERESSADO ou COMPRADOR`
    },

    // Configuração para geração de respostas
    resposta: {
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: `Você é um assistente de pré-atendimento para uma empresa. 
      
Se a intenção for "CURIOSO": Responda de forma educativa e informativa, mas sem ser muito comercial.
Se a intenção for "INTERESSADO": Forneça informações detalhadas sobre produtos e serviços, mas ainda não transfira para humano.
Se a intenção for "COMPRADOR": Agradeça o interesse, peça nome e telefone, e informe que um especialista entrará em contato em breve.

Seja sempre cordial e profissional.`
    }
  },

  // Palavras-chave para classificação local (sem API)
  palavrasChave: {
    comprador: [
      'preço', 'valor', 'quanto custa', 'comprar', 'compra', 'pagamento', 
      'pagar', 'desconto', 'promoção', 'oferta', 'orçamento', 'quero comprar',
      'quanto é', 'valor do', 'custa quanto', 'forma de pagamento'
    ],
    interessado: [
      'como funciona', 'funciona', 'benefícios', 'vantagens', 'inclui',
      'garantia', 'suporte', 'detalhes', 'mais informações', 'explicar',
      'entender', 'saber mais', 'informações sobre', 'como é'
    ]
  },

  // Respostas pré-definidas para economizar API
  respostas: {
    curioso: [
      "Olá! Obrigado pelo contato. Como posso ajudá-lo hoje? 😊",
      "Oi! Tudo bem? Aqui é o assistente virtual. Em que posso ser útil?",
      "Bom dia! Seja bem-vindo! Como posso te ajudar?",
      "Oi! Obrigado por entrar em contato. Como posso auxiliá-lo?"
    ],
    
    interessado: [
      "Que ótimo! Temos excelentes produtos/serviços. Posso te passar mais informações sobre qual área te interessa?",
      "Perfeito! Vou te explicar tudo sobre nossos produtos. Qual aspecto te interessa mais?",
      "Excelente! Temos várias opções que podem te atender. Que tipo de solução você está procurando?",
      "Ótimo interesse! Posso te detalhar nossos produtos. Qual categoria te chama mais atenção?"
    ],
    
    comprador: [
      "Perfeito! Vejo que você tem interesse real. Para te dar o melhor atendimento, preciso de algumas informações:\n\n• Seu nome completo\n• Melhor horário para contato\n• Produto/serviço de interesse\n\nNossa equipe entrará em contato em até 2 horas úteis!",
      "Excelente! Você parece estar pronto para avançar. Vou precisar de alguns dados:\n\n• Nome completo\n• Horário preferido\n• Produto desejado\n\nEntraremos em contato rapidamente!",
      "Que ótimo! Para te atender da melhor forma:\n\n• Nome completo\n• Melhor horário\n• Produto de interesse\n\nNossa equipe te contata em breve!"
    ],
    
    limiteExcedido: [
      "Desculpe, nosso sistema está temporariamente sobrecarregado. Por favor, tente novamente em alguns minutos ou entre em contato diretamente pelo telefone (11) 99999-9999.",
      "Estamos com alta demanda no momento. Tente novamente em breve ou ligue para (11) 99999-9999 para atendimento imediato.",
      "Sistema temporariamente indisponível. Para atendimento urgente, ligue (11) 99999-9999."
    ]
  },

  // Produtos/serviços da empresa (para respostas mais específicas)
  produtos: [
    {
      nome: "Produto A",
      descricao: "Descrição do produto A",
      preco: "R$ 100,00",
      beneficios: ["Benefício 1", "Benefício 2", "Benefício 3"]
    },
    {
      nome: "Serviço B", 
      descricao: "Descrição do serviço B",
      preco: "A partir de R$ 200,00",
      beneficios: ["Benefício 1", "Benefício 2", "Benefício 3"]
    }
  ],

  // Configurações do bot
  bot: {
    tempoResposta: 2000, // Tempo em ms para enviar respostas automáticas
    salvarLeads: true,   // Se deve salvar leads em CSV
    notificarTransferencia: true, // Se deve notificar sobre transferência para humano
    arquivoLeads: 'leads.csv',
    arquivoLogs: 'bot-logs.txt'
  },

  // Configurações de WhatsApp
  whatsapp: {
    headless: true,
    timeout: 30000,
    qrCode: {
      small: true
    }
  },

  // Configurações de logs
  logs: {
    nivel: 'info', // 'debug', 'info', 'warn', 'error'
    mostrarConsole: true,
    salvarArquivo: true,
    formato: 'DD/MM/YYYY HH:mm:ss'
  },

  // Configurações de otimização
  otimizacao: {
    // Cache
    cache: {
      ativo: true,
      tamanhoMaximo: 1000,
      tempoExpiracao: 3600000, // 1 hora
      arquivo: 'cache-respostas.json'
    },
    
    // Otimização de mensagens
    mensagens: {
      maxCaracteres: 500,
      maxTokens: 150,
      truncarInteligente: true,
      removerPalavrasComuns: true
    },
    
    // Agrupamento de mensagens
    agrupamento: {
      ativo: true,
      tempoAgrupamento: 30000, // 30 segundos
      maxMensagensPorGrupo: 5,
      confirmacaoRapida: true
    }
  },

  // Configurações de controle de usuários
  controleUsuarios: {
    // Sistema de número de respostas
    numeroRespostas: {
      ativo: true,
      maxRespostas: 5, // Aumentado para 5 respostas por sessão
      mensagemLimite: "Você atingiu o limite de respostas automáticas. Para continuar, entre em contato diretamente: {telefone_empresa}",
      resetDiario: true, // Reset diário do contador
      permitirContinuarSeInteressado: true // Permitir mais respostas se for INTERESSADO
    },
    
    // Bloqueio após transferência
    bloqueioTransferencia: {
      ativo: true,
      tempoBloqueio: 259200000, // 3 dias em ms (3 * 24 * 60 * 60 * 1000)
      mensagemBloqueio: "Você foi transferido para atendimento humano. Aguarde o contato de nossa equipe. Não enviaremos mais respostas automáticas por {tempo_bloqueio}.",
      arquivoBloqueados: 'usuarios-bloqueados.json'
    }
  },

  // Sistema de opções/menus
  opcoes: {
    ativo: true, // Ativar sistema de opções
    usarIAComoFallback: true, // Usar IA se opções não funcionarem
    
    // Menu principal
    menuPrincipal: {
      titulo: "🤖 Bem-vindo ao {nome_empresa}!",
      subtitulo: "Como posso ajudá-lo hoje?",
      opcoes: [
        {
          numero: "1",
          texto: "📋 Conhecer produtos/serviços",
          intencao: "INTERESSADO",
          resposta: "resposta_interessado_produtos"
        },
        {
          numero: "2", 
          texto: "💰 Fazer orçamento",
          intencao: "INTERESSADO",
          resposta: "resposta_interessado_orcamento"
        },
        {
          numero: "3",
          texto: "🛒 Comprar agora",
          intencao: "COMPRADOR",
          resposta: "resposta_comprador"
        },
        {
          numero: "4",
          texto: "❓ Dúvidas gerais",
          intencao: "CURIOSO",
          resposta: "resposta_curioso"
        },
        {
          numero: "5",
          texto: "👨‍💼 Falar com atendente",
          intencao: "COMPRADOR",
          resposta: "resposta_atendente_humano"
        }
      ]
    },
    
    // Submenus por categoria
    submenus: {
      produtos: {
        titulo: "📋 Nossos Produtos/Serviços",
        opcoes: [
          { numero: "1", texto: "Produto A", intencao: "INTERESSADO" },
          { numero: "2", texto: "Produto B", intencao: "INTERESSADO" },
          { numero: "3", texto: "Produto C", intencao: "INTERESSADO" },
          { numero: "0", texto: "🔙 Voltar", intencao: "VOLTAR" }
        ]
      },
      orcamento: {
        titulo: "💰 Solicitar Orçamento",
        opcoes: [
          { numero: "1", texto: "Orçamento rápido", intencao: "INTERESSADO" },
          { numero: "2", texto: "Orçamento detalhado", intencao: "COMPRADOR" },
          { numero: "0", texto: "🔙 Voltar", intencao: "VOLTAR" }
        ]
      }
    },
    
    // Configurações
    configuracao: {
      mostrarMenuInicial: true, // Mostrar menu na primeira mensagem
      timeoutMenu: 300000, // 5 minutos para escolher opção
      permitirTextoLivre: true, // Permitir texto além das opções
      mensagemTimeout: "⏰ Tempo esgotado. Digite 'menu' para ver as opções novamente."
    }
  }
}; 