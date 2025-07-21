const { cacheManager, messageOptimizer, messageGrouper } = require('./utils');
const config = require('./config');

// Função para mostrar estatísticas de cache
function mostrarCache() {
  console.log("📦 ESTATÍSTICAS DO CACHE\n");
  
  const estatisticas = cacheManager.getEstatisticas();
  
  console.log(`📊 Tamanho atual: ${estatisticas.tamanho}/${estatisticas.tamanhoMaximo}`);
  console.log(`📈 Taxa de uso: ${estatisticas.taxaUso}%`);
  console.log(`⏰ Tempo de expiração: ${config.otimizacao.cache.tempoExpiracao / 3600000}h`);
  
  if (estatisticas.tamanho > estatisticas.tamanhoMaximo * 0.8) {
    console.log("⚠️  Cache próximo do limite!");
  }
  
  console.log("\n💡 BENEFÍCIOS:");
  console.log("• Reduz chamadas à API");
  console.log("• Respostas mais rápidas");
  console.log("• Economia de tokens");
  console.log("• Melhor experiência do usuário");
}

// Função para mostrar configurações de otimização
function mostrarOtimizacoes() {
  console.log("⚡ CONFIGURAÇÕES DE OTIMIZAÇÃO\n");
  
  console.log("📦 CACHE:");
  console.log(`   Ativo: ${config.otimizacao.cache.ativo ? 'Sim' : 'Não'}`);
  console.log(`   Tamanho máximo: ${config.otimizacao.cache.tamanhoMaximo}`);
  console.log(`   Tempo expiração: ${config.otimizacao.cache.tempoExpiracao / 3600000}h`);
  
  console.log("\n✂️  OTIMIZAÇÃO DE MENSAGENS:");
  console.log(`   Máximo caracteres: ${config.otimizacao.mensagens.maxCaracteres}`);
  console.log(`   Máximo tokens: ${config.otimizacao.mensagens.maxTokens}`);
  console.log(`   Truncar inteligente: ${config.otimizacao.mensagens.truncarInteligente ? 'Sim' : 'Não'}`);
  console.log(`   Remover palavras comuns: ${config.otimizacao.mensagens.removerPalavrasComuns ? 'Sim' : 'Não'}`);
  
  console.log("\n📝 AGRUPAMENTO DE MENSAGENS:");
  console.log(`   Ativo: ${config.otimizacao.agrupamento.ativo ? 'Sim' : 'Não'}`);
  console.log(`   Tempo agrupamento: ${config.otimizacao.agrupamento.tempoAgrupamento / 1000}s`);
  console.log(`   Máximo por grupo: ${config.otimizacao.agrupamento.maxMensagensPorGrupo}`);
  console.log(`   Confirmação rápida: ${config.otimizacao.agrupamento.confirmacaoRapida ? 'Sim' : 'Não'}`);
}

// Função para testar otimização de mensagens
function testarOtimizacao() {
  console.log("🧪 TESTE DE OTIMIZAÇÃO DE MENSAGENS\n");
  
  const mensagensTeste = [
    "Oi, tudo bem? Como vocês estão?",
    "Olá! Bom dia! Por favor, me ajudem com uma dúvida sobre os produtos de vocês. Estou muito interessado em saber mais detalhes sobre como funciona o sistema e quais são os benefícios que posso ter ao adquirir. Obrigado!",
    "Quero comprar agora mesmo! Qual o preço? Tem desconto? Como faço para pagar?",
    "Oi, tudo bem? Como vocês estão?",
    "Olá! Bom dia! Por favor, me ajudem com uma dúvida sobre os produtos de vocês. Estou muito interessado em saber mais detalhes sobre como funciona o sistema e quais são os benefícios que posso ter ao adquirir. Obrigado!"
  ];
  
  for (const mensagem of mensagensTeste) {
    console.log(`📝 Mensagem original (${mensagem.length} chars, ${Math.ceil(mensagem.length/4)} tokens):`);
    console.log(`   "${mensagem}"`);
    
    const otimizada = messageOptimizer.otimizarMensagem(mensagem, 'classificacao');
    console.log(`\n✂️  Mensagem otimizada (${otimizada.length} chars, ${Math.ceil(otimizada.length/4)} tokens):`);
    console.log(`   "${otimizada}"`);
    
    const economia = Math.ceil(mensagem.length/4) - Math.ceil(otimizada.length/4);
    const percentual = ((economia / Math.ceil(mensagem.length/4)) * 100).toFixed(1);
    
    console.log(`\n💰 Economia: ${economia} tokens (${percentual}%)`);
    console.log("─".repeat(80));
  }
}

