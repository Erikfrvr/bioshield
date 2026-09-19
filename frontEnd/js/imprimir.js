// Script da folha de impressao.
// Busca a ficha, monta o mesmo QR em quatro modelos de etiqueta e redesenha quando algo muda na tela.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var ficha = null;
  var endereco = "";

  var MODELOS = [
    { chave: "cartao", alvo: "#gradeCartao", classe: "modelo-cartao", quantidade: 2, modulos: 240, formato: "largo" },
    { chave: "adesivo", alvo: "#gradeAdesivo", classe: "modelo-adesivo", quantidade: 4, modulos: 240, formato: "alto" },
    { chave: "chaveiro", alvo: "#gradeChaveiro", classe: "modelo-chaveiro", quantidade: 5, modulos: 200, formato: "alto" },
    { chave: "mini", alvo: "#gradeMini", classe: "modelo-mini", quantidade: 6, modulos: 180, formato: "so-qr" }
  ];

  var caixaErro = UI.elemento("#erro");

  function primeiroNome(nomeCompleto) {
    var partes = String(nomeCompleto || "").trim().split(/\s+/);
    if (partes.length <= 2) return partes.join(" ");
    return partes[0] + " " + partes[partes.length - 1];
  }

  function criarEtiqueta(modelo, opcoes) {
    var caixa = document.createElement("div");
    caixa.className = "etiqueta-impressa " + modelo.classe;

    var tela = document.createElement("canvas");
    BioShieldQR.desenharNoCanvas(tela, endereco, {
      escala: Math.max(4, Math.round(modelo.modulos / 45)),
      margem: 2,
      nivel: opcoes.nivel,
      cor: "#0E3C39"
    });
    caixa.appendChild(tela);

    if (modelo.formato === "so-qr") {
      var aviso = document.createElement("p");
      aviso.className = "etiqueta-aviso";
      aviso.style.margin = "0";
      aviso.textContent = opcoes.texto;
      caixa.appendChild(aviso);
      return caixa;
    }

    var texto = document.createElement("div");
    texto.className = "texto";
    if (modelo.formato === "alto") texto.style.display = "contents";

    var linhaAviso = document.createElement("p");
    linhaAviso.className = "etiqueta-aviso";
    linhaAviso.style.margin = "0";
    linhaAviso.textContent = opcoes.texto;
    texto.appendChild(linhaAviso);

    if (opcoes.nome) {
      var linhaNome = document.createElement("p");
      linhaNome.className = "etiqueta-nome";
      linhaNome.style.margin = "0";
      linhaNome.textContent = opcoes.nome;
      texto.appendChild(linhaNome);
    }

    if (modelo.chave === "cartao") {
      var apoio = document.createElement("p");
      apoio.className = "etiqueta-apoio";
      apoio.style.margin = "0";
      apoio.textContent = "Alergias, remédios em uso, tipo sanguíneo e contato de emergência.";
      texto.appendChild(apoio);
    }

    var marca = document.createElement("p");
    marca.className = "etiqueta-marca";
    marca.style.margin = "0";
    marca.innerHTML = "Bio<span>Shield</span>";
    texto.appendChild(marca);

    caixa.appendChild(texto);
    return caixa;
  }

  function montar() {
    if (!endereco) return;

    var opcoes = {
      texto: UI.elemento("#textoEtiqueta").value.trim() || "EM CASO DE EMERGÊNCIA ESCANEIE ME",
      nome: UI.elemento("#mostrarNome").value === "sim" ? primeiroNome(ficha.nome) : "",
      nivel: UI.elemento("#nivelCorrecao").value
    };

    MODELOS.forEach(function (modelo) {
      var grade = UI.elemento(modelo.alvo);
      var secao = document.querySelector('.bloco[data-bloco="' + modelo.chave + '"]');
      var marcador = document.querySelector('.blocos input[data-bloco="' + modelo.chave + '"]');

      secao.hidden = !marcador.checked;
      grade.innerHTML = "";
      if (!marcador.checked) return;

      for (var i = 0; i < modelo.quantidade; i++) {
        grade.appendChild(criarEtiqueta(modelo, opcoes));
      }
    });
  }

  async function carregar() {
    if (!sessao.idPaciente) {
      UI.mostrarErro(caixaErro, "Preencha a ficha médica antes de imprimir. O QR Code nasce junto com ela.");
      UI.elemento("#imprimir").disabled = true;
      return;
    }

    try {
      ficha = await Api.buscarFicha(sessao.idPaciente);
    } catch (erro) {
      UI.mostrarErro(caixaErro, "Não consegui carregar a ficha. " + erro.message);
      UI.elemento("#imprimir").disabled = true;
      return;
    }

    if (ficha.qrAtivo === false) {
      UI.mostrarErro(caixaErro, "Este QR Code está cancelado. Gere um código novo na ficha antes de imprimir.");
      UI.elemento("#imprimir").disabled = true;
      UI.elemento("#folha").hidden = true;
      return;
    }

    endereco = UI.urlDaFicha(ficha.tokenQr);
    montar();
  }

  ["#textoEtiqueta", "#mostrarNome", "#nivelCorrecao"].forEach(function (seletor) {
    UI.elemento(seletor).addEventListener("input", montar);
    UI.elemento(seletor).addEventListener("change", montar);
  });

  UI.todos(".blocos input").forEach(function (marcador) {
    marcador.addEventListener("change", montar);
  });

  UI.elemento("#imprimir").addEventListener("click", function () {
    window.print();
  });

  carregar();
})();
