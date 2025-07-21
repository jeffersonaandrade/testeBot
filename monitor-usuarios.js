const UserController = require('./user-controller');
const config = require('./config');

// Instanciar controlador
const userController = new UserController();

// Função para mostrar estatísticas gerais
function mostrarEstatisticas() {
  console.log("👥 ESTATÍSTICAS DE USUÁRIOS\n");
  
  const estatisticas = userController.getEstatisticas();
  
  console.log("📊 CONTADORES:");
  console.log(`   Total de usuários: ${estatisticas.totalContadores}`);
  console.log(`   Ativos (24h): ${estatisticas.contadoresAtivos}`);
  console.log(`   Limite por usuário: ${estatisticas.maxRespostas} respostas`);
  
  console.log("\n🚫 BLOQUEIOS:");
  console.log(`   Total bloqueados: ${estatisticas.totalBloqueios}`);
  console.log(`   Ativos: ${estatisticas.bloqueiosAtivos}`);
  console.log(`   Tempo de bloqueio: ${estatisticas.tempoBloqueio}`);
  
  console.log("\n⚙️  CONFIGURAÇÕES:");
  console.log(`   Controle ativo: ${config.controleUsuarios.numeroRespostas.ativo ? 'Sim' : 'Não'}`);
  console.log(`   Bloqueio ativo: ${config.controleUsuarios.bloqueioTransferencia.ativo ? 'Sim' : 'Não'}`);
  console.log(`   Reset diário: ${config.controleUsuarios.numeroRespostas.resetDiario ? 'Sim' : 'Não'}`);
}

// Função para listar usuários com contadores altos
function listarContadoresAltos() {
  console.log("⚠️  USUÁRIOS COM CONTADORES ALTOS\n");
  
  const usuarios = userController.getUsuariosComContadorAlto();
  
  if (usuarios.length === 0) {
    console.log("✅ Nenhum usuário com contador alto encontrado.");
    return;
  }
  
  console.log(`📋 ${usuarios.length} usuário(s) próximo(s) do limite:\n`);
  
  usuarios.forEach((usuario, index) => {
    const percentual = ((usuario.contador / usuario.maxRespostas) * 100).toFixed(1);
    console.log(`${index + 1}. 📱 ${usuario.telefone}`);
    console.log(`   Contador: ${usuario.contador}/${usuario.maxRespostas} (${percentual}%)`);
    console.log(`   Última resposta: ${usuario.ultimaResposta}`);
    console.log("");
  });
}

// Função para listar usuários bloqueados
function listarBloqueados() {
  console.log("🚫 USUÁRIOS BLOQUEADOS\n");
  
  const usuarios = userController.getUsuariosBloqueados();
  
  if (usuarios.length === 0) {
    console.log("✅ Nenhum usuário bloqueado encontrado.");
    return;
  }
  
  console.log(`📋 ${usuarios.length} usuário(s) bloqueado(s):\n`);
  
  usuarios.forEach((usuario, index) => {
    console.log(`${index + 1}. 📱 ${usuario.telefone}`);
    console.log(`   Motivo: ${usuario.motivo}`);
    console.log(`   Bloqueado em: ${usuario.bloqueadoEm}`);
    console.log(`   Expira em: ${usuario.expiraEm}`);
    console.log(`   Tempo restante: ${usuario.tempoRestante}`);
    console.log("");
  });
}

// Função para desbloquear usuário
function desbloquearUsuario(telefone) {
  if (!telefone) {
    console.log("❌ Telefone não fornecido. Use: node monitor-usuarios.js desbloquear <telefone>");
    return;
  }
  
  const sucesso = userController.desbloquearUsuario(telefone);
  
  if (sucesso) {
    console.log(`✅ Usuário ${telefone} desbloqueado com sucesso!`);
  } else {
    console.log(`❌ Usuário ${telefone} não estava bloqueado.`);
  }
}

// Função para resetar contador
function resetarContador(telefone) {
  if (!telefone) {
    console.log("❌ Telefone não fornecido. Use: node monitor-usuarios.js resetar <telefone>");
    return;
  }
  
  const sucesso = userController.resetarContador(telefone);
  
  if (sucesso) {
    console.log(`✅ Contador do usuário ${telefone} resetado com sucesso!`);
  } else {
    console.log(`❌ Usuário ${telefone} não tinha contador ativo.`);
  }
}

