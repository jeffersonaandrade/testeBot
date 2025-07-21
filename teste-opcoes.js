const OpcoesController = require('./opcoes-controller');
const config = require('./config');

// Instanciar controlador
const opcoesController = new OpcoesController();

console.log("🧪 TESTE DO SISTEMA DE OPÇÕES\n");

// Função para simular interação
async function simularInteracao(telefone, mensagem, descricao) {
  console.log(`📱 [${telefone}] ${descricao}`);
  console.log(`   Mensagem: "${mensagem}"`);
  
  const resultado = await opcoesController.processarMensagem(telefone, mensagem);
  
  console.log(`   Resultado:`);
  console.log(`   - Mostrar menu: ${resultado.mostrarMenu || false}`);
  console.log(`   - Opção selecionada: ${resultado.opcaoSelecionada || false}`);
  console.log(`   - Usar IA: ${resultado.usarIA || false}`);
  
  if (resultado.intencao) {
    console.log(`   - Intenção: ${resultado.intencao}`);
  }
  
  if (resultado.resposta) {
    console.log(`   - Resposta: ${resultado.resposta}`);
  }
  
  console.log("");
  return resultado;
}

// Função para mostrar menu
function mostrarMenu(tipo = 'principal') {
  console.log(`📋 MENU ${tipo.toUpperCase()}:`);
  const texto = opcoesController.gerarTextoMenu(tipo);
  console.log(texto);
  console.log("");
}

// Teste 1: Primeira interação
console.log("=".repeat(60));
console.log("TESTE 1: PRIMEIRA INTERAÇÃO");
console.log("=".repeat(60));

await simularInteracao('5511999999999', 'Oi', 'Primeira mensagem do usuário');

// Teste 2: Seleção de opção
console.log("=".repeat(60));
console.log("TESTE 2: SELEÇÃO DE OPÇÃO");
console.log("=".repeat(60));

await simularInteracao('5511999999999', '1', 'Usuário escolhe opção 1 (Produtos)');

// Teste 3: Comando de menu
console.log("=".repeat(60));
console.log("TESTE 3: COMANDO DE MENU");
console.log("=".repeat(60));

await simularInteracao('5511999999999', 'menu', 'Usuário pede para ver menu');

// Teste 4: Texto livre
console.log("=".repeat(60));
console.log("TESTE 4: TEXTO LIVRE");
console.log("=".repeat(60));

await simularInteracao('5511999999999', 'Quero saber mais sobre vocês', 'Texto livre do usuário');

// Teste 5: Opção de compra
console.log("=".repeat(60));
console.log("TESTE 5: OPÇÃO DE COMPRA");
console.log("=".repeat(60));

await simularInteracao('5511999999999', '3', 'Usuário escolhe comprar agora');

// Teste 6: Opção inválida
console.log("=".repeat(60));
console.log("TESTE 6: OPÇÃO INVÁLIDA");
console.log("=".repeat(60));

await simularInteracao('5511999999999', '99', 'Usuário digita opção inválida');

// Mostrar menus disponíveis
console.log("=".repeat(60));
console.log("MENUS DISPONÍVEIS");
console.log("=".repeat(60));

mostrarMenu('principal');
mostrarMenu('produtos');
mostrarMenu('orcamento');

// Mostrar estatísticas
console.log("=".repeat(60));
console.log("ESTATÍSTICAS");
console.log("=".repeat(60));

const estatisticas = opcoesController.getEstatisticas();
console.log(`Sessões ativas: ${estatisticas.sessoesAtivas}`);
console.log(`Sistema ativo: ${estatisticas.sistemaAtivo}`);
console.log(`Usar IA como fallback: ${estatisticas.usarIAFallback}`);
console.log(`Timeout do menu: ${estatisticas.timeoutMenu}`);

// Testar respostas
console.log("=".repeat(60));
console.log("EXEMPLOS DE RESPOSTAS");
console.log("=".repeat(60));

const respostas = [
  'resposta_interessado_produtos',
  'resposta_interessado_orcamento', 
  'resposta_comprador',
  'resposta_curioso',
  'resposta_atendente_humano'
];

respostas.forEach(resposta => {
  console.log(`📝 ${resposta}:`);
  const texto = opcoesController.obterRespostaOpcao(resposta);
  console.log(texto.substring(0, 200) + '...');
  console.log("");
});

console.log("✅ Teste concluído!"); 