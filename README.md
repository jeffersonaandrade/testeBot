# 🤖 Bot de Pré-Atendimento WhatsApp

Sistema inteligente de pré-atendimento que filtra leads e só transfere para atendimento humano quem tem real intenção de compra.

## 🎯 **Funcionalidades**

### **Classificação Automática de Intenção**
- **🔍 CURIOSO**: Pessoas fazendo perguntas gerais
- **💡 INTERESSADO**: Pessoas interessadas em produtos/serviços  
- **💰 COMPRADOR**: Pessoas com intenção clara de compra

### **Respostas Inteligentes**
- Respostas personalizadas baseadas na intenção
- Informações sobre produtos/serviços
- Coleta de dados de leads qualificados

### **Gestão de Leads**
- Salva leads qualificados em arquivo CSV
- Registra timestamp, telefone, intenção e mensagem
- Filtra apenas leads com potencial de conversão

## 🚀 **Como Usar**

### **1. Configuração Inicial**
```bash
# Instalar dependências
npm install

# Configurar variável de ambiente
echo "GROQ_API_KEY=sua_chave_aqui" > .env
```

### **2. Personalizar Configurações**
Edite o arquivo `config.js`:
- **Empresa**: Nome, telefone, email, horário
- **API**: Rate limits, modelo, timeout
- **IA**: Prompts, temperatura, tokens
- **Bot**: Comportamento, arquivos, logs
- **Respostas**: Pré-definidas por tipo de intenção

### **3. Executar o Bot**
```bash
node index.js
```

### **4. Conectar WhatsApp**
- Escaneie o QR Code que aparecerá no terminal
- O bot ficará online e monitorando mensagens

## 📊 **Fluxo de Funcionamento**

```
👤 Cliente envia mensagem
    ↓
🤖 Bot classifica intenção com IA
    ↓
📋 Gera resposta apropriada
    ↓
💾 Salva lead (se qualificado)
    ↓
📤 Responde automaticamente
    ↓
🔄 Notifica transferência (se comprador)
```

## 📁 **Estrutura do Projeto**

### **Arquivos Principais**
- **`index.js`** - Arquivo principal do bot
- **`config.js`** - Todas as configurações centralizadas
- **`utils.js`** - Utilitários e funções auxiliares
- **`api-controller.js`** - Controlador da API Groq
- **`monitor-api.js`** - Monitor de uso da API

### **Arquivos Gerados**
- **`leads.csv`** - Leads qualificados
- **`controle-api.json`** - Controle de rate limits
- **`bot-logs.txt`** - Logs do sistema

### **Exemplo de leads.csv**
```csv
timestamp,telefone,nome,intencao,mensagem
2024-01-15T10:30:00.000Z,5511999999999,João Silva,COMPRADOR,Quero saber o preço do produto
```

## ⚙️ **Configurações Avançadas**

### **Personalizar Respostas**
No arquivo `config.js`, seção `respostas`:
- Adicionar novas respostas por tipo de intenção
- Personalizar mensagens da empresa
- Configurar respostas de limite excedido

### **Ajustar Classificação**
No arquivo `config.js`, seção `palavrasChave`:
- Adicionar novas palavras-chave
- Modificar critérios de classificação local
- Ajustar prompts da IA

### **Configurar IA**
No arquivo `config.js`, seção `ia`:
- Modificar prompts do sistema
- Ajustar temperatura e tokens
- Personalizar comportamento da IA

## 🔧 **Tecnologias Utilizadas**

- **Node.js** - Runtime JavaScript
- **whatsapp-web.js** - Integração WhatsApp
- **Groq API** - Inteligência Artificial
- **Puppeteer** - Automação navegador
- **Axios** - Requisições HTTP

## 📈 **Benefícios**

### **Para o Negócio**
- ✅ Reduz carga de atendimento manual
- ✅ Filtra leads qualificados
- ✅ Atende 24/7 automaticamente
- ✅ Coleta dados estruturados
- ✅ Melhora experiência do cliente

### **Para o Cliente**
- ✅ Resposta imediata
- ✅ Informações rápidas
- ✅ Atendimento personalizado
- ✅ Transição suave para humano

## 🛠️ **Manutenção**

### **Monitoramento**
- Verifique logs no terminal
- Monitore arquivo `leads.csv`
- Acompanhe performance da IA
- **Controle uso da API**: `node monitor-api.js status`

### **Controle de API Groq**
O sistema respeita os **rate limits oficiais** da Groq para `llama3-70b-8192`:

