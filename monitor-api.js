const ApiController = require('./api-controller');
const config = require('./config');

// Inicializar controlador
const apiController = new ApiController();

// Função para mostrar status do uso da API
function mostrarStatusAPI() {
  console.log("📊 MONITOR DE USO DA API GROQ (llama3-70b-8192)\n");
  
  const estatisticas = apiController.getEstatisticas();
  
  console.log(`📅 Data atual: ${new Date().toLocaleDateString('pt-BR')}`);
  console.log(`⏰ Hora atual: ${new Date().toLocaleTimeString('pt-BR')}`);
  
  // Status RPM (Requests por minuto)
  console.log(`\n🔄 RPM (Requests por minuto):`);
  console.log(`   ${estatisticas.chamadasMinuto}/${config.api.groq.rateLimits.RPM} (${estatisticas.percentualRPM}%)`);
  
  // Status RPD (Requests por dia)
  console.log(`\n📈 RPD (Requests por dia):`);
  console.log(`   ${estatisticas.chamadasHoje}/${config.api.groq.rateLimits.RPD} (${estatisticas.percentualRPD}%)`);
  
  // Status TPM (Tokens por minuto)
  console.log(`\n🧠 TPM (Tokens por minuto):`);
  console.log(`   ${estatisticas.tokensMinuto}/${config.api.groq.rateLimits.TPM} (${estatisticas.percentualTPM}%)`);
  
  // Status TPD (Tokens por dia)
  console.log(`\n📊 TPD (Tokens por dia):`);
  console.log(`   ${estatisticas.tokensDia}/${config.api.groq.rateLimits.TPD} (${estatisticas.percentualTPD}%)`);
  
  // Avisos de limite próximo
  console.log("\n⚠️  AVISOS:");
  if (estatisticas.chamadasMinuto >= config.api.groq.rateLimits.RPM * 0.8) {
    console.log("   • RPM próximo do limite!");
  }
  if (estatisticas.chamadasHoje >= config.api.groq.rateLimits.RPD * 0.8) {
    console.log("   • RPD próximo do limite!");
  }
  if (estatisticas.tokensMinuto >= config.api.groq.rateLimits.TPM * 0.8) {
    console.log("   • TPM próximo do limite!");
  }
  if (estatisticas.tokensDia >= config.api.groq.rateLimits.TPD * 0.8) {
    console.log("   • TPD próximo do limite!");
  }
  
  // Status de limite atingido
  console.log("\n🚫 LIMITES ATINGIDOS:");
  if (estatisticas.chamadasMinuto >= config.api.groq.rateLimits.RPM) {
    console.log("   • RPM ATINGIDO - Usando respostas pré-definidas");
  }
  if (estatisticas.chamadasHoje >= config.api.groq.rateLimits.RPD) {
    console.log("   • RPD ATINGIDO - Usando respostas pré-definidas");
  }
  if (estatisticas.tokensMinuto >= config.api.groq.rateLimits.TPM) {
    console.log("   • TPM ATINGIDO - Usando respostas pré-definidas");
  }
  if (estatisticas.tokensDia >= config.api.groq.rateLimits.TPD) {
    console.log("   • TPD ATINGIDO - Usando respostas pré-definidas");
  }
  
  if (estatisticas.chamadasMinuto < config.api.groq.rateLimits.RPM && 
      estatisticas.chamadasHoje < config.api.groq.rateLimits.RPD && 
      estatisticas.tokensMinuto < config.api.groq.rateLimits.TPM &&
      estatisticas.tokensDia < config.api.groq.rateLimits.TPD) {
    console.log("   • Nenhum limite atingido - Bot funcionando normalmente");
  }
  
  console.log("\n💡 INFORMAÇÕES:");
  console.log("• RPM: Reset automático a cada minuto");
  console.log("• RPD: Reset automático a cada dia");
  console.log("• TPM: Reset automático a cada minuto");
  console.log("• TPD: Reset automático a cada dia");
  console.log("• Bot usa IA quando há créditos disponíveis");
  console.log("• Quando limite é atingido, usa respostas pré-definidas");
  console.log("• Sistema de backoff implementado para evitar erros 429");
  console.log("• Valores baseados na documentação oficial da Groq");
}

