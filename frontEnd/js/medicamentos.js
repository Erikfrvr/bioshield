// Script da tela de medicamentos.
// Lista os remedios cadastrados, abre o formulario de cadastro e chama o delete.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var lista = UI.elemento("#lista");
  var carregando = UI.elemento("#carregando");
  var vazio = UI.elemento("#vazio");
  var caixaErro = UI.elemento("#erro");
  var janela = UI.elemento("#janela");
  var formulario = UI.elemento("#formulario");
  var erroFormulario = UI.elemento("#erroFormulario");

  UI.montarTopo(UI.elemento("#topo"), "Meus remédios", "O que você toma e quando.");
  UI.montarNavegacao("medicamentos");
  UI.marcarModo();

  function formatarDosagem(valor) {
    var numero = Number(valor);
    return Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace(".", ",");
  }

  function cartaoRemedio(remedio) {
    var encerrado = remedio.ativo === false;
    var bloco = document.createElement("article");
    bloco.className = "remedio" + (encerrado ? " encerrado" : "");
    bloco.innerHTML =
      '<div class="remedio-topo">' +
        "<div>" +
          "<h2>" + UI.escapar(remedio.nome) + "</h2>" +
          '<p class="remedio-dose">' + formatarDosagem(remedio.dosagem) + " " + UI.escapar(remedio.unidade) + ", " + UI.escapar(UI.descreverFrequencia(remedio.frequenciaHoras)) + "</p>" +
        "</div>" +
        '<span class="etiqueta ' + (encerrado ? "" : "etiqueta-sucesso") + '">' + (encerrado ? "Encerrado" : "Em uso") + "</span>" +
      "</div>" +
      '<div class="remedio-linhas">' +
        '<div class="remedio-linha"><span>Próxima dose</span><strong>' + UI.escapar(UI.quandoFor(remedio.proximaDose)) + "</strong></div>" +
        '<div class="remedio-linha"><span>Primeira dose do dia</span><strong>' + UI.escapar(String(remedio.horarioInicial).slice(0, 5)) + "</strong></div>" +
        '<div class="remedio-linha"><span>Tratamento</span><strong>' + UI.escapar(UI.formatarData(remedio.dataInicio)) +
          (remedio.dataFim ? " até " + UI.escapar(UI.formatarData(remedio.dataFim)) : " sem data de fim") + "</strong></div>" +
      "</div>" +
      '<div class="remedio-acoes"><button type="button" class="botao botao-perigo botao-pequeno">Remover</button></div>';

    bloco.querySelector("button").addEventListener("click", async function () {
      var certeza = confirm("Remover " + remedio.nome + "? O histórico de doses desse remédio sai junto.");
      if (!certeza) return;
      try {
        await Api.apagarMedicamento(remedio.id);
        UI.recado("Remédio removido.");
        carregar();
      } catch (erro) {
        UI.recado("Não consegui remover. " + erro.message, "erro");
      }
    });

    return bloco;
  }

  async function carregar() {
    if (!sessao.idPaciente) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Preencha a ficha médica antes de cadastrar remédios.");
      UI.elemento("#novoRemedio").disabled = true;
      return;
    }

    try {
      var remedios = await Api.listarMedicamentos(sessao.idPaciente);
      carregando.hidden = true;
      lista.innerHTML = "";
      remedios
        .sort(function (a, b) { return String(a.horarioInicial).localeCompare(String(b.horarioInicial)); })
        .forEach(function (remedio) { lista.appendChild(cartaoRemedio(remedio)); });
      vazio.hidden = remedios.length > 0;
    } catch (erro) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Não consegui carregar os remédios. " + erro.message);
    }
  }

  function abrir() {
    UI.limparErro(erroFormulario);
    formulario.reset();
    UI.elemento("#horario").value = "08:00";
    UI.elemento("#frequencia").value = "12";
    UI.elemento("#dataInicio").value = new Date().toISOString().slice(0, 10);
    janela.hidden = false;
    UI.elemento("#nome").focus();
  }

  function fechar() {
    janela.hidden = true;
  }

  UI.elemento("#novoRemedio").addEventListener("click", abrir);
  UI.elemento("#fechar").addEventListener("click", fechar);

  janela.addEventListener("click", function (evento) {
    if (evento.target === janela) fechar();
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !janela.hidden) fechar();
  });

  formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(erroFormulario);

    var dados = {
      idPaciente: sessao.idPaciente,
      nome: UI.elemento("#nome").value.trim(),
      dosagem: Number(UI.elemento("#dosagem").value),
      unidade: UI.elemento("#unidade").value,
      frequenciaHoras: Number(UI.elemento("#frequencia").value),
      horarioInicial: UI.elemento("#horario").value,
      dataInicio: UI.elemento("#dataInicio").value,
      dataFim: UI.elemento("#dataFim").value || null
    };

    if (!dados.nome) {
      UI.mostrarErro(erroFormulario, "Escreva o nome do remédio.");
      return;
    }
    if (!(dados.dosagem > 0)) {
      UI.mostrarErro(erroFormulario, "A dosagem precisa ser maior que zero.");
      return;
    }
    if (!dados.horarioInicial || !dados.dataInicio) {
      UI.mostrarErro(erroFormulario, "Preencha o horário da primeira dose e a data de início.");
      return;
    }
    if (dados.dataFim && dados.dataFim < dados.dataInicio) {
      UI.mostrarErro(erroFormulario, "A data de fim não pode ser antes da data de início.");
      return;
    }

    var botao = UI.elemento("#salvar");
    botao.disabled = true;
    botao.textContent = "Salvando";

    try {
      await Api.cadastrarMedicamento(dados);
      fechar();
      UI.recado("Remédio cadastrado e agenda de doses criada.");
      carregar();
    } catch (erro) {
      UI.mostrarErro(erroFormulario, "Não consegui salvar. " + erro.message);
    } finally {
      botao.disabled = false;
      botao.textContent = "Salvar remédio";
    }
  });

  carregar();
})();