#### **📊 Rate Limits Oficiais**
- **RPM**: 30 requests por minuto
- **RPD**: 14.400 requests por dia  
- **TPM**: 6.000 tokens por minuto
- **TPD**: 500.000 tokens por dia
- Reset automático por minuto/dia

#### **🔄 Modo de Funcionamento**
- **Com créditos**: Usa IA para classificação e respostas
- **Sem créditos**: Usa respostas pré-definidas + palavras-chave
- **Fallback**: Se API falhar, usa sistema local
- **Backoff**: Aguarda automaticamente quando próximo do limite

#### **📈 Monitoramento**
```bash
# Ver status atual
node monitor-api.js status

# Resetar contadores
node monitor-api.js reset

# Ver rate limits oficiais
node monitor-api.js limits

# Ver configurações atuais
node monitor-api.js config

# Como ajustar limites
node monitor-api.js ajustar
```

### **⚡ Otimizações Implementadas**

O sistema inclui **otimizações avançadas** para reduzir o uso de tokens e melhorar a performance:

#### **📦 Sistema de Cache**
- **Cache inteligente** de respostas e classificações
- **Expiração automática** (1 hora por padrão)
- **Redução de 30-50%** nas chamadas à API
- **Respostas instantâneas** para perguntas repetidas

#### **✂️ Otimização de Mensagens**
- **Truncamento inteligente** de mensagens longas
- **Remoção de palavras comuns** desnecessárias
- **Limite de 500 caracteres** por mensagem
- **Economia de 20-40%** em tokens

#### **📝 Agrupamento de Mensagens**
- **Combina múltiplas mensagens** em uma única chamada
- **Tempo de agrupamento** configurável (30s padrão)
- **Máximo 5 mensagens** por grupo
- **Confirmação rápida** para o usuário

#### **📊 Monitor de Otimizações**
```bash
# Ver estatísticas do cache
node monitor-otimizacao.js cache

# Ver configurações de otimização
node monitor-otimizacao.js otimizacoes

# Testar otimização de mensagens
node monitor-otimizacao.js teste

# Ver estatísticas de agrupamento
node monitor-otimizacao.js agrupamento

# Limpar cache
node monitor-otimizacao.js limpar

# Ver economia estimada de tokens
node monitor-otimizacao.js economia
```

#### **💰 Economia Estimada**
- **Sem otimização**: ~10.000 tokens/dia
- **Com otimizações**: ~3.000 tokens/dia
- **Economia total**: ~70% de redução
- **Margem de segurança**: 94% do limite TPD

### **👥 Controle de Usuários**

O sistema inclui **controle inteligente de usuários** para otimizar o atendimento:

#### **📊 Sistema de Contadores**
- **Limite configurável** de respostas por usuário (padrão: 3)
- **Reset diário automático** dos contadores
- **Controle de spam** e uso excessivo
- **Mensagens personalizadas** quando limite é atingido

#### **🚫 Bloqueio Temporário**
- **Bloqueio automático** após transferência para humano
- **Tempo configurável** de bloqueio (padrão: 1 hora)
- **Prevenção de respostas automáticas** desnecessárias
- **Desbloqueio automático** após expiração

#### **📈 Monitor de Usuários**
```bash
# Ver estatísticas gerais
node monitor-usuarios.js estatisticas

# Ver usuários com contadores altos
node monitor-usuarios.js contadores

# Ver usuários bloqueados
node monitor-usuarios.js bloqueados

# Ver detalhes de um usuário
node monitor-usuarios.js detalhes <telefone>

# Desbloquear usuário
node monitor-usuarios.js desbloquear <telefone>

# Resetar contador de usuário
node monitor-usuarios.js resetar <telefone>

# Simular bloqueio (teste)
node monitor-usuarios.js simular <telefone>

# Limpar todos os dados
node monitor-usuarios.js limpar
```

#### **🎯 Benefícios do Controle**
- **Reduz uso desnecessário** da API
- **Filtra usuários persistentes**
- **Melhora qualidade** do atendimento
- **Economia adicional** de tokens
- **Controle total** sobre interações

### **Atualizações**
- Mantenha dependências atualizadas
- Revise configurações periodicamente
- Ajuste respostas conforme feedback
- Monitore uso da API regularmente

## 📞 **Suporte**

Para dúvidas ou problemas:
- Verifique logs de erro
- Confirme configuração da API Groq
- Valide arquivo `.env`

---

**Desenvolvido para otimizar pré-atendimento e qualificar leads automaticamente! 🚀** 