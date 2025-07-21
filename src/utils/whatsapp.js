class WhatsAppUtils {
  static extrairNomeContato(from) {
    return from.split('@')[0] || 'Contato';
  }

  static extrairTelefone(from) {
    return from.replace('@c.us', '');
  }

  static formatarMensagem(mensagem, dados = {}) {
    // Substituir placeholders por dados reais
    return mensagem
      .replace('{nome_empresa}', dados.nome_empresa || 'Sua Empresa')
      .replace('{telefone_empresa}', dados.telefone_empresa || '(11) 99999-9999')
      .replace('{email_empresa}', dados.email_empresa || 'contato@suaempresa.com')
      .replace('{horario_atendimento}', dados.horario_atendimento || 'Segunda a Sexta, 8h às 18h')
      .replace('{website}', dados.website || 'https://suaempresa.com');
  }

  static async enviarMensagemComDelay(client, to, mensagem, delay = 2000) {
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      await client.sendMessage(to, mensagem);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem com delay', { to, error: error.message });
      return false;
    }
  }

  static validarTelefone(telefone) {
    // Remove caracteres especiais e valida formato brasileiro
    const limpo = telefone.replace(/\D/g, '');
    return limpo.length >= 10 && limpo.length <= 11;
  }

  static formatarTelefone(telefone) {
    const limpo = telefone.replace(/\D/g, '');
    if (limpo.length === 11) {
      return `(${limpo.slice(0,2)}) ${limpo.slice(2,7)}-${limpo.slice(7)}`;
    }
    return telefone;
  }

  static sanitizarMensagem(mensagem) {
    return mensagem
      .trim()
      .replace(/[<>]/g, '') // Remove caracteres potencialmente perigosos
      .substring(0, 1000); // Limita tamanho
  }

  static isMensagemValida(mensagem) {
    return mensagem && mensagem.trim().length > 0 && mensagem.length <= 1000;
  }
}

module.exports = { WhatsAppUtils }; 