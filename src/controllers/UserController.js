const { FileUtils } = require('../utils/file');
const { Formatter } = require('../utils/optimization');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

class UserController {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.contadores = new Map(); // Contadores de respostas por usuário
    this.bloqueados = new Map(); // Usuários bloqueados temporariamente
    this.arquivoContadores = 'contadores-usuarios.json';
    this.arquivoBloqueados = config.controleUsuarios.bloqueioTransferencia.arquivoBloqueados;
    
    this.carregarDados();
    this.iniciarLimpezaAutomatica();
  }

  // Carregar dados salvos
  carregarDados() {
    try {
      // Carregar contadores
      if (fs.existsSync(this.arquivoContadores)) {
        const dados = JSON.parse(fs.readFileSync(this.arquivoContadores, 'utf8'));
        this.contadores = new Map(dados);
        this.logger.info('Contadores de usuários carregados', { total: this.contadores.size });
      }

      // Carregar bloqueados
      if (fs.existsSync(this.arquivoBloqueados)) {
        const dados = JSON.parse(fs.readFileSync(this.arquivoBloqueados, 'utf8'));
        this.bloqueados = new Map(dados);
        this.logger.info('Usuários bloqueados carregados', { total: this.bloqueados.size });
      }
    } catch (error) {
      this.logger.error('Erro ao carregar dados de usuários', { error: error.message });
    }
  }

  // Salvar dados
  salvarDados() {
    try {
      // Salvar contadores
      const dadosContadores = Array.from(this.contadores.entries());
      fs.writeFileSync(this.arquivoContadores, JSON.stringify(dadosContadores, null, 2));

      // Salvar bloqueados
      const dadosBloqueados = Array.from(this.bloqueados.entries());
      fs.writeFileSync(this.arquivoBloqueados, JSON.stringify(dadosBloqueados, null, 2));
    } catch (error) {
      this.logger.error('Erro ao salvar dados de usuários', { error: error.message });
    }
  }

  // Verificar se usuário pode receber resposta
  podeReceberResposta(telefone, intencao = null) {
    // 1. Verificar se está bloqueado
    if (this.isBloqueado(telefone)) {
      this.logger.info('Usuário bloqueado tentou enviar mensagem', { telefone });
      return {
        pode: false,
        motivo: 'bloqueado',
        tempoRestante: this.getTempoRestanteBloqueio(telefone)
      };
    }

    // 2. Verificar limite de respostas
    if (this.config.controleUsuarios.numeroRespostas.ativo) {
      const contador = this.getContadorRespostas(telefone);
      const maxRespostas = this.config.controleUsuarios.numeroRespostas.maxRespostas;

      // Lógica inteligente: permitir mais respostas se for INTERESSADO
      const limiteEfetivo = (intencao === 'INTERESSADO' && 
                           this.config.controleUsuarios.numeroRespostas.permitirContinuarSeInteressado) 
                           ? maxRespostas + 2 : maxRespostas;

      if (contador >= limiteEfetivo) {
        this.logger.info('Usuário atingiu limite de respostas', { 
          telefone, 
          contador, 
          maxRespostas: limiteEfetivo,
          intencao 
        });
        return {
          pode: false,
          motivo: 'limite_respostas',
          contador,
          maxRespostas: limiteEfetivo
        };
      }
    }

    return { pode: true };
  }

  // Incrementar contador de respostas
  incrementarContador(telefone) {
    if (!this.config.controleUsuarios.numeroRespostas.ativo) return;

    const agora = Date.now();
    const contadorAtual = this.contadores.get(telefone) || {
      contador: 0,
      ultimaResposta: agora,
      data: new Date().toDateString()
    };

    // Reset diário se configurado
    if (this.config.controleUsuarios.numeroRespostas.resetDiario) {
      const hoje = new Date().toDateString();
      if (contadorAtual.data !== hoje) {
        contadorAtual.contador = 0;
        contadorAtual.data = hoje;
      }
    }

    contadorAtual.contador++;
    contadorAtual.ultimaResposta = agora;

    this.contadores.set(telefone, contadorAtual);
    this.salvarDados();

    this.logger.info('Contador de respostas incrementado', { 
      telefone, 
      contador: contadorAtual.contador,
      maxRespostas: this.config.controleUsuarios.numeroRespostas.maxRespostas
    });
  }

  // Obter contador de respostas
  getContadorRespostas(telefone) {
    const contador = this.contadores.get(telefone);
    if (!contador) return 0;

    // Verificar se precisa reset diário
    if (this.config.controleUsuarios.numeroRespostas.resetDiario) {
      const hoje = new Date().toDateString();
      if (contador.data !== hoje) {
        return 0;
      }
    }

    return contador.contador;
  }

  // Bloquear usuário após transferência
  bloquearUsuario(telefone, motivo = 'transferencia') {
    if (!this.config.controleUsuarios.bloqueioTransferencia.ativo) return;

    const tempoBloqueio = this.config.controleUsuarios.bloqueioTransferencia.tempoBloqueio;
    const bloqueio = {
      telefone,
      motivo,
      timestamp: Date.now(),
      tempoBloqueio,
      expiraEm: Date.now() + tempoBloqueio
    };

    this.bloqueados.set(telefone, bloqueio);
    this.salvarDados();

    this.logger.info('Usuário bloqueado após transferência', { 
      telefone, 
      motivo,
      expiraEm: new Date(bloqueio.expiraEm).toLocaleString()
    });
  }

  // Verificar se usuário está bloqueado
  isBloqueado(telefone) {
    const bloqueio = this.bloqueados.get(telefone);
    if (!bloqueio) return false;

    // Verificar se expirou
    if (Date.now() > bloqueio.expiraEm) {
      this.bloqueados.delete(telefone);
      this.salvarDados();
      this.logger.info('Bloqueio expirado automaticamente', { telefone });
      return false;
    }

    return true;
  }

  // Obter tempo restante de bloqueio
  getTempoRestanteBloqueio(telefone) {
    const bloqueio = this.bloqueados.get(telefone);
    if (!bloqueio) return 0;

    const tempoRestante = bloqueio.expiraEm - Date.now();
    return Math.max(0, tempoRestante);
  }

  // Desbloquear usuário manualmente
  desbloquearUsuario(telefone) {
    if (this.bloqueados.has(telefone)) {
      this.bloqueados.delete(telefone);
      this.salvarDados();
      this.logger.info('Usuário desbloqueado manualmente', { telefone });
      return true;
    }
    return false;
  }

  // Resetar contador de usuário
  resetarContador(telefone) {
    if (this.contadores.has(telefone)) {
      this.contadores.delete(telefone);
      this.salvarDados();
      this.logger.info('Contador de usuário resetado', { telefone });
      return true;
    }
    return false;
  }

  // Obter mensagem de limite atingido
  getMensagemLimite(telefone) {
    const contador = this.getContadorRespostas(telefone);
    const maxRespostas = this.config.controleUsuarios.numeroRespostas.maxRespostas;
    
    return this.config.controleUsuarios.numeroRespostas.mensagemLimite
      .replace('{telefone_empresa}', this.config.empresa.telefone)
      .replace('{contador}', contador)
      .replace('{max_respostas}', maxRespostas);
  }

  // Obter mensagem de bloqueio
  getMensagemBloqueio(telefone) {
    const tempoRestante = this.getTempoRestanteBloqueio(telefone);
    const diasRestantes = Math.ceil(tempoRestante / (24 * 60 * 60 * 1000));
    const horasRestantes = Math.ceil((tempoRestante % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    let tempoFormatado;
    if (diasRestantes > 1) {
      tempoFormatado = `${diasRestantes} dias`;
    } else if (diasRestantes === 1) {
      tempoFormatado = `1 dia e ${horasRestantes} horas`;
    } else {
      tempoFormatado = `${horasRestantes} horas`;
    }
    
    return this.config.controleUsuarios.bloqueioTransferencia.mensagemBloqueio
      .replace('{tempo_bloqueio}', tempoFormatado)
      .replace('{telefone_empresa}', this.config.empresa.telefone);
  }

  // Limpeza automática de dados antigos
  iniciarLimpezaAutomatica() {
    setInterval(() => {
      this.limparDadosAntigos();
    }, 3600000); // A cada hora
  }

  // Limpar dados antigos
  limparDadosAntigos() {
    const agora = Date.now();
    let contadoresRemovidos = 0;
    let bloqueiosRemovidos = 0;

    // Limpar contadores antigos (mais de 7 dias)
    for (const [telefone, contador] of this.contadores.entries()) {
      if (agora - contador.ultimaResposta > 7 * 24 * 3600000) {
        this.contadores.delete(telefone);
        contadoresRemovidos++;
      }
    }

    // Limpar bloqueios expirados
    for (const [telefone, bloqueio] of this.bloqueados.entries()) {
      if (agora > bloqueio.expiraEm) {
        this.bloqueados.delete(telefone);
        bloqueiosRemovidos++;
      }
    }

    if (contadoresRemovidos > 0 || bloqueiosRemovidos > 0) {
      this.salvarDados();
      this.logger.info('Limpeza automática executada', { 
        contadoresRemovidos, 
        bloqueiosRemovidos 
      });
    }
  }

  // Obter estatísticas
  getEstatisticas() {
    const agora = Date.now();
    let contadoresAtivos = 0;
    let bloqueiosAtivos = 0;

    // Contar contadores ativos (últimas 24h)
    for (const [telefone, contador] of this.contadores.entries()) {
      if (agora - contador.ultimaResposta < 24 * 3600000) {
        contadoresAtivos++;
      }
    }

    // Contar bloqueios ativos
    for (const [telefone, bloqueio] of this.bloqueados.entries()) {
      if (agora < bloqueio.expiraEm) {
        bloqueiosAtivos++;
      }
    }

    return {
      totalContadores: this.contadores.size,
      contadoresAtivos,
      totalBloqueios: this.bloqueados.size,
      bloqueiosAtivos,
      maxRespostas: this.config.controleUsuarios.numeroRespostas.maxRespostas,
      tempoBloqueio: this.config.controleUsuarios.bloqueioTransferencia.tempoBloqueio / 60000 + ' minutos'
    };
  }

  // Listar usuários com contadores altos
  getUsuariosComContadorAlto() {
    const usuarios = [];
    const maxRespostas = this.config.controleUsuarios.numeroRespostas.maxRespostas;

    for (const [telefone, contador] of this.contadores.entries()) {
      if (contador.contador >= maxRespostas * 0.8) { // 80% do limite
        usuarios.push({
          telefone,
          contador: contador.contador,
          maxRespostas,
          ultimaResposta: new Date(contador.ultimaResposta).toLocaleString()
        });
      }
    }

    return usuarios.sort((a, b) => b.contador - a.contador);
  }

  // Listar usuários bloqueados
  getUsuariosBloqueados() {
    const usuarios = [];
    const agora = Date.now();

    for (const [telefone, bloqueio] of this.bloqueados.entries()) {
      if (agora < bloqueio.expiraEm) {
        const tempoRestante = Math.ceil((bloqueio.expiraEm - agora) / 60000);
        usuarios.push({
          telefone,
          motivo: bloqueio.motivo,
          bloqueadoEm: new Date(bloqueio.timestamp).toLocaleString(),
          expiraEm: new Date(bloqueio.expiraEm).toLocaleString(),
          tempoRestante: `${tempoRestante} minutos`
        });
      }
    }

    return usuarios.sort((a, b) => new Date(a.expiraEm) - new Date(b.expiraEm));
  }
}

module.exports = UserController; 