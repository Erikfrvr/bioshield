// Gerador de QR Code proprio do BioShield, sem CDN e sem biblioteca externa.
// Modo byte com UTF 8, correcao de erro configuravel (L, M, Q, H) e versoes 1 a 10.
// Expoe BioShieldQR com gerarMatriz, desenharNoCanvas, gerarSVG e gerarPNG.

(function (escopo) {
  "use strict";

  var NIVEIS = { L: 0, M: 1, Q: 2, H: 3 };

  var BLOCOS = {
    1: [[7, 1, 19, 0, 0], [10, 1, 16, 0, 0], [13, 1, 13, 0, 0], [17, 1, 9, 0, 0]],
    2: [[10, 1, 34, 0, 0], [16, 1, 28, 0, 0], [22, 1, 22, 0, 0], [28, 1, 16, 0, 0]],
    3: [[15, 1, 55, 0, 0], [26, 1, 44, 0, 0], [18, 2, 17, 0, 0], [22, 2, 13, 0, 0]],
    4: [[20, 1, 80, 0, 0], [18, 2, 32, 0, 0], [26, 2, 24, 0, 0], [16, 4, 9, 0, 0]],
    5: [[26, 1, 108, 0, 0], [24, 2, 43, 0, 0], [18, 2, 15, 2, 16], [22, 2, 11, 2, 12]],
    6: [[18, 2, 68, 0, 0], [16, 4, 27, 0, 0], [24, 4, 19, 0, 0], [28, 4, 15, 0, 0]],
    7: [[20, 2, 78, 0, 0], [18, 4, 31, 0, 0], [18, 2, 14, 4, 15], [26, 4, 13, 1, 14]],
    8: [[24, 2, 97, 0, 0], [22, 2, 38, 2, 39], [22, 4, 18, 2, 19], [26, 4, 14, 2, 15]],
    9: [[30, 2, 116, 0, 0], [22, 3, 36, 2, 37], [20, 4, 16, 4, 17], [24, 4, 12, 4, 13]],
    10: [[18, 2, 68, 2, 69], [26, 4, 43, 1, 44], [24, 6, 19, 2, 20], [28, 6, 15, 2, 16]]
  };

  var ALINHAMENTO = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  var expTabela = new Uint8Array(512);
  var logTabela = new Uint8Array(256);

  (function montarTabelasGalois() {
    var valor = 1;
    for (var i = 0; i < 255; i++) {
      expTabela[i] = valor;
      logTabela[valor] = i;
      valor = valor << 1;
      if (valor & 0x100) valor ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) expTabela[j] = expTabela[j - 255];
  })();

  function multiplicar(a, b) {
    if (a === 0 || b === 0) return 0;
    return expTabela[logTabela[a] + logTabela[b]];
  }

  function polinomioGerador(grau) {
    var poli = [1];
    for (var i = 0; i < grau; i++) {
      var novo = new Array(poli.length + 1).fill(0);
      for (var j = 0; j < poli.length; j++) {
        novo[j] ^= multiplicar(poli[j], 1);
        novo[j + 1] ^= multiplicar(poli[j], expTabela[i]);
      }
      poli = novo;
    }
    return poli;
  }

  function calcularCorrecao(dados, quantidade) {
    var gerador = polinomioGerador(quantidade);
    var resto = dados.slice().concat(new Array(quantidade).fill(0));
    for (var i = 0; i < dados.length; i++) {
      var fator = resto[i];
      if (fator === 0) continue;
      for (var j = 0; j < gerador.length; j++) {
        resto[i + j] ^= multiplicar(gerador[j], fator);
      }
    }
    return resto.slice(dados.length);
  }

  function textoParaBytes(texto) {
    var codificado = unescape(encodeURIComponent(texto));
    var bytes = [];
    for (var i = 0; i < codificado.length; i++) bytes.push(codificado.charCodeAt(i) & 0xff);
    return bytes;
  }

  function capacidadeDados(versao, nivel) {
    var linha = BLOCOS[versao][nivel];
    return linha[1] * linha[2] + linha[3] * linha[4];
  }

  function escolherVersao(totalBytes, nivel) {
    for (var versao = 1; versao <= 10; versao++) {
      var bitsContagem = versao < 10 ? 8 : 16;
      var bitsNecessarios = 4 + bitsContagem + totalBytes * 8;
      if (bitsNecessarios <= capacidadeDados(versao, nivel) * 8) return versao;
    }
    return null;
  }

  function montarBitsDados(bytes, versao, nivel) {
    var bits = [];
    function empurrar(valor, tamanho) {
      for (var i = tamanho - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
    }

    var bitsContagem = versao < 10 ? 8 : 16;
    empurrar(0b0100, 4);
    empurrar(bytes.length, bitsContagem);
    for (var i = 0; i < bytes.length; i++) empurrar(bytes[i], 8);

    var capacidadeBits = capacidadeDados(versao, nivel) * 8;
    var terminador = Math.min(4, capacidadeBits - bits.length);
    for (var t = 0; t < terminador; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var codigos = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
      codigos.push(byte);
    }

    var enchimento = [0xec, 0x11];
    var indice = 0;
    while (codigos.length < capacidadeDados(versao, nivel)) {
      codigos.push(enchimento[indice % 2]);
      indice++;
    }
    return codigos;
  }

  function intercalarCodigos(codigos, versao, nivel) {
    var linha = BLOCOS[versao][nivel];
    var correcaoPorBloco = linha[0];
    var grupos = [
      { blocos: linha[1], tamanho: linha[2] },
      { blocos: linha[3], tamanho: linha[4] }
    ];

    var blocosDados = [];
    var blocosCorrecao = [];
    var posicao = 0;

    grupos.forEach(function (grupo) {
      for (var i = 0; i < grupo.blocos; i++) {
        var pedaco = codigos.slice(posicao, posicao + grupo.tamanho);
        posicao += grupo.tamanho;
        blocosDados.push(pedaco);
        blocosCorrecao.push(calcularCorrecao(pedaco, correcaoPorBloco));
      }
    });

    var resultado = [];
    var maiorBloco = Math.max.apply(null, blocosDados.map(function (b) { return b.length; }));
    for (var coluna = 0; coluna < maiorBloco; coluna++) {
      for (var bloco = 0; bloco < blocosDados.length; bloco++) {
        if (coluna < blocosDados[bloco].length) resultado.push(blocosDados[bloco][coluna]);
      }
    }
    for (var c = 0; c < correcaoPorBloco; c++) {
      for (var d = 0; d < blocosCorrecao.length; d++) resultado.push(blocosCorrecao[d][c]);
    }
    return resultado;
  }

  function criarMatrizVazia(tamanho) {
    var matriz = [];
    for (var i = 0; i < tamanho; i++) matriz.push(new Array(tamanho).fill(null));
    return matriz;
  }

  function desenharLocalizadores(matriz, reservado) {
    var tamanho = matriz.length;
    var cantos = [[0, 0], [tamanho - 7, 0], [0, tamanho - 7]];

    cantos.forEach(function (canto) {
      var linhaBase = canto[1];
      var colunaBase = canto[0];
      for (var l = -1; l <= 7; l++) {
        for (var c = -1; c <= 7; c++) {
          var linha = linhaBase + l;
          var coluna = colunaBase + c;
          if (linha < 0 || linha >= tamanho || coluna < 0 || coluna >= tamanho) continue;
          var dentro = l >= 0 && l <= 6 && c >= 0 && c <= 6;
          var escuro = dentro && ((l === 0 || l === 6 || c === 0 || c === 6) ||
            (l >= 2 && l <= 4 && c >= 2 && c <= 4));
          matriz[linha][coluna] = escuro ? 1 : 0;
          reservado[linha][coluna] = true;
        }
      }
    });
  }

  function desenharAlinhamento(matriz, reservado, versao) {
    var centros = ALINHAMENTO[versao];
    var tamanho = matriz.length;
    for (var i = 0; i < centros.length; i++) {
      for (var j = 0; j < centros.length; j++) {
        var linhaCentro = centros[i];
        var colunaCentro = centros[j];
        if (reservado[linhaCentro] && reservado[linhaCentro][colunaCentro]) continue;
        for (var l = -2; l <= 2; l++) {
          for (var c = -2; c <= 2; c++) {
            var linha = linhaCentro + l;
            var coluna = colunaCentro + c;
            if (linha < 0 || linha >= tamanho || coluna < 0 || coluna >= tamanho) continue;
            var escuro = Math.max(Math.abs(l), Math.abs(c)) !== 1;
            matriz[linha][coluna] = escuro ? 1 : 0;
            reservado[linha][coluna] = true;
          }
        }
      }
    }
  }

  function desenharTemporizadores(matriz, reservado) {
    var tamanho = matriz.length;
    for (var i = 8; i < tamanho - 8; i++) {
      var valor = i % 2 === 0 ? 1 : 0;
      if (!reservado[6][i]) { matriz[6][i] = valor; reservado[6][i] = true; }
      if (!reservado[i][6]) { matriz[i][6] = valor; reservado[i][6] = true; }
    }
  }

  function reservarFormato(matriz, reservado, versao) {
    var tamanho = matriz.length;
    for (var i = 0; i <= 8; i++) {
      if (!reservado[8][i]) { reservado[8][i] = true; matriz[8][i] = 0; }
      if (!reservado[i][8]) { reservado[i][8] = true; matriz[i][8] = 0; }
    }
    for (var j = 0; j < 8; j++) {
      if (!reservado[8][tamanho - 1 - j]) { reservado[8][tamanho - 1 - j] = true; matriz[8][tamanho - 1 - j] = 0; }
      if (!reservado[tamanho - 1 - j][8]) { reservado[tamanho - 1 - j][8] = true; matriz[tamanho - 1 - j][8] = 0; }
    }
    matriz[tamanho - 8][8] = 1;
    reservado[tamanho - 8][8] = true;

    if (versao >= 7) {
      for (var l = 0; l < 6; l++) {
        for (var c = 0; c < 3; c++) {
          reservado[l][tamanho - 11 + c] = true;
          matriz[l][tamanho - 11 + c] = 0;
          reservado[tamanho - 11 + c][l] = true;
          matriz[tamanho - 11 + c][l] = 0;
        }
      }
    }
  }

  function colocarDados(matriz, reservado, codigos) {
    var tamanho = matriz.length;
    var bits = [];
    for (var i = 0; i < codigos.length; i++) {
      for (var b = 7; b >= 0; b--) bits.push((codigos[i] >>> b) & 1);
    }

    var indice = 0;
    var subindo = true;
    for (var coluna = tamanho - 1; coluna > 0; coluna -= 2) {
      if (coluna === 6) coluna = 5;
      for (var passo = 0; passo < tamanho; passo++) {
        var linha = subindo ? tamanho - 1 - passo : passo;
        for (var deslocamento = 0; deslocamento < 2; deslocamento++) {
          var colunaAtual = coluna - deslocamento;
          if (reservado[linha][colunaAtual]) continue;
          matriz[linha][colunaAtual] = indice < bits.length ? bits[indice] : 0;
          indice++;
        }
      }
      subindo = !subindo;
    }
  }

  function aplicarMascara(matriz, reservado, mascara) {
    var tamanho = matriz.length;
    var copia = matriz.map(function (linha) { return linha.slice(); });
    for (var l = 0; l < tamanho; l++) {
      for (var c = 0; c < tamanho; c++) {
        if (reservado[l][c]) continue;
        var inverter = false;
        switch (mascara) {
          case 0: inverter = (l + c) % 2 === 0; break;
          case 1: inverter = l % 2 === 0; break;
          case 2: inverter = c % 3 === 0; break;
          case 3: inverter = (l + c) % 3 === 0; break;
          case 4: inverter = (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0; break;
          case 5: inverter = ((l * c) % 2) + ((l * c) % 3) === 0; break;
          case 6: inverter = (((l * c) % 2) + ((l * c) % 3)) % 2 === 0; break;
          case 7: inverter = (((l + c) % 2) + ((l * c) % 3)) % 2 === 0; break;
        }
        if (inverter) copia[l][c] = copia[l][c] ^ 1;
      }
    }
    return copia;
  }

  function gravarFormato(matriz, nivel, mascara) {
    var indicadores = [1, 0, 3, 2];
    var dados = (indicadores[nivel] << 3) | mascara;
    var resto = dados << 10;
    for (var i = 0; i < 5; i++) {
      if (resto & (1 << (14 - i))) resto ^= 0b10100110111 << (4 - i);
    }
    var formato = ((dados << 10) | resto) ^ 0b101010000010010;
    var tamanho = matriz.length;

    for (var b = 0; b <= 5; b++) matriz[8][b] = (formato >>> (14 - b)) & 1;
    matriz[8][7] = (formato >>> 8) & 1;
    matriz[8][8] = (formato >>> 7) & 1;
    matriz[7][8] = (formato >>> 6) & 1;
    for (var c = 0; c <= 5; c++) matriz[5 - c][8] = (formato >>> (5 - c)) & 1;

    for (var d = 0; d <= 7; d++) matriz[tamanho - 1 - d][8] = (formato >>> (14 - d)) & 1;
    for (var e = 0; e <= 6; e++) matriz[8][tamanho - 7 + e] = (formato >>> (6 - e)) & 1;
    matriz[tamanho - 8][8] = 1;
  }

  function gravarVersao(matriz, versao) {
    if (versao < 7) return;
    var resto = versao << 12;
    for (var i = 0; i < 6; i++) {
      if (resto & (1 << (17 - i))) resto ^= 0b1111100100101 << (5 - i);
    }
    var informacao = (versao << 12) | resto;
    var tamanho = matriz.length;
    for (var b = 0; b < 18; b++) {
      var bit = (informacao >>> b) & 1;
      var linha = Math.floor(b / 3);
      var coluna = b % 3;
      matriz[linha][tamanho - 11 + coluna] = bit;
      matriz[tamanho - 11 + coluna][linha] = bit;
    }
  }

  function calcularPenalidade(matriz) {
    var tamanho = matriz.length;
    var total = 0;

    for (var l = 0; l < tamanho; l++) {
      var sequenciaLinha = 1;
      var sequenciaColuna = 1;
      for (var c = 1; c < tamanho; c++) {
        if (matriz[l][c] === matriz[l][c - 1]) sequenciaLinha++;
        else { if (sequenciaLinha >= 5) total += sequenciaLinha - 2; sequenciaLinha = 1; }
        if (matriz[c][l] === matriz[c - 1][l]) sequenciaColuna++;
        else { if (sequenciaColuna >= 5) total += sequenciaColuna - 2; sequenciaColuna = 1; }
      }
      if (sequenciaLinha >= 5) total += sequenciaLinha - 2;
      if (sequenciaColuna >= 5) total += sequenciaColuna - 2;
    }

    for (var m = 0; m < tamanho - 1; m++) {
      for (var n = 0; n < tamanho - 1; n++) {
        var valor = matriz[m][n];
        if (valor === matriz[m][n + 1] && valor === matriz[m + 1][n] && valor === matriz[m + 1][n + 1]) total += 3;
      }
    }

    var padraoA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var padraoB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function combina(linha, coluna, padrao, horizontal) {
      for (var i = 0; i < 11; i++) {
        var l2 = horizontal ? linha : linha + i;
        var c2 = horizontal ? coluna + i : coluna;
        if (matriz[l2][c2] !== padrao[i]) return false;
      }
      return true;
    }
    for (var p = 0; p < tamanho; p++) {
      for (var q = 0; q < tamanho - 10; q++) {
        if (combina(p, q, padraoA, true) || combina(p, q, padraoB, true)) total += 40;
        if (combina(q, p, padraoA, false) || combina(q, p, padraoB, false)) total += 40;
      }
    }

    var escuros = 0;
    for (var x = 0; x < tamanho; x++) {
      for (var y = 0; y < tamanho; y++) if (matriz[x][y] === 1) escuros++;
    }
    var proporcao = (escuros * 100) / (tamanho * tamanho);
    var desvio = Math.floor(Math.abs(proporcao - 50) / 5);
    total += desvio * 10;

    return total;
  }

  function gerarMatriz(texto, nivelTexto) {
    if (!texto) throw new Error("Nada para codificar no QR Code.");
    var nivel = NIVEIS[(nivelTexto || "M").toUpperCase()];
    if (nivel === undefined) nivel = NIVEIS.M;

    var bytes = textoParaBytes(texto);
    var versao = escolherVersao(bytes.length, nivel);
    if (!versao) throw new Error("Texto longo demais para o QR Code.");

    var codigos = intercalarCodigos(montarBitsDados(bytes, versao, nivel), versao, nivel);
    var tamanho = versao * 4 + 17;

    var base = criarMatrizVazia(tamanho);
    var reservado = [];
    for (var i = 0; i < tamanho; i++) reservado.push(new Array(tamanho).fill(false));

    desenharLocalizadores(base, reservado);
    desenharAlinhamento(base, reservado, versao);
    desenharTemporizadores(base, reservado);
    reservarFormato(base, reservado, versao);
    colocarDados(base, reservado, codigos);

    var melhor = null;
    var menorPenalidade = Infinity;
    for (var mascara = 0; mascara < 8; mascara++) {
      var candidata = aplicarMascara(base, reservado, mascara);
      gravarFormato(candidata, nivel, mascara);
      gravarVersao(candidata, versao);
      var penalidade = calcularPenalidade(candidata);
      if (penalidade < menorPenalidade) {
        menorPenalidade = penalidade;
        melhor = candidata;
      }
    }

    return { tamanho: tamanho, versao: versao, modulos: melhor };
  }

  function desenharNoCanvas(canvas, texto, opcoes) {
    opcoes = opcoes || {};
    var resultado = gerarMatriz(texto, opcoes.nivel);
    var margem = opcoes.margem === undefined ? 4 : opcoes.margem;
    var escala = opcoes.escala || 8;
    var lado = (resultado.tamanho + margem * 2) * escala;

    canvas.width = lado;
    canvas.height = lado;

    var contexto = canvas.getContext("2d");
    contexto.fillStyle = opcoes.fundo || "#FFFFFF";
    contexto.fillRect(0, 0, lado, lado);
    contexto.fillStyle = opcoes.cor || "#0E3C39";

    for (var l = 0; l < resultado.tamanho; l++) {
      for (var c = 0; c < resultado.tamanho; c++) {
        if (resultado.modulos[l][c] === 1) {
          contexto.fillRect((c + margem) * escala, (l + margem) * escala, escala, escala);
        }
      }
    }
    return resultado;
  }

  function gerarSVG(texto, opcoes) {
    opcoes = opcoes || {};
    var resultado = gerarMatriz(texto, opcoes.nivel);
    var margem = opcoes.margem === undefined ? 4 : opcoes.margem;
    var lado = resultado.tamanho + margem * 2;
    var cor = opcoes.cor || "#0E3C39";
    var fundo = opcoes.fundo || "#FFFFFF";

    var caminho = "";
    for (var l = 0; l < resultado.tamanho; l++) {
      for (var c = 0; c < resultado.tamanho; c++) {
        if (resultado.modulos[l][c] === 1) {
          caminho += "M" + (c + margem) + " " + (l + margem) + "h1v1h-1z";
        }
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lado + " " + lado +
      '" shape-rendering="crispEdges" role="img" aria-label="QR Code de emergencia">' +
      '<rect width="' + lado + '" height="' + lado + '" fill="' + fundo + '"/>' +
      '<path d="' + caminho + '" fill="' + cor + '"/></svg>';
  }

  function gerarPNG(texto, opcoes) {
    var canvas = document.createElement("canvas");
    desenharNoCanvas(canvas, texto, opcoes);
    return canvas.toDataURL("image/png");
  }

  escopo.BioShieldQR = {
    gerarMatriz: gerarMatriz,
    desenharNoCanvas: desenharNoCanvas,
    gerarSVG: gerarSVG,
    gerarPNG: gerarPNG
  };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = (typeof window !== "undefined" ? window : globalThis).BioShieldQR;
}
