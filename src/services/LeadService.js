const { logger } = require('../utils/logger');
const { FileUtils } = require('../utils/file');

class LeadService {
  constructor(config) {
    this.config = config;
    this.arquivoLeads = config.bot.arquivoLeads;
  }

  salvarLead(lead) {
    if (!this.config.bot.salvarLeads) return;

    const dados = {
      timestamp: new Date().toISOString(),
      telefone: lead.telefone,
      nome: lead.nome,
      intencao: lead.intencao,
      mensagem: lead.mensagem
    };

    if (FileUtils.salvarCSV([dados], this.arquivoLeads)) {
      logger.info('Lead salvo', { nome: lead.nome, intencao: lead.intencao });
    } else {
      logger.error('Erro ao salvar lead', { nome: lead.nome });
    }
  }

  obterLeads() {
    try {
      const csvPath = require('path').join(__dirname, '..', '..', this.arquivoLeads);
      if (!require('fs').existsSync(csvPath)) {
        return [];
      }

      const fs = require('fs');
      const csv = fs.readFileSync(csvPath, 'utf8');
      const linhas = csv.split('\n').filter(linha => linha.trim());
      
      if (linhas.length <= 1) return []; // Apenas cabeçalho

      const cabecalho = linhas[0].split(',');
      const leads = [];

      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(',');
        const lead = {};
        
        cabecalho.forEach((campo, index) => {
          lead[campo] = valores[index] || '';
        });
        
        leads.push(lead);
      }

      return leads;
    } catch (error) {
      logger.error('Erro ao obter leads', { error: error.message });
      return [];
    }
  }

  obterLeadsPorIntencao(intencao) {
    const leads = this.obterLeads();
    return leads.filter(lead => lead.intencao === intencao);
  }

  obterLeadsPorPeriodo(dataInicio, dataFim) {
    const leads = this.obterLeads();
    return leads.filter(lead => {
      const dataLead = new Date(lead.timestamp);
      return dataLead >= dataInicio && dataLead <= dataFim;
    });
  }

  obterEstatisticas() {
    const leads = this.obterLeads();
    const estatisticas = {
      total: leads.length,
      porIntencao: {},
      porDia: {},
      ultimos7Dias: 0,
      ultimos30Dias: 0
    };

    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

    leads.forEach(lead => {
      // Por intenção
      estatisticas.porIntencao[lead.intencao] = (estatisticas.porIntencao[lead.intencao] || 0) + 1;

      // Por dia
      const data = new Date(lead.timestamp).toDateString();
      estatisticas.porDia[data] = (estatisticas.porDia[data] || 0) + 1;

      // Últimos períodos
      const dataLead = new Date(lead.timestamp);
      if (dataLead >= seteDiasAtras) {
        estatisticas.ultimos7Dias++;
      }
      if (dataLead >= trintaDiasAtras) {
        estatisticas.ultimos30Dias++;
      }
    });

    return estatisticas;
  }

  limparLeadsAntigos(dias = 90) {
    try {
      const leads = this.obterLeads();
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);

      const leadsRecentes = leads.filter(lead => {
        const dataLead = new Date(lead.timestamp);
        return dataLead >= dataLimite;
      });

      // Reescrever arquivo apenas com leads recentes
      if (leadsRecentes.length < leads.length) {
        const csvPath = require('path').join(__dirname, '..', '..', this.arquivoLeads);
        const fs = require('fs');
        
        if (leadsRecentes.length > 0) {
          const cabecalho = Object.keys(leadsRecentes[0]).join(',');
          const linhas = leadsRecentes.map(lead => 
            Object.values(lead).join(',')
          );
          const novoCSV = [cabecalho, ...linhas].join('\n');
          fs.writeFileSync(csvPath, novoCSV);
        } else {
          fs.writeFileSync(csvPath, '');
        }

        const removidos = leads.length - leadsRecentes.length;
        logger.info('Leads antigos removidos', { 
          removidos, 
          mantidos: leadsRecentes.length,
          diasLimite: dias 
        });
        
        return removidos;
      }

      return 0;
    } catch (error) {
      logger.error('Erro ao limpar leads antigos', { error: error.message });
      return 0;
    }
  }
}

module.exports = LeadService; 