// Função para mostrar detalhes de um usuário
function mostrarDetalhesUsuario(telefone) {
  if (!telefone) {
    console.log("❌ Telefone não fornecido. Use: node monitor-usuarios.js detalhes <telefone>");
    return;
  }
  
  console.log(`📱 DETALHES DO USUÁRIO: ${telefone}\n`);
  
  // Verificar contador
  const contador = userController.getContadorRespostas(telefone);
  const maxRespostas = config.controleUsuarios.numeroRespostas.maxRespostas;
  const percentual = ((contador / maxRespostas) * 100).toFixed(1);
  
  console.log("📊 CONTADOR:");
  console.log(`   Respostas: ${contador}/${maxRespostas} (${percentual}%)`);
  
  // Verificar bloqueio
  const isBloqueado = userController.isBloqueado(telefone);
  console.log(`\n🚫 STATUS: ${isBloqueado ? 'BLOQUEADO' : 'LIBERADO'}`);
  
  if (isBloqueado) {
    const tempoRestante = userController.getTempoRestanteBloqueio(telefone);
    const minutosRestantes = Math.ceil(tempoRestante / 60000);
    console.log(`   Tempo restante: ${minutosRestantes} minutos`);
  }
  
  // Verificar se pode receber resposta
  const verificacao = userController.podeReceberResposta(telefone);
  console.log(`\n✅ PODE RECEBER RESPOSTA: ${verificacao.pode ? 'SIM' : 'NÃO'}`);
  
  if (!verificacao.pode) {
    console.log(`   Motivo: ${verificacao.motivo}`);
  }
}

// Função para simular bloqueio
function simularBloqueio(telefone) {
  if (!telefone) {
    console.log("❌ Telefone não fornecido. Use: node monitor-usuarios.js simular <telefone>");
    return;
  }
  
  console.log(`🧪 SIMULANDO BLOQUEIO: ${telefone}\n`);
  
  // Simular bloqueio
  userController.bloquearUsuario(telefone, 'teste');
  
  console.log("✅ Usuário bloqueado para teste!");
  console.log("📋 Detalhes do bloqueio:");
  
  const isBloqueado = userController.isBloqueado(telefone);
  const tempoRestante = userController.getTempoRestanteBloqueio(telefone);
  const minutosRestantes = Math.ceil(tempoRestante / 60000);
  
  console.log(`   Status: ${isBloqueado ? 'BLOQUEADO' : 'LIBERADO'}`);
  console.log(`   Tempo restante: ${minutosRestantes} minutos`);
  
  // Mostrar mensagem de bloqueio
  const mensagem = userController.getMensagemBloqueio(telefone);
  console.log(`\n💬 Mensagem de bloqueio:`);
  console.log(`   "${mensagem}"`);
}

// Função para limpar todos os dados
function limparTodosDados() {
  console.log("🗑️  LIMPANDO TODOS OS DADOS\n");
  
  console.log("⚠️  ATENÇÃO: Esta ação irá:");
  console.log("   • Remover todos os contadores de usuários");
  console.log("   • Remover todos os bloqueios ativos");
  console.log("   • Resetar completamente o sistema");
  console.log("");
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Digite "CONFIRMAR" para prosseguir: ', (resposta) => {
    rl.close();
    
    if (resposta === 'CONFIRMAR') {
      // Limpar contadores
      userController.contadores.clear();
      
      // Limpar bloqueios
      userController.bloqueados.clear();
      
      // Salvar dados
      userController.salvarDados();
      
      console.log("✅ Todos os dados foram limpos com sucesso!");
    } else {
      console.log("❌ Operação cancelada.");
    }
  });
}

// Verificar argumentos da linha de comando
const comando = process.argv[2];
const parametro = process.argv[3];

switch (comando) {
  case 'estatisticas':
    mostrarEstatisticas();
    break;
  case 'contadores':
    listarContadoresAltos();
    break;
  case 'bloqueados':
    listarBloqueados();
    break;
  case 'desbloquear':
    desbloquearUsuario(parametro);
    break;
  case 'resetar':
    resetarContador(parametro);
    break;
  case 'detalhes':
    mostrarDetalhesUsuario(parametro);
    break;
  case 'simular':
    simularBloqueio(parametro);
    break;
  case 'limpar':
    limparTodosDados();
    break;
  default:
    console.log("👥 MONITOR DE USUÁRIOS - Comandos disponíveis:");
    console.log("• node monitor-usuarios.js estatisticas - Estatísticas gerais");
    console.log("• node monitor-usuarios.js contadores   - Usuários com contadores altos");
    console.log("• node monitor-usuarios.js bloqueados   - Usuários bloqueados");
    console.log("• node monitor-usuarios.js detalhes <telefone> - Detalhes de um usuário");
    console.log("• node monitor-usuarios.js desbloquear <telefone> - Desbloquear usuário");
    console.log("• node monitor-usuarios.js resetar <telefone> - Resetar contador");
    console.log("• node monitor-usuarios.js simular <telefone> - Simular bloqueio");
    console.log("• node monitor-usuarios.js limpar - Limpar todos os dados");
    break;
} 