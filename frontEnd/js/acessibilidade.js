// Acessibilidade do app: tamanho da letra e contraste reforcado.
// Em cada tela aparece um botao pequeno com o simbolo de acessibilidade. Tocando nele abrem as opcoes:
// A menos, A mais e Contraste. A escolha fica guardada no navegador, entao vale para todas as telas
// e para a proxima visita.

(function (escopo) {
  "use strict";

  var CHAVE_LETRA = "bioshield.letra";
  var CHAVE_CONTRASTE = "bioshield.contraste";

  // Tamanho da letra base em pixels. O primeiro e o padrao do style.css.
  var TAMANHOS = [17, 19, 21, 23];

  var ICONE_ACESSIBILIDADE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.7"/><path d="M5 9h14M12 9v5.5M12 14.5l-3.4 5.5M12 14.5l3.4 5.5"/></svg>';
  var ICONE_CONTRASTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>';

  var nivel = lerNivel();
  var contraste = ler(CHAVE_CONTRASTE) === "1";
  var botaoMenor = null;
  var botaoMaior = null;
  var botaoContraste = null;

  function ler(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (erro) {
      return null;
    }
  }

  function guardar(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch (erro) {
      // Navegador sem armazenamento: a escolha vale so para esta tela.
    }
  }

  // ===== Tamanho da letra =====

  function lerNivel() {
    var guardado = ler(CHAVE_LETRA);
    var numero = Number(guardado);
    return guardado !== null && Number.isInteger(numero) && numero >= 0 && numero < TAMANHOS.length ? numero : 0;
  }

  function aplicarLetra() {
    // No nivel padrao eu tiro o estilo, assim o style.css continua mandando (inclusive a regra de tela pequena).
    document.documentElement.style.fontSize = nivel === 0 ? "" : TAMANHOS[nivel] + "px";
    if (botaoMenor) botaoMenor.disabled = nivel === 0;
    if (botaoMaior) botaoMaior.disabled = nivel === TAMANHOS.length - 1;
  }

  function mudarLetra(passo) {
    var novo = Math.max(0, Math.min(TAMANHOS.length - 1, nivel + passo));
    if (novo === nivel) return;
    nivel = novo;
    guardar(CHAVE_LETRA, String(nivel));
    aplicarLetra();
  }

  // ===== Contraste reforcado =====

  // As cores do contraste ficam no style.css, na classe alto-contraste. Aqui eu so ligo e desligo.
  function aplicarContraste() {
    document.documentElement.classList.toggle("alto-contraste", contraste);
    if (botaoContraste) botaoContraste.setAttribute("aria-pressed", contraste ? "true" : "false");
  }

  function mudarContraste() {
    contraste = !contraste;
    guardar(CHAVE_CONTRASTE, contraste ? "1" : "0");
    aplicarContraste();
  }

  // ===== Botao e opcoes =====

  function montar() {
    // A folha de etiquetas e so para imprimir, nao leva o botao.
    if (document.body.classList.contains("pagina-imprimir")) return;

    // No login o botao fica em cima do cartao. Nas outras telas, no comeco do conteudo.
    var alvo = document.querySelector(".entrada-lado") || document.querySelector("main");
    if (!alvo) return;

    var barra = document.createElement("div");
    barra.className = "acessibilidade";
    barra.innerHTML =
      '<div class="acessibilidade-caixa">' +
        '<div class="acessibilidade-opcoes" id="opcoesAcessibilidade" role="group" aria-label="Opções de acessibilidade" hidden>' +
          '<button type="button" class="acessibilidade-botao" id="letraMenor" aria-label="Diminuir o tamanho da letra">A<small>−</small></button>' +
          '<button type="button" class="acessibilidade-botao acessibilidade-maior" id="letraMaior" aria-label="Aumentar o tamanho da letra">A<small>+</small></button>' +
          '<button type="button" class="acessibilidade-botao" id="contraste" aria-pressed="false" aria-label="Contraste reforçado">' + ICONE_CONTRASTE + "</button>" +
        "</div>" +
        '<button type="button" class="acessibilidade-botao acessibilidade-abrir" id="abrirAcessibilidade" aria-expanded="false" aria-controls="opcoesAcessibilidade" aria-label="Acessibilidade">' + ICONE_ACESSIBILIDADE + "</button>" +
      "</div>";

    alvo.insertBefore(barra, alvo.firstChild);

    var opcoes = barra.querySelector("#opcoesAcessibilidade");
    var botaoAbrir = barra.querySelector("#abrirAcessibilidade");
    botaoMenor = barra.querySelector("#letraMenor");
    botaoMaior = barra.querySelector("#letraMaior");
    botaoContraste = barra.querySelector("#contraste");

    botaoAbrir.addEventListener("click", function () {
      var abrir = opcoes.hidden;
      opcoes.hidden = !abrir;
      botaoAbrir.setAttribute("aria-expanded", abrir ? "true" : "false");
      if (abrir) botaoMaior.focus();
    });

    botaoMenor.addEventListener("click", function () { mudarLetra(-1); });
    botaoMaior.addEventListener("click", function () { mudarLetra(1); });
    botaoContraste.addEventListener("click", mudarContraste);

    aplicarLetra();
    aplicarContraste();
  }

  // Aplico as escolhas antes de montar o botao, pra tela ja abrir do jeito que a pessoa deixou.
  aplicarLetra();
  aplicarContraste();
  montar();
})(window);
