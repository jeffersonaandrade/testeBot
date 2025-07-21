const fs = require("fs");
const path = require("path");

class FileUtils {
  static salvarCSV(dados, arquivo) {
    try {
      const csvPath = path.join(__dirname, '..', '..', arquivo);
      
      // Criar cabeçalho se arquivo não existir
      if (!fs.existsSync(csvPath)) {
        const cabecalho = Object.keys(dados[0]).join(',') + '\n';
        fs.writeFileSync(csvPath, cabecalho);
      }
      
      // Adicionar linha
      const linha = Object.values(dados).join(',') + '\n';
      fs.appendFileSync(csvPath, linha);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar CSV', { arquivo, error: error.message });
      return false;
    }
  }

  static carregarJSON(arquivo) {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.error('Erro ao carregar JSON', { arquivo, error: error.message });
    }
    return null;
  }

  static salvarJSON(dados, arquivo) {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      fs.writeFileSync(filePath, JSON.stringify(dados, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao salvar JSON', { arquivo, error: error.message });
      return false;
    }
  }

  static existeArquivo(arquivo) {
    const filePath = path.join(__dirname, '..', '..', arquivo);
    return fs.existsSync(filePath);
  }

  static criarDiretorioSeNaoExiste(diretorio) {
    const dirPath = path.join(__dirname, '..', '..', diretorio);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static listarArquivos(diretorio, extensao = null) {
    try {
      const dirPath = path.join(__dirname, '..', '..', diretorio);
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const arquivos = fs.readdirSync(dirPath);
      
      if (extensao) {
        return arquivos.filter(arquivo => arquivo.endsWith(extensao));
      }
      
      return arquivos;
    } catch (error) {
      console.error('Erro ao listar arquivos', { diretorio, error: error.message });
      return [];
    }
  }

  static obterTamanhoArquivo(arquivo) {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      console.error('Erro ao obter tamanho do arquivo', { arquivo, error: error.message });
      return 0;
    }
  }

  static obterDataModificacao(arquivo) {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.mtime;
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter data de modificação', { arquivo, error: error.message });
      return null;
    }
  }

  static backupArquivo(arquivo, sufixo = '.backup') {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      const backupPath = filePath + sufixo;
      
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao fazer backup do arquivo', { arquivo, error: error.message });
      return false;
    }
  }

  static removerArquivo(arquivo) {
    try {
      const filePath = path.join(__dirname, '..', '..', arquivo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao remover arquivo', { arquivo, error: error.message });
      return false;
    }
  }
}

module.exports = { FileUtils }; 