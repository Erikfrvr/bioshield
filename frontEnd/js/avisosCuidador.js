// Avisos de dose perdida para o cuidador.
// Quando alguem que o cuidador acompanha passa 60 minutos sem confirmar uma dose (a tolerancia do backend),
// o celular do cuidador avisa, mesmo com o app fechado.
//
// No app Android com servidor, quem confere e o codigo nativo do proprio projeto
// (android/app/src/main/java/br/com/bioshield/app), pelo plugin BioShieldCuidador. Ele faz uma checagem de
// tempos em tempos e marca um alarme exato para o momento em que cada dose vira perdida.
// Nao usamos o plugin oficial de tarefa em segundo plano porque ele so roda em rede com internet,
// e no evento o roteador nao tem.
// Este arquivo so liga e desliga o lado nativo, passando o endereco do servidor e o login.
//
// No navegador e no modo demonstracao, o aviso aparece enquanto o BioShield estiver aberto.
// Os textos estao listados no docs/GUIA_APK.md, na parte dos avisos do cuidador.

(function (escopo) {
  "use strict";

  var PLUGIN = "BioShieldCuidador";
  // Com a tela aberta, confere de novo nesse intervalo.
  var CONFERIR_A_CADA_MS = 2 * 60 * 1000;
  // Troca de tela nao confere de novo antes disso (a tela do cuidador sempre confere).
  var INTERVALO_MINIMO_MS = 2 * 60 * 1000;
  // Toque no aviso que nao foi tratado em 10 minutos e descartado.
  var ACAO_VALE_POR_MS = 10 * 60 * 1000;
  var MAXIMO_AVISADOS = 300;

  var CHAVE_AVISADOS = "bioshield.cuidador.avisados";
  var CHAVE_CONFERIDO = "bioshield.cuidador.conferido";
  var CHAVE_ACAO = "bioshield.cuidador.abrir";

  // ===== Armazenamento =====

  function lerJson(armazem, chave) {
    try {
      return JSON.parse(armazem.getItem(chave) || "null");
    } catch (erro) {
      return null;
    }
  }

  function gravarJson(armazem, chave, valor) {
    try {
      if (valor === null) armazem.removeItem(chave);
      else armazem.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
      // Sem armazenamento: vale so para esta tela.
    }
  }

  // ===== Ponte com o Android =====

  function pontePronta() {
    var cap = escopo.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return false;
    if (typeof cap.nativePromise !== "function" || typeof cap.addListener !== "function") return false;
    return (cap.PluginHeaders || []).some(function (plugin) { return plugin.name === PLUGIN; });
  }

  var nativo = pontePronta();

  function plugin(metodo, opcoes) {
    return escopo.Capacitor.nativePromise(PLUGIN, metodo, opcoes || {});
  }

  // ===== Onde estou =====

  function sessao() {
    var atual = escopo.Api ? escopo.Api.sessao() : null;
    return atual && atual.usuario ? atual : null;
  }

  function naEntrada() {
    return location.pathname.indexOf("/pages/") === -1;
  }

  function naTelaDoCuidador() {
    return /\/cuidador\.html$/.test(location.pathname);
  }

  function caminhoDoCuidador() {
    return naEntrada() ? "pages/cuidador.html" : "cuidador.html";
  }

  // ===== Textos =====

  function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0];
  }

  function hora(valorIso) {
    return escopo.UI ? escopo.UI.formatarHora(valorIso) : new Date(valorIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function textoDoAviso(alerta) {
    return primeiroNome(alerta.nomePaciente) + " não confirmou a dose de " + alerta.nomeMedicamento + " das " + hora(alerta.horarioPrevisto) + ".";
  }

  // ===== Situacao =====

  var situacaoAtual = { acompanha: 0, perdidas: [], conferido: false };

  function avisarMudanca() {
    document.dispatchEvent(new CustomEvent("bioshield:avisos-cuidador-mudou"));
  }

  // A mesma dose so vira aviso uma vez. A chave leva o horario junto, porque na demonstracao os ids se repetem
  // de uma abertura do app para a outra.
  function chaveDoAlerta(alerta) {
    return alerta.idDose + "|" + alerta.horarioPrevisto;
  }

  function lerAvisados(idUsuario) {
    var todos = lerJson(localStorage, CHAVE_AVISADOS) || {};
    return todos[idUsuario] || [];
  }

  function gravarAvisados(idUsuario, chaves) {
    var todos = lerJson(localStorage, CHAVE_AVISADOS) || {};
    todos[idUsuario] = chaves.slice(-MAXIMO_AVISADOS);
    gravarJson(localStorage, CHAVE_AVISADOS, todos);
  }

  // Sem o celular para avisar (navegador), o aviso aparece como recado por cima da tela.
  function mostrarNaTela(novos) {
    if (!escopo.UI) return;
    var texto = novos.length === 1
      ? textoDoAviso(novos[0])
      : novos.length + " doses não foram confirmadas por quem você acompanha. Veja o painel do cuidador.";
    escopo.UI.recado(texto, "erro");
  }

  // ===== Conferir =====

  function donoDaSessao(atual) {
    return atual.usuario.id + ":" + String(atual.token || "").slice(-16);
  }

  async function executarConferencia(forcar) {
    var atual = sessao();
    if (!atual) {
      await desligar();
      return;
    }

    var dono = donoDaSessao(atual);
    var anterior = lerJson(sessionStorage, CHAVE_CONFERIDO);
    if (!forcar && anterior && anterior.dono === dono && Date.now() - anterior.em < INTERVALO_MINIMO_MS) {
      situacaoAtual = anterior.situacao || situacaoAtual;
      avisarMudanca();
      return;
    }

    var modo;
    try {
      modo = await escopo.Api.modo();
    } catch (erro) {
      return;
    }
    var conexao = escopo.Api.conexao();

    if (nativo && modo === "api") {
      // No app com servidor, o lado nativo confere e mostra as notificacoes. Daqui so vai o endereco e o login.
      if (!conexao || !conexao.origem) return;
      try {
        var resposta = await plugin("configurar", { servidor: conexao.origem, token: atual.token, idCuidador: atual.usuario.id });
        if (resposta && resposta.ok) {
          situacaoAtual = { acompanha: resposta.acompanha || 0, perdidas: resposta.perdidas || [], conferido: true };
          if (resposta.novos) document.dispatchEvent(new CustomEvent("bioshield:cuidador-mudou"));
        }
      } catch (erro) {
        return;
      }
    } else {
      if (modo === "api" && (!conexao || !conexao.origem)) return;
      var alertas;
      try {
        alertas = await escopo.Api.alertasDoCuidador(atual.usuario.id);
      } catch (erro) {
        return;
      }
      situacaoAtual = { acompanha: alertas.acompanha || 0, perdidas: alertas.perdidas || [], conferido: true };

      var avisados = lerAvisados(atual.usuario.id);
      var novos = situacaoAtual.perdidas.filter(function (alerta) { return avisados.indexOf(chaveDoAlerta(alerta)) === -1; });
      if (novos.length) {
        if (nativo) {
          // Demonstracao dentro do app: o aviso sai como notificacao de verdade, pelo mesmo lado nativo.
          try {
            await plugin("mostrarAlertas", { alertas: novos });
          } catch (erro) {
            mostrarNaTela(novos);
          }
        } else {
          mostrarNaTela(novos);
        }
        gravarAvisados(atual.usuario.id, avisados.concat(novos.map(chaveDoAlerta)));
        document.dispatchEvent(new CustomEvent("bioshield:cuidador-mudou"));
      }
    }

    gravarJson(sessionStorage, CHAVE_CONFERIDO, { dono: dono, em: Date.now(), situacao: situacaoAtual });
    avisarMudanca();
  }

  var fila = Promise.resolve();

  // Uma conferencia por vez. forcar ignora o intervalo minimo (vinculo novo, vinculo desfeito, tela do cuidador).
  function conferir(forcar) {
    fila = fila.then(function () { return executarConferencia(forcar); }).catch(function () { /* tenta na proxima */ });
    return fila;
  }

  // Saiu da conta ou trocou de servidor: o celular para de conferir e os avisos dessa conta somem da barra.
  async function desligar() {
    situacaoAtual = { acompanha: 0, perdidas: [], conferido: false };
    gravarJson(sessionStorage, CHAVE_CONFERIDO, null);
    if (nativo) {
      try {
        await plugin("desligar");
      } catch (erro) {
        // Na proxima abertura tento de novo.
      }
    }
  }

  // ===== Toque no aviso =====

  function temAcaoPendente() {
    var pendente = lerJson(sessionStorage, CHAVE_ACAO);
    return Boolean(pendente && Date.now() - pendente.em < ACAO_VALE_POR_MS);
  }

  // O toque no aviso abre o app. Com conta, leva direto para o painel do cuidador.
  // Na entrada, quem leva e o login.js, depois de achar o servidor.
  function tratarAcaoPendente() {
    if (!temAcaoPendente()) return;
    if (!sessao()) {
      gravarJson(sessionStorage, CHAVE_ACAO, null);
      return;
    }
    if (naTelaDoCuidador()) {
      gravarJson(sessionStorage, CHAVE_ACAO, null);
      return;
    }
    if (!naEntrada()) location.replace(caminhoDoCuidador());
  }

  // ===== Cartao da tela do cuidador =====

  var ICONE_SINO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>';

  async function situacaoDoCartao() {
    var modo = "api";
    try {
      modo = await escopo.Api.modo();
    } catch (erro) {
      // fica api
    }
    if (!situacaoAtual.acompanha) {
      return {
        tipo: "vazio", ok: true,
        titulo: "Avisos de dose perdida",
        texto: "Quando você acompanhar alguém, o celular avisa se essa pessoa passar 1 hora sem confirmar uma dose.",
        botoes: []
      };
    }
    if (modo === "demo") {
      return {
        tipo: "demo", ok: true,
        titulo: "Avisos com o app aberto",
        texto: "Na demonstração, o aviso de dose perdida aparece enquanto o BioShield estiver aberto. Com o servidor, o celular avisa mesmo fechado.",
        botoes: []
      };
    }
    if (!nativo) {
      return {
        tipo: "navegador", ok: true,
        titulo: "Avisos com a tela aberta",
        texto: "No navegador, o aviso de dose perdida aparece enquanto o BioShield estiver aberto. No app Android ele chega mesmo com o celular bloqueado.",
        botoes: []
      };
    }
    var estado = escopo.Lembretes ? await escopo.Lembretes.estadoPermissao() : "granted";
    if (estado === "prompt") {
      return {
        tipo: "desligado", ok: false,
        titulo: "Avisos desligados",
        texto: "Para o celular avisar quando alguém que você acompanha perder uma dose, permita as notificações do BioShield.",
        botoes: ["ligar"]
      };
    }
    if (estado === "denied") {
      return {
        tipo: "bloqueado", ok: false,
        titulo: "Notificações bloqueadas",
        texto: "O celular está bloqueando os avisos do BioShield. Abra as Configurações do celular, toque em Apps, depois em BioShield, depois em Notificações, e permita.",
        botoes: ["conferir"]
      };
    }
    return {
      tipo: "ligado", ok: true,
      titulo: "Avisos ligados",
      texto: "Se alguém que você acompanha passar 1 hora sem confirmar uma dose, o celular avisa, mesmo com o app fechado. Quando o celular está economizando bateria, o aviso pode demorar alguns minutos a mais.",
      botoes: []
    };
  }

  var ROTULOS = {
    ligar: "Ligar os avisos",
    conferir: "Já permiti, conferir de novo"
  };

  async function desenharCartao(alvo) {
    var atual = await situacaoDoCartao();
    var ultima = situacaoAtual.perdidas[0];
    var linha = !situacaoAtual.acompanha ? "" : ultima
      ? "Última dose não confirmada: " + textoDoAviso(ultima).replace(/\.$/, "") + "."
      : "Nenhuma dose perdida nas últimas 24 horas.";

    alvo.dataset.estado = atual.tipo;
    alvo.innerHTML =
      '<div class="alarme-cabecalho">' +
        '<span class="icone-tile' + (atual.ok ? "" : " coral") + '" aria-hidden="true">' + ICONE_SINO + "</span>" +
        "<div>" +
          '<h2 id="tituloAvisos">' + escopo.UI.escapar(atual.titulo) + "</h2>" +
          '<p class="alarme-situacao">' + escopo.UI.escapar(atual.texto) + "</p>" +
        "</div>" +
      "</div>" +
      (linha && atual.ok ? '<p class="alarme-proximo' + (ultima ? " alarme-proximo-alerta" : "") + '">' + escopo.UI.escapar(linha) + "</p>" : "") +
      (atual.botoes.length ? '<div class="alarme-acoes">' +
        atual.botoes.map(function (chave) {
          return '<button type="button" class="botao botao-coral" data-aviso="' + chave + '">' + ROTULOS[chave] + "</button>";
        }).join("") +
      "</div>" : "");

    escopo.UI.todos("[data-aviso]", alvo).forEach(function (botao) {
      botao.addEventListener("click", async function () {
        botao.disabled = true;
        try {
          var estado = escopo.Lembretes ? await escopo.Lembretes.pedirPermissao() : "granted";
          if (estado === "granted") {
            escopo.UI.recado("Avisos ligados.");
            await conferir(true);
          } else {
            escopo.UI.recado("O celular não deixou ligar os avisos. Siga o passo a passo do cartão.", "erro");
          }
        } finally {
          botao.disabled = false;
          desenharCartao(alvo);
        }
      });
    });
    alvo.hidden = false;
  }

  // A tela do cuidador mostra o cartao, redesenha quando a situacao muda e, na primeira vez com alguem
  // acompanhado, ja pede a permissao de notificacao.
  function montarCartao(alvo) {
    if (!alvo) return;
    var pediu = false;
    var redesenhar = function () {
      desenharCartao(alvo);
      if (!pediu && situacaoAtual.acompanha && nativo && escopo.Lembretes) {
        pediu = true;
        escopo.Lembretes.pedirSeNuncaPediu().then(function () { desenharCartao(alvo); });
      }
    };
    document.addEventListener("bioshield:avisos-cuidador-mudou", redesenhar);
    document.addEventListener("bioshield:alarme-mudou", function () { desenharCartao(alvo); });
    redesenhar();
  }

  // ===== Partida =====

  function iniciar() {
    if (nativo) {
      escopo.Capacitor.addListener(PLUGIN, "avisoTocado", function (dados, erro) {
        if (erro) return;
        gravarJson(sessionStorage, CHAVE_ACAO, { em: Date.now() });
        tratarAcaoPendente();
      });
    }

    // Na entrada so trato o toque no aviso. Sem conta, o celular para de conferir.
    if (naEntrada()) {
      if (!sessao()) desligar();
      return;
    }

    tratarAcaoPendente();
    conferir(naTelaDoCuidador());
    setInterval(function () {
      if (!document.hidden) conferir(true);
    }, CONFERIR_A_CADA_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) conferir(false);
    });
  }

  escopo.AvisosCuidador = {
    nativo: nativo,
    conferir: conferir,
    desligar: desligar,
    temAcaoPendente: temAcaoPendente,
    montarCartao: montarCartao,
    // Usado pelos testes automaticos.
    _textoDoAviso: textoDoAviso
  };

  iniciar();
})(window);
