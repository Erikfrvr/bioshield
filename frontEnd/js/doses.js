// Script da tela de doses do dia.
// Monta a lista de horarios, marca a dose como tomada e atualiza a barra de adesao na hora.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var agenda = UI.elemento("#agenda");
  var carregando = UI.elemento("#carregando");
  var vazio = UI.elemento("#vazio");
  var caixaErro = UI.elemento("#erro");

  UI.montarTopo(UI.elemento("#topo"), "Doses de hoje", "Confirme cada tomada e a adesão sobe.");
  UI.montarNavegacao("doses");
  UI.marcarModo();

  var dataHoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  UI.elemento("#dataHoje").textContent = dataHoje;

  // Comprimento da volta do anel de adesao (2 x pi x raio 52 do SVG).
  var VOLTA_DO_ANEL = 2 * Math.PI * 52;

  function formatarDosagem(valor) {
    var numero = Number(valor);
    return Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace(".", ",");
  }

  function ehAgora(dose) {
    if (dose.status !== "prevista") return false;
    var distancia = Math.abs(new Date(dose.horarioPrevisto).getTime() - Date.now());
    return distancia <= 60 * 60 * 1000;
  }

  function cartaoDose(dose) {
    var bloco = document.createElement("article");
    var classe = "dose";
    if (dose.status === "tomada") classe += " dose-tomada";
    else if (dose.status === "perdida") classe += " dose-perdida";
    else if (ehAgora(dose)) classe += " dose-agora";
    bloco.className = classe;

    var selo = "";
    if (dose.status === "tomada") {
      selo = '<span class="dose-selo dose-selo-tomada">' + UI.icone("certo") + "Tomada às " + UI.formatarHora(dose.horarioConfirmado) + "</span>";
    } else if (dose.status === "perdida") {
      selo = '<span class="dose-selo dose-selo-perdida">' + UI.icone("alerta") + "Passou do horário sem confirmação</span>";
    } else if (ehAgora(dose)) {
      selo = '<span class="dose-selo dose-selo-agora">' + UI.icone("relogio") + "Está na hora</span>";
    }

    bloco.innerHTML =
      '<p class="dose-hora">' + UI.formatarHora(dose.horarioPrevisto) + "</p>" +
      '<div class="dose-corpo">' +
        "<h2>" + UI.escapar(dose.nomeMedicamento) + "</h2>" +
        "<p>" + formatarDosagem(dose.dosagem) + " " + UI.escapar(dose.unidade) + "</p>" +
        selo +
      "</div>";

    if (dose.status !== "tomada") {
      var acao = document.createElement("div");
      acao.className = "dose-acao";
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "botao" + (dose.status === "perdida" ? " botao-secundario" : "");
      botao.innerHTML = UI.icone("certo") + (dose.status === "perdida" ? "Tomei mesmo assim" : "Confirmar que tomei");
      botao.addEventListener("click", async function () {
        botao.disabled = true;
        botao.textContent = "Confirmando";
        try {
          await Api.confirmarDose(dose.id);
          UI.recado("Dose confirmada.");
          carregar();
        } catch (erro) {
          UI.recado("Não consegui confirmar. " + erro.message, "erro");
          botao.disabled = false;
          botao.textContent = "Confirmar que tomei";
        }
      });
      acao.appendChild(botao);
      bloco.appendChild(acao);
    }

    return bloco;
  }

  function preencherAdesao(dados) {
    var hoje = dados.hoje || { previstas: 0, tomadas: 0, percentual: 0 };
    var semana = dados.semana || { previstas: 0, tomadas: 0, percentual: 0, perdidas: 0 };

    UI.elemento("#percentualHoje").textContent = hoje.percentual + "%";
    UI.elemento("#resumoHoje").textContent = hoje.previstas
      ? hoje.tomadas + " de " + hoje.previstas + " doses confirmadas hoje"
      : "Nenhuma dose prevista para hoje";

    var barra = UI.elemento("#barraHoje");
    var anel = UI.elemento("#anelHoje");
    var fracao = Math.max(0, Math.min(100, Number(hoje.percentual) || 0)) / 100;
    anel.style.strokeDasharray = VOLTA_DO_ANEL;
    anel.style.strokeDashoffset = VOLTA_DO_ANEL * (1 - fracao);
    barra.classList.toggle("cheia", hoje.percentual >= 80);
    barra.setAttribute("aria-label", hoje.percentual + "% das doses de hoje confirmadas");

    UI.elemento("#percentualSemana").textContent = semana.percentual + "%";
    UI.elemento("#perdidasSemana").textContent = String(semana.perdidas === undefined ? 0 : semana.perdidas);
  }

  async function carregar() {
    if (!sessao.idPaciente) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Preencha a ficha médica antes de acompanhar as doses.");
      return;
    }

    try {
      var doses = await Api.dosesDeHoje(sessao.idPaciente);
      carregando.hidden = true;
      agenda.innerHTML = "";
      doses.forEach(function (dose) { agenda.appendChild(cartaoDose(dose)); });
      vazio.hidden = doses.length > 0;
    } catch (erro) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Não consegui carregar a agenda. " + erro.message);
    }

    try {
      preencherAdesao(await Api.adesao(sessao.idPaciente));
    } catch (erro) {
      preencherAdesao({});
    }
  }

  carregar();
})();