// Função para mostrar estatísticas de agrupamento
function mostrarAgrupamento() {
  console.log("📝 ESTATÍSTICAS DE AGRUPAMENTO\n");
  
  const grupos = messageGrouper.grupos;
  const numGrupos = grupos.size;
  
  console.log(`📊 Grupos ativos: ${numGrupos}`);
  console.log(`⏰ Tempo agrupamento: ${config.otimizacao.agrupamento.tempoAgrupamento / 1000}s`);
  console.log(`📦 Máximo por grupo: ${config.otimizacao.agrupamento.maxMensagensPorGrupo}`);
  
  if (numGrupos > 0) {
    console.log("\n📋 Grupos ativos:");
    for (const [telefone, grupo] of grupos.entries()) {
      const tempoDecorrido = Math.floor((Date.now() - grupo.ultimaAtualizacao) / 1000);
      console.log(`   ${telefone}: ${grupo.mensagens.length} mensagens (${tempoDecorrido}s atrás)`);
    }
  }
  
  console.log("\n💡 BENEFÍCIOS:");
  console.log("• Reduz chamadas à API");
  console.log("• Processa múltiplas mensagens juntas");
  console.log("• Melhor contexto para IA");
  console.log("• Economia de tokens");
}

// Função para limpar cache
function limparCache() {
  try {
    cacheManager.cache.clear();
    cacheManager.salvarCache();
    console.log("✅ Cache limpo com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao limpar cache:", error.message);
  }
}

// Função para mostrar economia estimada
function mostrarEconomia() {
  console.log("💰 ECONOMIA ESTIMADA DE TOKENS\n");
  
  const estatisticas = cacheManager.getEstatisticas();
  const taxaCache = parseFloat(estatisticas.taxaUso);
  
  // Estimativas baseadas em uso típico
  const estimativas = {
    mensagensPorDia: 100,
    tokensPorMensagem: 50,
    taxaOtimizacao: 0.3, // 30% de redução por otimização
    taxaAgrupamento: 0.2 // 20% de redução por agrupamento
  };
  
  const tokensSemOtimizacao = estimativas.mensagensPorDia * estimativas.tokensPorMensagem * 2; // Classificação + Resposta
  const tokensComCache = tokensSemOtimizacao * (1 - taxaCache / 100);
  const tokensComOtimizacao = tokensComCache * (1 - estimativas.taxaOtimizacao);
  const tokensComAgrupamento = tokensComOtimizacao * (1 - estimativas.taxaAgrupamento);
  
  console.log("📊 Estimativas diárias:");
  console.log(`   Sem otimização: ${tokensSemOtimizacao} tokens`);
  console.log(`   Com cache (${taxaCache}%): ${tokensComCache} tokens`);
  console.log(`   Com otimização: ${tokensComOtimizacao} tokens`);
  console.log(`   Com agrupamento: ${tokensComAgrupamento} tokens`);
  
  const economiaTotal = tokensSemOtimizacao - tokensComAgrupamento;
  const percentualEconomia = ((economiaTotal / tokensSemOtimizacao) * 100).toFixed(1);
  
  console.log(`\n💰 Economia total: ${economiaTotal} tokens (${percentualEconomia}%)`);
  console.log(`📈 Economia mensal estimada: ${economiaTotal * 30} tokens`);
  
  console.log("\n🎯 Comparação com limites:");
  console.log(`   Limite TPD: ${config.api.groq.rateLimits.TPD} tokens`);
  console.log(`   Uso otimizado: ${tokensComAgrupamento} tokens`);
  console.log(`   Margem de segurança: ${((config.api.groq.rateLimits.TPD - tokensComAgrupamento) / config.api.groq.rateLimits.TPD * 100).toFixed(1)}%`);
}

// Verificar argumentos da linha de comando
const comando = process.argv[2];

switch (comando) {
  case 'cache':
    mostrarCache();
    break;
  case 'otimizacoes':
    mostrarOtimizacoes();
    break;
  case 'teste':
    testarOtimizacao();
    break;
  case 'agrupamento':
    mostrarAgrupamento();
    break;
  case 'limpar':
    limparCache();
    break;
  case 'economia':
    mostrarEconomia();
    break;
  default:
    console.log("⚡ MONITOR DE OTIMIZAÇÃO - Comandos disponíveis:");
    console.log("• node monitor-otimizacao.js cache       - Estatísticas do cache");
    console.log("• node monitor-otimizacao.js otimizacoes - Configurações de otimização");
    console.log("• node monitor-otimizacao.js teste       - Testar otimização de mensagens");
    console.log("• node monitor-otimizacao.js agrupamento - Estatísticas de agrupamento");
    console.log("• node monitor-otimizacao.js limpar      - Limpar cache");
    console.log("• node monitor-otimizacao.js economia    - Economia estimada de tokens");
    break;
} 