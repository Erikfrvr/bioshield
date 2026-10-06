// Script da tela de etiquetas.
// Busca a ficha, desenha a folha com o etiquetas.js e redesenha quando algo muda na tela.
// Imprimir e baixar funcionam no computador, no navegador do celular e no app Android.
// No app, a janela nao imprime nem baixa arquivo sozinha: quem faz isso e o plugin nativo BioShieldArquivos
// (android/app/src/main/java/br/com/bioshield/app/ArquivosPlugin.java), chamado pela ponte do Capacitor,
// do mesmo jeito que o avisosCuidador.js chama o plugin do cuidador.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var Etiquetas = window.BioShieldEtiquetas;
  var PLUGIN = "BioShieldArquivos";

  var ficha = null;
  var endereco = "";
  var matriz = null;
  var chaveMatriz = "";
  var desenhoPendente = 0;
  var ocupado = false;
  // O ultimo arquivo salvo no app, para os botoes Abrir e Compartilhar.
  var ultimoArquivo = null;

  var caixaErro = UI.elemento("#erro");
  var canvasFolha = UI.elemento("#folhaCanvas");
  var botaoImprimir = UI.elemento("#imprimir");
  var botaoPdf = UI.elemento("#baixarPdf");
  var botoesImagem = UI.todos(".baixar-imagem");
  var marcadores = UI.todos(".lista-modelos input[data-bloco]");
  var resultado = UI.elemento("#resultado");
  var resultadoTexto = UI.elemento("#resultadoTexto");
  var resultadoBotoes = UI.elemento("#resultadoBotoes");
  var botaoAbrir = UI.elemento("#abrirArquivo");

  // ===== Ponte com o Android =====

  function pluginPronto() {
    var cap = window.Capacitor;
    if (!Api.noApp || !cap || typeof cap.nativePromise !== "function") return false;
    return (cap.PluginHeaders || []).some(function (plugin) { return plugin.name === PLUGIN; });
  }

  var nativo = pluginPronto();

  function plugin(metodo, opcoes) {
    return window.Capacitor.nativePromise(PLUGIN, metodo, opcoes || {});
  }

  if (nativo) {
    UI.elemento("#notaImpressao").textContent = "Na janela do Android, escolha a impressora, ou Salvar como PDF, e o papel A4. Os arquivos baixados vão para a pasta Download, dentro de BioShield.";
  }

  // ===== O que vai na folha =====

  function primeiroNome(nomeCompleto) {
    var partes = String(nomeCompleto || "").trim().split(/\s+/);
    if (partes.length <= 2) return partes.join(" ");
    return partes[0] + " " + partes[partes.length - 1];
  }

  // Le a tela e monta o que o etiquetas.js precisa. O desenho do QR so e refeito quando
  // o endereco ou a resistencia mudam, porque ele e a parte mais pesada da conta.
  function dadosAtuais() {
    var nivel = UI.elemento("#nivelCorrecao").value;
    var chave = endereco + "|" + nivel;
    if (chave !== chaveMatriz) {
      matriz = BioShieldQR.gerarMatriz(endereco, nivel);
      chaveMatriz = chave;
    }

    var modelos = {};
    marcadores.forEach(function (marcador) {
      modelos[marcador.dataset.bloco] = marcador.checked;
    });

    return {
      matriz: matriz,
      texto: UI.elemento("#textoEtiqueta").value.trim() || Etiquetas.TEXTO_PADRAO,
      nome: UI.elemento("#mostrarNome").value === "sim" ? primeiroNome(ficha.nome) : "",
      extra: UI.elemento("#extraEtiqueta").value.trim(),
      modelos: modelos
    };
  }

  function algumModeloMarcado() {
    return marcadores.some(function (marcador) { return marcador.checked; });
  }

  function atualizarBotoes() {
    var pronto = Boolean(endereco) && !ocupado;
    botaoImprimir.disabled = !pronto || !algumModeloMarcado();
    botaoPdf.disabled = !pronto || !algumModeloMarcado();
    botoesImagem.forEach(function (botao) { botao.disabled = !pronto; });
  }

  function desenhar() {
    desenhoPendente = 0;
    if (!endereco) return;
    try {
      Etiquetas.desenharFolha(canvasFolha, dadosAtuais(), Etiquetas.PX_FOLHA);
    } catch (erro) {
      UI.mostrarErro(caixaErro, "Não consegui desenhar as etiquetas. " + erro.message);
    }
    atualizarBotoes();
  }

  // Digitar redesenha a folha, mas no maximo uma vez por quadro da tela.
  function pedirDesenho() {
    if (!desenhoPendente) desenhoPendente = requestAnimationFrame(desenhar);
  }

  // ===== Arquivos =====

  function doisDigitos(numero) {
    return (numero < 10 ? "0" : "") + numero;
  }

  function nomeArquivo(base, extensao) {
    var hoje = new Date();
    return "BioShield_" + base + "_" + hoje.getFullYear() + "_" + doisDigitos(hoje.getMonth() + 1) + "_" + doisDigitos(hoje.getDate()) + "." + extensao;
  }

  // A ponte com o Android so leva texto, entao o arquivo vai em base64. Em pedacos, para nao estourar a pilha.
  function paraBase64(bytes) {
    var texto = "";
    var passo = 0x8000;
    for (var i = 0; i < bytes.length; i += passo) {
      texto += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
    }
    return btoa(texto);
  }

  function baixarNoNavegador(bytes, nome, tipo) {
    var url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
    var link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function mostrarResultado(texto, comBotoes) {
    resultadoTexto.textContent = texto;
    resultadoBotoes.hidden = !comBotoes;
    botaoAbrir.hidden = !(ultimoArquivo && ultimoArquivo.uri);
    resultado.hidden = false;
    resultado.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // frases: { salvo: "O PDF da folha foi salvo", baixado: "O PDF da folha foi baixado" }
  async function entregar(bytes, nome, tipo, frases) {
    if (!nativo) {
      if (Api.noApp) {
        throw new Error("Este app está desatualizado. Instale a versão nova do BioShield para baixar pelo celular.");
      }
      baixarNoNavegador(bytes, nome, tipo);
      ultimoArquivo = null;
      mostrarResultado(frases.baixado + " com o nome " + nome + ". Ele fica na pasta de downloads do navegador.", false);
      return;
    }

    var base64 = paraBase64(bytes);
    var resposta = await plugin("salvar", { nome: nome, tipo: tipo, base64: base64 });
    ultimoArquivo = { nome: resposta.nome || nome, tipo: tipo, base64: base64, uri: resposta.uri || "" };
    if (resposta.salvo) {
      mostrarResultado(frases.salvo + " na pasta " + resposta.pasta + ", com o nome " + ultimoArquivo.nome + ".", true);
    } else {
      // Android 9 ou mais antigo nao deixa o app gravar na pasta Download sem pedir permissao.
      // Nesse caso o plugin abre a janela de compartilhar, e a pessoa escolhe onde guardar.
      mostrarResultado("Escolha na janela que abriu onde guardar o arquivo " + nome + ", por exemplo no Drive ou nos arquivos do celular.", true);
    }
  }

  // Tranca os botoes enquanto um arquivo esta sendo feito e mostra no botao o que esta acontecendo.
  async function trabalhar(botao, textoOcupado, tarefa) {
    if (ocupado) return;
    ocupado = true;
    var conteudo = botao.innerHTML;
    botao.textContent = textoOcupado;
    atualizarBotoes();
    try {
      await tarefa();
    } catch (erro) {
      UI.recado(erro.message || "Não deu certo. Tente de novo.", "erro");
    } finally {
      ocupado = false;
      botao.innerHTML = conteudo;
      atualizarBotoes();
    }
  }

  // ===== Carregar a ficha =====

  function travarTudo() {
    endereco = "";
    atualizarBotoes();
    UI.elemento("#folha").hidden = true;
  }

  async function carregar() {
    atualizarBotoes();

    if (!sessao.idPaciente) {
      UI.mostrarErro(caixaErro, "Preencha a ficha médica antes de imprimir. O QR Code nasce junto com ela.");
      travarTudo();
      return;
    }

    try {
      ficha = await Api.buscarFicha(sessao.idPaciente);
    } catch (erro) {
      UI.mostrarErro(caixaErro, "Não consegui carregar a ficha. " + erro.message);
      travarTudo();
      return;
    }

    if (ficha.qrAtivo === false) {
      UI.mostrarErro(caixaErro, "Este QR Code está cancelado. Gere um código novo na ficha antes de imprimir.");
      travarTudo();
      return;
    }

    endereco = UI.urlDaFicha(ficha.tokenQr);
    avisarAlcance();

    // Desenho uma vez na hora, com a fonte que tiver, e de novo quando as fontes da marca chegarem.
    desenhar();
    await Etiquetas.prepararFontes();
    desenhar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pedirDesenho);
  }

  // Papel impresso nao se corrige depois. Se o endereco nao abre de qualquer lugar, aviso antes.
  function avisarAlcance() {
    var aviso = UI.elemento("#avisoEndereco");
    var alcance = UI.alcanceDoEndereco(endereco);
    if (alcance === "local") {
      aviso.textContent = "Atenção: este QR Code só abre neste computador. Abra o BioShield pelo endereço público do servidor antes de imprimir.";
    } else if (alcance === "wifi") {
      aviso.textContent = "Atenção: este QR Code só abre para quem estiver no mesmo wifi do servidor. Pelo 4G ele não abre.";
    }
    aviso.hidden = alcance === "";
  }

  // ===== Eventos =====

  ["#textoEtiqueta", "#extraEtiqueta", "#mostrarNome", "#nivelCorrecao"].forEach(function (seletor) {
    UI.elemento(seletor).addEventListener("input", pedirDesenho);
    UI.elemento(seletor).addEventListener("change", pedirDesenho);
  });

  marcadores.forEach(function (marcador) {
    marcador.addEventListener("change", pedirDesenho);
  });

  // Quem imprime pelo menu do navegador tambem leva a folha atualizada.
  window.addEventListener("beforeprint", desenhar);

  botaoImprimir.addEventListener("click", function () {
    desenhar();
    if (!nativo) {
      if (Api.noApp) {
        UI.recado("Este app está desatualizado. Instale a versão nova do BioShield para imprimir pelo celular.", "erro");
        return;
      }
      window.print();
      return;
    }
    trabalhar(botaoImprimir, "Abrindo a impressão", function () {
      return plugin("imprimir", { titulo: "Etiquetas BioShield" });
    });
  });

  botaoPdf.addEventListener("click", function () {
    trabalhar(botaoPdf, "Gerando o PDF", async function () {
      var bytes = await Etiquetas.pdfDaFolha(dadosAtuais());
      await entregar(bytes, nomeArquivo("etiquetas", "pdf"), "application/pdf", {
        salvo: "O PDF da folha foi salvo",
        baixado: "O PDF da folha foi baixado"
      });
    });
  });

  botoesImagem.forEach(function (botao) {
    botao.addEventListener("click", function () {
      var modelo = Etiquetas.modelo(botao.dataset.modelo);
      var nome = modelo.nome.toLowerCase();
      var feminino = /^etiqueta/.test(nome);
      trabalhar(botao, "Gerando", async function () {
        var bytes = await Etiquetas.pngDaEtiqueta(modelo.chave, dadosAtuais());
        await entregar(bytes, nomeArquivo(modelo.arquivo, "png"), "image/png", {
          salvo: "A imagem " + (feminino ? "da " : "do ") + nome + " foi salva",
          baixado: "A imagem " + (feminino ? "da " : "do ") + nome + " foi baixada"
        });
      });
    });
  });

  botaoAbrir.addEventListener("click", function () {
    if (!ultimoArquivo || !ultimoArquivo.uri) return;
    plugin("abrir", { uri: ultimoArquivo.uri, tipo: ultimoArquivo.tipo }).catch(function (erro) {
      UI.recado(erro.message || "Não consegui abrir o arquivo.", "erro");
    });
  });

  UI.elemento("#compartilharArquivo").addEventListener("click", function () {
    if (!ultimoArquivo) return;
    plugin("compartilhar", {
      nome: ultimoArquivo.nome,
      tipo: ultimoArquivo.tipo,
      base64: ultimoArquivo.base64,
      titulo: "Compartilhar etiquetas do BioShield"
    }).catch(function (erro) {
      UI.recado(erro.message || "Não consegui compartilhar o arquivo.", "erro");
    });
  });

  carregar();
})();
