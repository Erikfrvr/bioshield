// Script do painel do cuidador.
// Carrega os pacientes vinculados e mostra adesao, proxima dose e doses perdidas de cada um.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var lista = UI.elemento("#lista");
  var carregando = UI.elemento("#carregando");
  var vazio = UI.elemento("#vazio");
  var caixaErro = UI.elemento("#erro");
  var erroVinculo = UI.elemento("#erroVinculo");

  UI.montarTopo(UI.elemento("#topo"), "Modo cuidador", "Quem você acompanha de longe.");
  UI.montarNavegacao("cuidador");
  UI.marcarModo();

  function classeDaTrilha(percentual) {
    if (percentual >= 80) return "trilha boa";
    if (percentual >= 50) return "trilha media";
    return "trilha";
  }

  function cartaoPaciente(paciente) {
    var bloco = document.createElement("article");
    bloco.className = "paciente";

    var perdidas = Number(paciente.dosesPerdidas || 0);
    var proxima = paciente.proximaDose
      ? UI.escapar(paciente.proximaDose.nomeMedicamento) + ", " + UI.escapar(UI.quandoFor(paciente.proximaDose.horarioPrevisto))
      : "sem dose programada";

    bloco.innerHTML =
      '<div class="paciente-topo">' +
        '<span class="avatar avatar-grande" aria-hidden="true">' + UI.escapar(UI.inicial(paciente.nome)) + "</span>" +
        "<h2>" + UI.escapar(paciente.nome) + "</h2>" +
        '<span class="etiqueta ' + (perdidas > 0 ? "etiqueta-grave" : "etiqueta-sucesso") + '">' +
          (perdidas > 0 ? "Atenção" : "Em dia") +
        "</span>" +
      "</div>" +
      '<div class="paciente-medidor">' +
        '<p class="rotulo"><span>Adesão dos últimos 7 dias</span><strong>' + Number(paciente.adesaoSemana || 0) + "%</strong></p>" +
        '<div class="' + classeDaTrilha(Number(paciente.adesaoSemana || 0)) + '"><i style="width:' + Number(paciente.adesaoSemana || 0) + '%"></i></div>' +
      "</div>" +
      '<div class="paciente-linhas">' +
        '<div class="paciente-linha"><span>Próxima dose</span><strong>' + proxima + "</strong></div>" +
        '<div class="paciente-linha"><span>Doses perdidas na semana</span><strong class="' + (perdidas > 0 ? "alerta" : "") + '">' + perdidas + "</strong></div>" +
      "</div>" +
      '<div class="paciente-acoes"><button type="button" class="botao-texto perigo">Parar de acompanhar</button></div>';

    bloco.querySelector("button").addEventListener("click", async function () {
      var certeza = confirm("Parar de acompanhar " + paciente.nome + "?");
      if (!certeza) return;
      try {
        await Api.desvincularCuidador(paciente.idVinculo);
        UI.recado("Vínculo encerrado.");
        carregar();
      } catch (erro) {
        UI.recado("Não consegui encerrar o vínculo. " + erro.message, "erro");
      }
    });

    return bloco;
  }

  async function carregar() {
    try {
      var pacientes = await Api.pacientesDoCuidador(sessao.usuario.id);
      carregando.hidden = true;
      lista.innerHTML = "";
      pacientes.forEach(function (paciente) { lista.appendChild(cartaoPaciente(paciente)); });
      vazio.hidden = pacientes.length > 0;
    } catch (erro) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Não consegui carregar os pacientes. " + erro.message);
    }
  }

  UI.elemento("#formularioVinculo").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(erroVinculo);

    var codigo = UI.elemento("#codigo").value.trim().toUpperCase();
    if (codigo.length < 4) {
      UI.mostrarErro(erroVinculo, "Digite o código completo que a pessoa gerou na ficha dela.");
      return;
    }

    var botao = UI.elemento("#vincular");
    botao.disabled = true;
    botao.textContent = "Vinculando";

    try {
      await Api.vincularCuidador({ idCuidador: sessao.usuario.id, codigo: codigo });
      UI.elemento("#codigo").value = "";
      UI.recado("Vínculo criado. Agora você acompanha as doses dessa pessoa.");
      carregar();
    } catch (erro) {
      var mensagem = erro.status === 404
        ? "Esse código não corresponde a ninguém. Confira com a pessoa se ele ainda é válido."
        : "Não consegui criar o vínculo. " + erro.message;
      UI.mostrarErro(erroVinculo, mensagem);
    } finally {
      botao.disabled = false;
      botao.textContent = "Acompanhar";
    }
  });

  carregar();
})();
