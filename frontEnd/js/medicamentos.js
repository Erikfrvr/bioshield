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

  // O backend manda ativo false tanto pra remedio suspenso quanto pra tratamento que passou da data de fim.
  // Separo os dois pela data: so o suspenso tem como reativar, o encerrado precisaria de outra data de fim.
  function passouDoFim(remedio) {
    return Boolean(remedio.dataFim) && String(remedio.dataFim).slice(0, 10) < dataDoInput(new Date());
  }

  function situacao(remedio) {
    if (remedio.ativo !== false) return "uso";
    return passouDoFim(remedio) ? "encerrado" : "suspenso";
  }

  var ETIQUETAS = {
    uso: '<span class="etiqueta etiqueta-sucesso">Em uso</span>',
    suspenso: '<span class="etiqueta etiqueta-moderada">Suspenso</span>',
    encerrado: '<span class="etiqueta">Encerrado</span>'
  };

  function botaoSituacao(estado) {
    if (estado === "uso") return '<button type="button" class="botao-texto" data-acao="suspender">' + UI.icone("pausa") + "Suspender</button>";
    if (estado === "suspenso") return '<button type="button" class="botao-texto" data-acao="reativar">' + UI.icone("retomar") + "Reativar</button>";
    return "";
  }

  async function trocarSituacao(remedio, ativar, botao) {
    if (!ativar) {
      var certeza = confirm("Suspender " + remedio.nome + "? As doses futuras saem da agenda até você reativar. O histórico continua.");
      if (!certeza) return;
    }
    botao.disabled = true;
    try {
      await Api.atualizarMedicamento(remedio.id, { ativo: ativar });
      UI.recado(ativar ? "Remédio reativado e agenda de doses refeita." : "Remédio suspenso.");
      carregar();
    } catch (erro) {
      botao.disabled = false;
      UI.recado("Não consegui " + (ativar ? "reativar" : "suspender") + ". " + erro.message, "erro");
    }
  }

  function cartaoRemedio(remedio) {
    var estado = situacao(remedio);
    var encerrado = estado !== "uso";
    var bloco = document.createElement("article");
    bloco.className = "remedio" + (encerrado ? " encerrado" : "");
    // A proxima dose e o que a pessoa mais procura, entao ela fica em destaque.
    // Primeira dose do dia e periodo do tratamento ficam como detalhe, em letra menor.
    bloco.innerHTML =
      '<div class="remedio-topo">' +
        '<span class="icone-tile" aria-hidden="true">' + UI.icone("pilula") + "</span>" +
        '<div class="remedio-nome">' +
          "<h2>" + UI.escapar(remedio.nome) + "</h2>" +
          '<p class="remedio-dose">' + formatarDosagem(remedio.dosagem) + " " + UI.escapar(remedio.unidade) + ", " + UI.escapar(UI.descreverFrequencia(remedio.frequenciaHoras)) + "</p>" +
        "</div>" +
        ETIQUETAS[estado] +
      "</div>" +
      '<div class="remedio-proxima">' + UI.icone("relogio") +
        "<span>Próxima dose</span><strong>" + UI.escapar(estado === "suspenso" ? "pausada" : estado === "encerrado" ? "tratamento terminou" : UI.quandoFor(remedio.proximaDose)) + "</strong>" +
      "</div>" +
      '<div class="remedio-rodape">' +
        '<p class="remedio-detalhe">Primeira dose às ' + UI.escapar(String(remedio.horarioInicial).slice(0, 5)) +
          ". Desde " + UI.escapar(UI.formatarData(remedio.dataInicio)) +
          (remedio.dataFim ? " até " + UI.escapar(UI.formatarData(remedio.dataFim)) : ", uso contínuo") + ".</p>" +
        '<div class="remedio-acoes">' +
          botaoSituacao(estado) +
          '<button type="button" class="botao-texto perigo" data-acao="remover">' + UI.icone("lixo") + "Remover</button>" +
        "</div>" +
      "</div>";

    var botaoTroca = bloco.querySelector('[data-acao="suspender"], [data-acao="reativar"]');
    if (botaoTroca) {
      botaoTroca.addEventListener("click", function () {
        trocarSituacao(remedio, estado === "suspenso", botaoTroca);
      });
    }

    bloco.querySelector('[data-acao="remover"]').addEventListener("click", async function () {
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
      UI.limparErro(caixaErro);
      lista.innerHTML = "";
      // Os que estao em uso vem primeiro. Suspenso e encerrado descem pro fim da lista.
      remedios
        .sort(function (a, b) {
          var foraA = situacao(a) !== "uso" ? 1 : 0;
          var foraB = situacao(b) !== "uso" ? 1 : 0;
          return foraA - foraB || String(a.horarioInicial).localeCompare(String(b.horarioInicial));
        })
        .forEach(function (remedio) { lista.appendChild(cartaoRemedio(remedio)); });
      vazio.hidden = remedios.length > 0;
    } catch (erro) {
      carregando.hidden = true;
      UI.mostrarErro(caixaErro, "Não consegui carregar os remédios. " + erro.message);
    }
  }

  // ===== Periodo do tratamento =====
  // A pessoa escolhe "uso continuo" ou "ate uma data". O resumo embaixo traduz a escolha em frase.

  var campoInicio = UI.elemento("#dataInicio");
  var campoFim = UI.elemento("#dataFim");
  var blocoFim = UI.elemento("#blocoFim");
  var resumoPeriodo = UI.elemento("#resumoPeriodo");

  // Data no formato do input (aaaa-mm-dd) usando o fuso local, e nao UTC.
  function dataDoInput(data) {
    var mes = String(data.getMonth() + 1).padStart(2, "0");
    var dia = String(data.getDate()).padStart(2, "0");
    return data.getFullYear() + "-" + mes + "-" + dia;
  }

  function somarDias(valor, dias) {
    var data = new Date(valor + "T12:00:00");
    data.setDate(data.getDate() + dias);
    return dataDoInput(data);
  }

  function diasEntre(inicio, fim) {
    var umDia = 24 * 60 * 60 * 1000;
    return Math.round((new Date(fim + "T12:00:00") - new Date(inicio + "T12:00:00")) / umDia) + 1;
  }

  function temDataFim() {
    return formulario.querySelector('input[name="duracao"]:checked').value === "data";
  }

  function atualizarPeriodo() {
    var comFim = temDataFim();
    blocoFim.hidden = !comFim;
    campoFim.min = campoInicio.value;

    var inicio = campoInicio.value;
    var fim = campoFim.value;

    formulario.querySelectorAll(".atalho").forEach(function (atalho) {
      var ativo = comFim && inicio && fim && somarDias(inicio, Number(atalho.dataset.dias) - 1) === fim;
      atalho.classList.toggle("ativo", Boolean(ativo));
      atalho.setAttribute("aria-pressed", ativo ? "true" : "false");
    });

    var frase;
    resumoPeriodo.classList.toggle("alerta", Boolean(comFim && inicio && fim && fim < inicio));
    if (!inicio) {
      frase = "Escolha a data em que o tratamento começa.";
    } else if (!comFim) {
      frase = "<strong>Uso contínuo</strong> a partir de " + UI.escapar(UI.formatarData(inicio)) + ".";
    } else if (!fim) {
      frase = "Escolha uma duração ou a data do último dia.";
    } else if (fim < inicio) {
      frase = "O último dia não pode ser antes do início.";
    } else {
      var dias = diasEntre(inicio, fim);
      frase = "<strong>" + dias + (dias === 1 ? " dia" : " dias") + "</strong> de tratamento, de " +
        UI.escapar(UI.formatarData(inicio)) + " a " + UI.escapar(UI.formatarData(fim)) + ".";
    }
    // O span segura a frase inteira junta, do lado do icone do resumo.
    resumoPeriodo.innerHTML = "<span>" + frase + "</span>";
  }

  formulario.querySelectorAll('input[name="duracao"]').forEach(function (opcao) {
    opcao.addEventListener("change", function () {
      atualizarPeriodo();
      if (temDataFim() && !campoFim.value) campoFim.focus();
    });
  });

  formulario.querySelectorAll(".atalho").forEach(function (atalho) {
    atalho.addEventListener("click", function () {
      if (!campoInicio.value) campoInicio.value = dataDoInput(new Date());
      // "7 dias" conta o dia de inicio, entao o ultimo dia e inicio + 6.
      campoFim.value = somarDias(campoInicio.value, Number(atalho.dataset.dias) - 1);
      atualizarPeriodo();
    });
  });

  campoInicio.addEventListener("input", atualizarPeriodo);
  campoFim.addEventListener("input", atualizarPeriodo);

  function abrir() {
    UI.limparErro(erroFormulario);
    formulario.reset();
    UI.elemento("#horario").value = "08:00";
    UI.elemento("#frequencia").value = "12";
    campoInicio.value = dataDoInput(new Date());
    atualizarPeriodo();
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
      dataInicio: campoInicio.value,
      dataFim: temDataFim() ? campoFim.value || null : null
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
    if (temDataFim() && !dados.dataFim) {
      UI.mostrarErro(erroFormulario, "Escolha a data do último dia ou marque uso contínuo.");
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
