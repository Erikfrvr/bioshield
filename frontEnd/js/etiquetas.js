// Desenhista das etiquetas do QR Code.
// Uma funcao so desenha cada etiqueta num canvas, em milimetro de verdade. A mesma etiqueta vai para a previa
// da tela, para a impressao, para o PDF e para as imagens: o que a pessoa ve na tela e o que sai no papel.
// Tambem monta o PDF da folha A4 sem biblioteca: a folha vira uma imagem JPEG dentro de um PDF de uma pagina.
// Expoe BioShieldEtiquetas. Depende do qrcode.js (BioShieldQR.gerarMatriz).

(function (escopo) {
  "use strict";

  var TEXTO_PADRAO = "EM CASO DE EMERGÊNCIA ESCANEIE ME";
  var APOIO_CARTAO = "Alergias, remédios em uso, tipo sanguíneo e contato de emergência.";
  var INSTRUCAO_FOLHA = "Recorte nas linhas tracejadas. Todas as etiquetas abrem a mesma ficha de emergência.";
  var RODAPE_FOLHA = "Ficha de emergência BioShield. Se você perder algum destes itens, cancele o código dentro do aplicativo e imprima uma folha nova.";

  // Folha A4 e as margens dela, em mm.
  var FOLHA = { largura: 210, altura: 297, margemTopo: 12, margemLado: 10, vaoEtiquetas: 3 };

  // Pixels por mm. 12 da quase 305 pontos por polegada, que e a resolucao de impressao comum.
  var PX_FOLHA = 12;
  // As imagens de uma etiqueta so saem com o dobro, para quem for mandar para uma grafica.
  var PX_IMAGEM = 24;

  // 1 ponto tipografico em mm. Os tamanhos de letra abaixo sao em pontos, como na folha antiga.
  var MM_POR_PONTO = 25.4 / 72;
  // Modulos de margem branca em volta do desenho do QR, dentro da etiqueta.
  var MARGEM_QR = 2;

  var CORES = {
    qr: "#0E3C39",
    teal: "#0E3C39",
    tealMedio: "#1B5C57",
    aviso: "#C3402C",
    suave: "#4F6763",
    apoio: "#526A66",
    corte: "#A9C9BF",
    linha: "#D6E7E1",
    branco: "#FFFFFF"
  };

  var FONTE_TEXTO = '"Atkinson Hyperlegible", "Segoe UI", Roboto, system-ui, sans-serif';
  var FONTE_TITULO = '"Plus Jakarta Sans", "Segoe UI", Roboto, system-ui, sans-serif';

  // Os quatro modelos. largura, altura, qr, folga [vertical, lateral] e vao em mm; fontes em pontos.
  // extra diz se a informacao extra que a pessoa escreveu aparece nesse modelo (so cabe nos dois maiores).
  var MODELOS = [
    {
      chave: "cartao", nome: "Cartão de carteira", medida: "85 x 54 mm", uso: "",
      largura: 85, altura: 54, quantidade: 2, formato: "largo",
      qr: 34, folga: [4, 4], vao: 1.6, vaoQr: 3,
      fontes: { aviso: 10, nome: 9, extra: 7.4, apoio: 6.6, marca: 8 },
      extra: true, apoio: true, arquivo: "cartao"
    },
    {
      chave: "adesivo", nome: "Adesivo grande", medida: "45 x 58 mm", uso: "para mochila e geladeira",
      largura: 45, altura: 58, quantidade: 4, formato: "alto",
      qr: 34, folga: [3, 2], vao: 1.5,
      fontes: { aviso: 7.4, nome: 7, extra: 6.4, marca: 6.6 },
      extra: true, arquivo: "adesivo"
    },
    {
      chave: "chaveiro", nome: "Etiqueta de chaveiro", medida: "32 x 45 mm", uso: "",
      largura: 32, altura: 45, quantidade: 5, formato: "alto",
      qr: 25, folga: [2.5, 1.5], vao: 1.2,
      fontes: { aviso: 5.6, nome: 5.4, marca: 5.4 },
      arquivo: "chaveiro"
    },
    {
      chave: "mini", nome: "Mini adesivo", medida: "25 x 30 mm", uso: "para pulseira e celular",
      largura: 25, altura: 30, quantidade: 6, formato: "so-qr",
      qr: 19, folga: [1.4, 1], vao: 0.6,
      fontes: { aviso: 4.4 },
      arquivo: "mini"
    }
  ];

  function modelo(chave) {
    return MODELOS.filter(function (item) { return item.chave === chave; })[0] || null;
  }

  // ===== Fontes =====

  // As fontes vem do Google Fonts. Sem internet elas nao chegam, e o desenho usa a fonte do sistema.
  // Espero no maximo alguns segundos para nao travar a tela.
  function prepararFontes() {
    if (!document.fonts || typeof document.fonts.load !== "function") return Promise.resolve();
    var amostra = "BioShield EMERGÊNCIA ção 0123";
    var pedidos = [
      '400 20px "Atkinson Hyperlegible"',
      '700 20px "Atkinson Hyperlegible"',
      '500 20px "Plus Jakarta Sans"',
      '700 20px "Plus Jakarta Sans"',
      '800 20px "Plus Jakarta Sans"'
    ].map(function (fonte) {
      return document.fonts.load(fonte, amostra).catch(function () { return []; });
    });
    var limite = new Promise(function (resolver) { setTimeout(resolver, 3000); });
    return Promise.race([Promise.all(pedidos), limite]);
  }

  function tamanhoEmPx(pontos, px) {
    return pontos * MM_POR_PONTO * px;
  }

  function fonte(peso, tamanhoPx, familia) {
    return peso + " " + tamanhoPx.toFixed(2) + "px " + familia;
  }

  // ===== Texto =====

  // Quebra o texto em linhas que cabem na largura. Palavra maior que a linha inteira e quebrada por letra.
  function quebrarLinhas(ctx, texto, largura) {
    var palavras = String(texto || "").split(/\s+/).filter(Boolean);
    var linhas = [];
    var atual = "";

    palavras.forEach(function (palavra) {
      var tentativa = atual ? atual + " " + palavra : palavra;
      if (ctx.measureText(tentativa).width <= largura) {
        atual = tentativa;
        return;
      }
      if (atual) linhas.push(atual);
      while (palavra.length > 1 && ctx.measureText(palavra).width > largura) {
        var corte = palavra.length - 1;
        while (corte > 1 && ctx.measureText(palavra.slice(0, corte)).width > largura) corte--;
        linhas.push(palavra.slice(0, corte));
        palavra = palavra.slice(corte);
      }
      atual = palavra;
    });

    if (atual) linhas.push(atual);
    return linhas;
  }

  // Mede um grupo de textos empilhados, com a letra multiplicada por escala.
  // Cada peca: { texto, pontos, peso, familia, cor, entrelinha } ou { marca: true, pontos }.
  function medirPecas(ctx, pecas, largura, px, escala, vaoPx) {
    var total = 0;
    var medidas = pecas.map(function (peca, indice) {
      var tamanho = tamanhoEmPx(peca.pontos, px) * escala;
      var linhas = [""];
      if (!peca.marca) {
        ctx.font = fonte(peca.peso, tamanho, peca.familia);
        linhas = quebrarLinhas(ctx, peca.texto, largura);
      }
      var alturaLinha = tamanho * (peca.entrelinha || 1.15);
      var altura = linhas.length * alturaLinha;
      total += altura + (indice > 0 ? vaoPx : 0);
      return { peca: peca, tamanho: tamanho, linhas: linhas, alturaLinha: alturaLinha, altura: altura };
    });
    return { medidas: medidas, altura: total };
  }

  // Procura a maior letra que deixa os textos dentro da altura. Frase comprida encolhe, nunca vaza.
  // Se nem com metade do tamanho couber, desenha com metade e o recorte da etiqueta segura o resto.
  function ajustarPecas(ctx, pecas, largura, alturaMaxima, px, vaoPx) {
    for (var passo = 0; passo <= 10; passo++) {
      var escala = 1 - passo * 0.05;
      var medida = medirPecas(ctx, pecas, largura, px, escala, vaoPx);
      if (medida.altura <= alturaMaxima) return medida;
    }
    return medirPecas(ctx, pecas, largura, px, 0.5, vaoPx);
  }

  // A marca "BioShield": "Bio" forte e "Shield" mais leve, como no app.
  function larguraMarca(ctx, tamanho) {
    ctx.font = fonte(800, tamanho, FONTE_TITULO);
    var bio = ctx.measureText("Bio").width;
    ctx.font = fonte(500, tamanho, FONTE_TITULO);
    return bio + ctx.measureText("Shield").width;
  }

  // x e o ponto de referencia conforme o alinhamento: esquerda, centro ou direita.
  function desenharMarca(ctx, tamanho, x, yMeio, alinhamento) {
    var largura = larguraMarca(ctx, tamanho);
    var inicio = alinhamento === "center" ? x - largura / 2 : alinhamento === "right" ? x - largura : x;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = CORES.teal;
    ctx.font = fonte(800, tamanho, FONTE_TITULO);
    ctx.fillText("Bio", inicio, yMeio);
    var bio = ctx.measureText("Bio").width;
    ctx.font = fonte(500, tamanho, FONTE_TITULO);
    ctx.fillText("Shield", inicio + bio, yMeio);
  }

  // Desenha as pecas ja medidas a partir de y (topo do grupo). Devolve o y logo abaixo do grupo.
  function desenharPecas(ctx, medida, x, y, alinhamento, vaoPx) {
    medida.medidas.forEach(function (item, indice) {
      if (indice > 0) y += vaoPx;
      if (item.peca.marca) {
        desenharMarca(ctx, item.tamanho, x, y + item.alturaLinha / 2, alinhamento);
        y += item.altura;
        return;
      }
      ctx.font = fonte(item.peca.peso, item.tamanho, item.peca.familia);
      ctx.fillStyle = item.peca.cor;
      ctx.textAlign = alinhamento;
      ctx.textBaseline = "middle";
      item.linhas.forEach(function (linha) {
        ctx.fillText(linha, x, y + item.alturaLinha / 2);
        y += item.alturaLinha;
      });
    });
    return y;
  }

  // ===== Formas =====

  function caminhoArredondado(ctx, x, y, largura, altura, raio) {
    ctx.beginPath();
    ctx.moveTo(x + raio, y);
    ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
    ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
    ctx.arcTo(x, y + altura, x, y, raio);
    ctx.arcTo(x, y, x + largura, y, raio);
    ctx.closePath();
  }

  // O QR em pixels inteiros: cada modulo com o mesmo tamanho exato, sem fresta entre os quadrinhos.
  // Modulos escuros seguidos na mesma linha viram um retangulo so, o que deixa o desenho rapido.
  function desenharQr(ctx, matriz, x, y, ladoPx) {
    var total = matriz.tamanho + MARGEM_QR * 2;
    var modulo = Math.max(1, Math.floor(ladoPx / total));
    var desenhado = modulo * total;
    var inicioX = Math.round(x + (ladoPx - desenhado) / 2);
    var inicioY = Math.round(y + (ladoPx - desenhado) / 2);

    ctx.fillStyle = CORES.branco;
    ctx.fillRect(inicioX, inicioY, desenhado, desenhado);
    ctx.fillStyle = CORES.qr;

    for (var linha = 0; linha < matriz.tamanho; linha++) {
      var coluna = 0;
      while (coluna < matriz.tamanho) {
        if (matriz.modulos[linha][coluna] !== 1) {
          coluna++;
          continue;
        }
        var fim = coluna;
        while (fim < matriz.tamanho && matriz.modulos[linha][fim] === 1) fim++;
        ctx.fillRect(
          inicioX + (coluna + MARGEM_QR) * modulo,
          inicioY + (linha + MARGEM_QR) * modulo,
          (fim - coluna) * modulo,
          modulo
        );
        coluna = fim;
      }
    }
    return { x: inicioX, y: inicioY, lado: desenhado, modulo: modulo };
  }

  // ===== Uma etiqueta =====

  // dados: { matriz, texto, nome, extra }. x e y em pixels, px = pixels por mm.
  // Devolve onde o QR ficou, que o teste usa para conferir o desenho modulo por modulo.
  function desenharEtiqueta(ctx, item, dados, x, y, px) {
    var largura = item.largura * px;
    var altura = item.altura * px;
    var raio = 2 * px;
    var folgaV = item.folga[0] * px;
    var folgaL = item.folga[1] * px;
    var vao = item.vao * px;
    var ladoQr = item.qr * px;
    var aviso = String(dados.texto || "").trim() || TEXTO_PADRAO;
    var posicaoQr;

    ctx.save();
    caminhoArredondado(ctx, x, y, largura, altura, raio);
    ctx.fillStyle = CORES.branco;
    ctx.fill();
    ctx.clip();

    var pecaAviso = { texto: aviso, pontos: item.fontes.aviso, peso: 700, familia: FONTE_TEXTO, cor: CORES.aviso, entrelinha: 1.12 };
    var pecaNome = dados.nome && item.fontes.nome
      ? { texto: dados.nome, pontos: item.fontes.nome, peso: 700, familia: FONTE_TEXTO, cor: CORES.teal, entrelinha: 1.15 }
      : null;
    var pecaExtra = dados.extra && item.extra
      ? { texto: dados.extra, pontos: item.fontes.extra, peso: 700, familia: FONTE_TEXTO, cor: CORES.tealMedio, entrelinha: 1.15 }
      : null;
    var pecaMarca = item.fontes.marca ? { marca: true, pontos: item.fontes.marca, entrelinha: 1.2 } : null;

    if (item.formato === "largo") {
      // QR na esquerda, textos na direita, o grupo todo centralizado na altura.
      posicaoQr = desenharQr(ctx, dados.matriz, x + folgaL, y + (altura - ladoQr) / 2, ladoQr);
      var colunaX = x + folgaL + ladoQr + item.vaoQr * px;
      var colunaLargura = x + largura - folgaL - colunaX;
      var pecas = [pecaAviso, pecaNome, pecaExtra].filter(Boolean);
      if (item.apoio) pecas.push({ texto: APOIO_CARTAO, pontos: item.fontes.apoio, peso: 400, familia: FONTE_TEXTO, cor: CORES.apoio, entrelinha: 1.2 });
      pecas.push(pecaMarca);
      var medidaLargo = ajustarPecas(ctx, pecas, colunaLargura, altura - folgaV * 2, px, vao);
      desenharPecas(ctx, medidaLargo, colunaX, y + (altura - medidaLargo.altura) / 2, "left", vao);
    } else {
      // QR em cima, centralizado. Os textos descem logo abaixo dele.
      posicaoQr = desenharQr(ctx, dados.matriz, x + (largura - ladoQr) / 2, y + folgaV, ladoQr);
      var centro = x + largura / 2;
      var larguraTexto = largura - folgaL * 2;
      var topoTexto = y + folgaV + ladoQr + vao;
      var baseTexto = y + altura - folgaV;

      if (pecaMarca) {
        // A marca fica presa no pe da etiqueta, como na folha antiga.
        var alturaMarca = tamanhoEmPx(pecaMarca.pontos, px) * pecaMarca.entrelinha;
        desenharMarca(ctx, tamanhoEmPx(pecaMarca.pontos, px), centro, baseTexto - alturaMarca / 2, "center");
        baseTexto -= alturaMarca + vao;
      }

      var pecasAlto = item.formato === "so-qr" ? [pecaAviso] : [pecaAviso, pecaNome, pecaExtra].filter(Boolean);
      var medidaAlto = ajustarPecas(ctx, pecasAlto, larguraTexto, baseTexto - topoTexto, px, vao);
      desenharPecas(ctx, medidaAlto, centro, topoTexto, "center", vao);
    }

    ctx.restore();

    // Linha tracejada de corte, por cima de tudo e fora do recorte.
    ctx.save();
    var espessura = Math.max(1, 0.25 * px);
    ctx.lineWidth = espessura;
    ctx.strokeStyle = CORES.corte;
    ctx.setLineDash([1.6 * px, 1.1 * px]);
    caminhoArredondado(ctx, x + espessura / 2, y + espessura / 2, largura - espessura, altura - espessura, raio);
    ctx.stroke();
    ctx.restore();

    return posicaoQr;
  }

  // ===== A folha A4 =====

  // dados: { matriz, texto, nome, extra, modelos: { cartao: true, ... } }.
  // Desenha a folha inteira no canvas e devolve onde cada etiqueta ficou e se tudo coube na pagina.
  function desenharFolha(canvas, dados, px) {
    px = px || PX_FOLHA;
    canvas.width = Math.round(FOLHA.largura * px);
    canvas.height = Math.round(FOLHA.altura * px);

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = CORES.branco;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var esquerda = FOLHA.margemLado * px;
    var larguraUtil = (FOLHA.largura - FOLHA.margemLado * 2) * px;
    var direita = esquerda + larguraUtil;
    var y = FOLHA.margemTopo * px;
    var posicoes = [];

    // Topo: a marca na esquerda e a instrucao de recorte na direita.
    var tamanhoMarca = tamanhoEmPx(11, px);
    var instrucao = medirPecas(ctx, [{ texto: INSTRUCAO_FOLHA, pontos: 8, peso: 400, familia: FONTE_TEXTO, cor: CORES.suave, entrelinha: 1.3 }], 120 * px, px, 1, 0);
    var alturaTopo = Math.max(tamanhoMarca * 1.2, instrucao.altura);
    desenharMarca(ctx, tamanhoMarca, esquerda, y + alturaTopo / 2, "left");
    desenharPecas(ctx, instrucao, direita, y + (alturaTopo - instrucao.altura) / 2, "right", 0);
    y += alturaTopo + 3 * px;
    ctx.fillStyle = CORES.linha;
    ctx.fillRect(esquerda, y, larguraUtil, Math.max(1, 0.25 * px));
    y += 5 * px;

    MODELOS.forEach(function (item) {
      if (!dados.modelos || !dados.modelos[item.chave]) return;

      // Titulo do bloco: o nome forte e a medida mais leve, na mesma linha.
      var tamanhoTitulo = tamanhoEmPx(8.5, px);
      var tamanhoMedida = tamanhoEmPx(7.5, px);
      var alturaTitulo = tamanhoTitulo * 1.25;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = CORES.tealMedio;
      ctx.font = fonte(700, tamanhoTitulo, FONTE_TITULO);
      var linhaBase = y + alturaTitulo * 0.8;
      ctx.fillText(item.nome, esquerda, linhaBase);
      var larguraNome = ctx.measureText(item.nome).width;
      ctx.fillStyle = CORES.suave;
      ctx.font = fonte(400, tamanhoMedida, FONTE_TITULO);
      ctx.fillText(item.medida + (item.uso ? ", " + item.uso : ""), esquerda + larguraNome + 2 * px, linhaBase);
      y += alturaTitulo + 2.5 * px;

      // As etiquetas lado a lado, com 3 mm entre elas, pulando de linha quando nao cabem.
      var x = esquerda;
      for (var i = 0; i < item.quantidade; i++) {
        if (i > 0 && x + item.largura * px > direita + 0.5) {
          x = esquerda;
          y += (item.altura + FOLHA.vaoEtiquetas) * px;
        }
        var qr = desenharEtiqueta(ctx, item, dados, x, y, px);
        posicoes.push({ chave: item.chave, x: x, y: y, qr: qr });
        x += (item.largura + FOLHA.vaoEtiquetas) * px;
      }
      y += item.altura * px + 5 * px;
    });

    // Rodape com a linha em cima.
    ctx.fillStyle = CORES.linha;
    ctx.fillRect(esquerda, y, larguraUtil, Math.max(1, 0.25 * px));
    y += 3 * px;
    var rodape = medirPecas(ctx, [{ texto: RODAPE_FOLHA, pontos: 7.5, peso: 400, familia: FONTE_TEXTO, cor: CORES.suave, entrelinha: 1.3 }], larguraUtil, px, 1, 0);
    y = desenharPecas(ctx, rodape, esquerda, y, "left", 0);

    return { posicoes: posicoes, cabe: y <= canvas.height - 6 * px };
  }

  // Uma etiqueta sozinha, com uma margem branca em volta, para virar imagem.
  function imagemDaEtiqueta(chave, dados, px) {
    var item = modelo(chave);
    if (!item) throw new Error("Modelo de etiqueta desconhecido.");
    px = px || PX_IMAGEM;
    var margem = 2 * px;
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(item.largura * px + margem * 2);
    canvas.height = Math.round(item.altura * px + margem * 2);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = CORES.branco;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var qr = desenharEtiqueta(ctx, item, dados, margem, margem, px);
    return { canvas: canvas, qr: qr };
  }

  // ===== Arquivos =====

  function blobDoCanvas(canvas, tipo, qualidade) {
    return new Promise(function (resolver, rejeitar) {
      if (typeof canvas.toBlob !== "function") {
        rejeitar(new Error("Este navegador não consegue gerar o arquivo."));
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) resolver(blob);
        else rejeitar(new Error("Não consegui gerar o arquivo."));
      }, tipo, qualidade);
    });
  }

  function bytesDoBlob(blob) {
    if (typeof blob.arrayBuffer === "function") {
      return blob.arrayBuffer().then(function (buffer) { return new Uint8Array(buffer); });
    }
    return new Promise(function (resolver, rejeitar) {
      var leitor = new FileReader();
      leitor.onload = function () { resolver(new Uint8Array(leitor.result)); };
      leitor.onerror = function () { rejeitar(new Error("Não consegui ler o arquivo gerado.")); };
      leitor.readAsArrayBuffer(blob);
    });
  }

  // PDF de uma pagina A4 com a imagem JPEG ocupando a pagina inteira, no tamanho real.
  // O JPEG entra do jeito que veio (filtro DCTDecode do PDF), sem precisar recomprimir nada.
  function montarPdf(jpeg, larguraPx, alturaPx, titulo) {
    var codificador = new TextEncoder();
    var partes = [];
    var tamanho = 0;
    var posicoes = [];
    var larguraPt = (FOLHA.largura / 25.4 * 72).toFixed(2);
    var alturaPt = (FOLHA.altura / 25.4 * 72).toFixed(2);

    function juntar(pedaco) {
      var bytes = typeof pedaco === "string" ? codificador.encode(pedaco) : pedaco;
      partes.push(bytes);
      tamanho += bytes.length;
    }

    function objeto(numero, corpo) {
      posicoes[numero] = tamanho;
      juntar(numero + " 0 obj\n" + corpo + "\nendobj\n");
    }

    // A segunda linha com letras acima de 127 avisa os programas que o arquivo e binario.
    juntar("%PDF-1.4\n%âãÏÓ\n");
    objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objeto(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + larguraPt + " " + alturaPt + "] " +
      "/Resources << /XObject << /Folha 4 0 R >> >> /Contents 5 0 R >>");

    posicoes[4] = tamanho;
    juntar("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + larguraPx + " /Height " + alturaPx +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>\nstream\n");
    juntar(jpeg);
    juntar("\nendstream\nendobj\n");

    var desenho = "q " + larguraPt + " 0 0 " + alturaPt + " 0 0 cm /Folha Do Q";
    objeto(5, "<< /Length " + desenho.length + " >>\nstream\n" + desenho + "\nendstream");
    objeto(6, "<< /Title (" + titulo + ") /Producer (BioShield) >>");

    var inicioXref = tamanho;
    var tabela = "xref\n0 7\n0000000000 65535 f \n";
    for (var n = 1; n <= 6; n++) {
      tabela += ("0000000000" + posicoes[n]).slice(-10) + " 00000 n \n";
    }
    juntar(tabela);
    juntar("trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n" + inicioXref + "\n%%EOF\n");

    var pdf = new Uint8Array(tamanho);
    var deslocamento = 0;
    partes.forEach(function (pedaco) {
      pdf.set(pedaco, deslocamento);
      deslocamento += pedaco.length;
    });
    return pdf;
  }

  // Desenha a folha num canvas proprio, fora da tela, e devolve os bytes do PDF.
  async function pdfDaFolha(dados) {
    var canvas = document.createElement("canvas");
    desenharFolha(canvas, dados, PX_FOLHA);
    var jpeg = await bytesDoBlob(await blobDoCanvas(canvas, "image/jpeg", 0.92));
    return montarPdf(jpeg, canvas.width, canvas.height, "Etiquetas BioShield");
  }

  async function pngDaEtiqueta(chave, dados) {
    var imagem = imagemDaEtiqueta(chave, dados, PX_IMAGEM);
    return bytesDoBlob(await blobDoCanvas(imagem.canvas, "image/png"));
  }

  escopo.BioShieldEtiquetas = {
    TEXTO_PADRAO: TEXTO_PADRAO,
    MODELOS: MODELOS,
    PX_FOLHA: PX_FOLHA,
    PX_IMAGEM: PX_IMAGEM,
    MARGEM_QR: MARGEM_QR,
    modelo: modelo,
    prepararFontes: prepararFontes,
    desenharEtiqueta: desenharEtiqueta,
    desenharFolha: desenharFolha,
    imagemDaEtiqueta: imagemDaEtiqueta,
    pdfDaFolha: pdfDaFolha,
    pngDaEtiqueta: pngDaEtiqueta,
    montarPdf: montarPdf
  };
})(window);