// Função para resetar contadores
function resetarContadores() {
  apiController.resetarContadores();
  console.log("✅ Contadores resetados com sucesso!");
  console.log("🔄 Próxima execução começará com contadores zerados");
}

// Função para mostrar rate limits oficiais
function mostrarRateLimits() {
  console.log("📋 RATE LIMITS OFICIAIS DA GROQ (llama3-70b-8192)\n");
  console.log("| Métrica | Limite | Descrição |");
  console.log("|---------|--------|-----------|");
  console.log(`| RPM | ${config.api.groq.rateLimits.RPM} | Requests por minuto |`);
  console.log(`| RPD | ${config.api.groq.rateLimits.RPD} | Requests por dia |`);
  console.log(`| TPM | ${config.api.groq.rateLimits.TPM} | Tokens por minuto |`);
  console.log(`| TPD | ${config.api.groq.rateLimits.TPD} | Tokens por dia |`);
  
  console.log("\n🔗 Fonte: Documentação oficial da Groq");
  console.log("📖 https://console.groq.com/docs/rate-limits");
}

// Função para mostrar configurações atuais
function mostrarConfiguracoes() {
  console.log("⚙️  CONFIGURAÇÕES ATUAIS DO BOT\n");
  
  console.log("🏢 EMPRESA:");
  console.log(`   Nome: ${config.empresa.nome}`);
  console.log(`   Telefone: ${config.empresa.telefone}`);
  console.log(`   Email: ${config.empresa.email}`);
  console.log(`   Horário: ${config.empresa.horarioAtendimento}`);
  
  console.log("\n🤖 BOT:");
  console.log(`   Salvar leads: ${config.bot.salvarLeads ? 'Sim' : 'Não'}`);
  console.log(`   Notificar transferência: ${config.bot.notificarTransferencia ? 'Sim' : 'Não'}`);
  console.log(`   Arquivo leads: ${config.bot.arquivoLeads}`);
  console.log(`   Arquivo logs: ${config.bot.arquivoLogs}`);
  
  console.log("\n🧠 IA:");
  console.log(`   Modelo: ${config.api.groq.model}`);
  console.log(`   URL: ${config.api.groq.baseUrl}`);
  console.log(`   Timeout: ${config.api.groq.timeout}ms`);
  
  console.log("\n📊 LOGS:");
  console.log(`   Nível: ${config.logs.nivel}`);
  console.log(`   Console: ${config.logs.mostrarConsole ? 'Sim' : 'Não'}`);
  console.log(`   Arquivo: ${config.logs.salvarArquivo ? 'Sim' : 'Não'}`);
}

// Função para ajustar limites
function ajustarLimites() {
  console.log("\n⚙️  AJUSTAR LIMITES DA API");
  console.log("Para alterar os limites, edite o arquivo 'config.js':");
  console.log("• Procure por 'config.api.groq.rateLimits'");
  console.log("• Altere os valores de 'RPM', 'RPD', 'TPM'");
  console.log("• Reinicie o bot após as alterações");
  console.log("\n⚠️  ATENÇÃO: Os limites atuais seguem a documentação oficial da Groq");
}

// Verificar argumentos da linha de comando
const comando = process.argv[2];

switch (comando) {
  case 'status':
    mostrarStatusAPI();
    break;
  case 'reset':
    resetarContadores();
    break;
  case 'limits':
    mostrarRateLimits();
    break;
  case 'config':
    mostrarConfiguracoes();
    break;
  case 'ajustar':
    ajustarLimites();
    break;
  default:
    console.log("📊 MONITOR DE API GROQ - Comandos disponíveis:");
    console.log("• node monitor-api.js status   - Mostrar status atual");
    console.log("• node monitor-api.js reset    - Resetar contadores");
    console.log("• node monitor-api.js limits   - Mostrar rate limits oficiais");
    console.log("• node monitor-api.js config   - Mostrar configurações atuais");
    console.log("• node monitor-api.js ajustar  - Como ajustar limites");
    break;
} 