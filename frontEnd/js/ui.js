// Pecas que todas as telas usam: guarda de sessao, barra de navegacao, recados, formatacao e escape.
// Fica separado do api.js pra esse arquivo cuidar so do que aparece na tela.

(function (escopo) {
  "use strict";

  var ICONES = {
    perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6z"/><circle cx="12" cy="10.5" r="2.2"/><path d="M8.4 16.3a3.9 3.9 0 0 1 7.2 0"/></svg>',
    medicamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5"/><path d="M12 8.5v7"/><circle cx="7" cy="12" r="1"/></svg>',
    doses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/></svg>',
    cuidador: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M17 10.5c1.6-1.3 4-.2 4 1.7 0 1.6-2.1 3.1-4 4.3-1.9-1.2-4-2.7-4-4.3 0-1.9 2.4-3 4-1.7z"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5l8 3.2v6.1c0 4.8-3.3 9-8 10.2-4.7-1.2-8-5.4-8-10.2V5.7z"/><path d="M12 8.2v7.1M8.5 11.7h7"/></svg>',
    sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>',
    certo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.2M12 17.2v.1"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/></svg>',
    pilula: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/></svg>'
  };

  function icone(nome) {
    return ICONES[nome] || "";
  }

  function inicial(nome) {
    return String(nome || "?").trim().charAt(0).toUpperCase() || "?";
  }

  var PAGINAS = [
    { chave: "perfil", rotulo: "Ficha", arquivo: "perfil.html" },
    { chave: "medicamentos", rotulo: "Remédios", arquivo: "medicamentos.html" },
    { chave: "doses", rotulo: "Doses", arquivo: "doses.html" },
    { chave: "cuidador", rotulo: "Cuidador", arquivo: "cuidador.html" }
  ];

  function escapar(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function elemento(seletor, raiz) {
    return (raiz || document).querySelector(seletor);
  }

  function todos(seletor, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));
  }

  function exigirSessao() {
    var sessao = escopo.Api.sessao();
    if (!sessao || !sessao.usuario) {
      var base = location.pathname.indexOf("/pages/") !== -1 ? "../index.html" : "index.html";
      location.replace(base);
      return null;
    }
    return sessao;
  }

  function montarNavegacao(atual) {
    var nav = document.createElement("nav");
    nav.className = "navegacao";
    nav.setAttribute("aria-label", "Telas do aplicativo");
    // A marca so aparece no computador, quando a navegacao vira barra lateral.
    nav.innerHTML = '<p class="marca navegacao-marca">' + ICONES.escudo.replace("<svg ", '<svg class="escudo" ') + "Bio<span>Shield</span></p>" +
      PAGINAS.map(function (pagina) {
        var marcado = pagina.chave === atual ? ' aria-current="page"' : "";
        return '<a href="' + pagina.arquivo + '"' + marcado + '>' + ICONES[pagina.chave] + "<span>" + pagina.rotulo + "</span></a>";
      }).join("");
    document.body.appendChild(nav);
  }

  function montarTopo(alvo, titulo, descricao) {
    var sessao = escopo.Api.sessao();
    var nome = sessao && sessao.usuario ? sessao.usuario.nome.split(" ")[0] : "";
    alvo.innerHTML =
      ICONES.escudo.replace("<svg ", '<svg class="topo-desenho" ') +
      '<div class="topo-linha">' +
        '<p class="marca">' + ICONES.escudo.replace("<svg ", '<svg class="escudo" ') + "Bio<span>Shield</span></p>" +
        '<div class="topo-usuario">' +
          (nome ? '<span class="avatar" aria-hidden="true">' + escapar(inicial(nome)) + "</span>" : "") +
          '<button type="button" class="botao-sair" id="sair">' + ICONES.sair + "Sair</button>" +
        "</div>" +
      "</div>" +
      "<h1>" + escapar(titulo) + "</h1>" +
      (descricao ? '<p class="topo-descricao">' + escapar(descricao.replace("{nome}", nome)) + "</p>" : "");

    elemento("#sair", alvo).addEventListener("click", function () {
      escopo.Api.encerrarSessao();
      location.replace("../index.html");
    });
  }

  var recadoAtual = null;

  function recado(texto, tipo) {
    if (recadoAtual) recadoAtual.remove();
    var caixa = document.createElement("div");
    caixa.className = "recado" + (tipo === "erro" ? " recado-erro" : "");
    caixa.setAttribute("role", "status");
    caixa.innerHTML = (tipo === "erro" ? ICONES.alerta : ICONES.certo) + "<span></span>";
    caixa.querySelector("span").textContent = texto;
    document.body.appendChild(caixa);
    recadoAtual = caixa;
    requestAnimationFrame(function () { caixa.classList.add("visivel"); });
    setTimeout(function () {
      caixa.classList.remove("visivel");
      setTimeout(function () { caixa.remove(); }, 250);
    }, 3200);
  }

  async function marcarModo() {
    if (!escopo.Api) return;
    var modo = await escopo.Api.modo();
    if (modo !== "demo") return;
    // Com cabecalho, o aviso vira um selo pequeno dentro dele, pra nao roubar a atencao da tela.
    var topo = elemento(".topo");
    if (topo) {
      var selo = document.createElement("p");
      selo.className = "selo-demo";
      selo.title = "O backend não respondeu, então os dados são fictícios e ficam só neste navegador.";
      selo.innerHTML = "<i></i> Modo demonstração, dados fictícios";
      topo.appendChild(selo);
      return;
    }
    var faixa = document.createElement("div");
    faixa.className = "aviso-demo";
    faixa.innerHTML = "<span></span> Modo demonstração. O backend não respondeu, então os dados são fictícios e ficam só neste navegador.";
    var app = elemento(".app") || document.body;
    app.insertBefore(faixa, app.firstChild);
  }

  function formatarTelefone(bruto) {
    var digitos = String(bruto || "").replace(/\D/g, "");
    if (digitos.length === 11) return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 7) + " " + digitos.slice(7);
    if (digitos.length === 10) return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 6) + " " + digitos.slice(6);
    return bruto || "";
  }

  function formatarHora(valorIso) {
    if (!valorIso) return "";
    var data = new Date(valorIso);
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatarDataHora(valorIso) {
    if (!valorIso) return "";
    var data = new Date(valorIso);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " às " + formatarHora(valorIso);
  }

  function formatarData(valor) {
    if (!valor) return "";
    var data = valor.length === 10 ? new Date(valor + "T12:00:00") : new Date(valor);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function descreverFrequencia(horas) {
    var numero = Number(horas);
    if (numero === 24) return "1 vez por dia";
    if (numero === 168) return "1 vez por semana";
    if (numero < 24 && 24 % numero === 0) return (24 / numero) + " vezes por dia";
    return "a cada " + numero + " horas";
  }

  function quandoFor(valorIso) {
    if (!valorIso) return "sem próxima dose";
    var alvo = new Date(valorIso);
    var agora = new Date();
    var mesmoDia = alvo.toDateString() === agora.toDateString();
    var amanha = new Date(agora); amanha.setDate(amanha.getDate() + 1);
    if (mesmoDia) return "hoje às " + formatarHora(valorIso);
    if (alvo.toDateString() === amanha.toDateString()) return "amanhã às " + formatarHora(valorIso);
    return formatarData(valorIso) + " às " + formatarHora(valorIso);
  }

  function urlDaFicha(tokenQr) {
    var configurada = (escopo.BioShieldConfig && escopo.BioShieldConfig.URL_PUBLICA_EMERGENCIA) || "";
    if (configurada) {
      return configurada.replace(/\/$/, "") + "?token=" + tokenQr;
    }
    var base = location.href.split("?")[0].split("#")[0].replace(/[^/]*$/, "");
    if (base.indexOf("/pages/") === -1) base += "pages/";
    return base + "emergencia.html?token=" + tokenQr;
  }

  function mostrarErro(alvo, mensagem) {
    if (!alvo) return;
    alvo.className = "aviso aviso-erro";
    alvo.textContent = mensagem;
    alvo.hidden = false;
  }

  function limparErro(alvo) {
    if (alvo) alvo.hidden = true;
  }

  escopo.UI = {
    escapar: escapar,
    icone: icone,
    inicial: inicial,
    elemento: elemento,
    todos: todos,
    exigirSessao: exigirSessao,
    montarNavegacao: montarNavegacao,
    montarTopo: montarTopo,
    recado: recado,
    marcarModo: marcarModo,
    formatarTelefone: formatarTelefone,
    formatarHora: formatarHora,
    formatarData: formatarData,
    formatarDataHora: formatarDataHora,
    descreverFrequencia: descreverFrequencia,
    quandoFor: quandoFor,
    urlDaFicha: urlDaFicha,
    mostrarErro: mostrarErro,
    limparErro: limparErro
  };
})(window);
