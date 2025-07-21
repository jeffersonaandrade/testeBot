require("dotenv").config();
const axios = require("axios");

// Função de teste da classificação
async function testarClassificacao(mensagens) {
  console.log("🧪 TESTANDO CLASSIFICAÇÃO DE INTENÇÕES\n");
  
  for (const mensagem of mensagens) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content: `Você é um classificador especializado em intenção de compra. Analise a mensagem e responda APENAS com uma das opções:

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
            { role: "user", content: mensagem }
          ],
          temperature: 0.2,
          max_tokens: 20,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          timeout: 10000
        }
      );

      const classificacao = response.data.choices[0]?.message?.content?.trim();
      console.log(`📝 "${mensagem}" → 🎯 ${classificacao}`);
      
    } catch (error) {
      console.log(`❌ Erro ao classificar: "${mensagem}"`);
    }
  }
}

// Mensagens de teste
const mensagensTeste = [
  // CURIOSO
  "Oi, tudo bem?",
  "Que horas vocês abrem?",
  "Onde fica a loja?",
  "Bom dia!",
  
  // INTERESSADO
  "Como funciona o produto?",
  "Quais são os benefícios?",
  "Tem garantia?",
  "Pode me explicar melhor?",
  "O que está incluído?",
  
  // COMPRADOR
  "Qual o preço?",
  "Quero comprar",
  "Tem desconto?",
  "Como faço para pagar?",
  "Quero fazer um orçamento",
  "Formas de pagamento?"
];

// Executar teste
testarClassificacao(mensagensTeste); 