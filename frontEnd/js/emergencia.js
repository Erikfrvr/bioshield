// Script da pagina publica da emergencia.
// Le o token da URL, busca a ficha na rota publica e monta a tela.
// Essa e a unica pagina que funciona sem login, entao ela nao pode depender do token de sessao.

(function () {
  "use strict";

  var ICONE_TELEFONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 6.6 6.6l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2C11.4 19 5 12.6 4.2 5.7a2 2 0 0 1 2-2.2z"/></svg>';

  var GRAVIDADE = { grave: "Grave", moderada: "Moderada", leve: "Leve" };

  function mostrar(id) {
    UI.elemento("#carregando").hidden = true;
    UI.elemento(id).hidden = false;
  }

  function lerToken() {
    var parametros = new URLSearchParams(location.search);
    var token = parametros.get("token") || parametros.get("t");
    if (token) return token.trim();
    var fragmento = location.hash.replace("#", "").trim();
    return fragmento || "";
  }

  function montarAlergias(alergias) {
    var lista = UI.elemento("#listaAlergias");
    if (!alergias || !alergias.length) {
      lista.innerHTML = '<li><span class="nenhuma">Nenhuma alergia registrada pelo titular.</span></li>';
      UI.elemento("#quadroAlergias").classList.remove("quadro-alergia");
      return;
    }
    // As graves vem primeiro, porque e o que quem socorre precisa ler antes de tudo.
    var ordem = { grave: 0, moderada: 1, leve: 2 };
    var ordenadas = alergias.slice().sort(function (a, b) {
      return (ordem[a.gravidade] === undefined ? 1 : ordem[a.gravidade]) - (ordem[b.gravidade] === undefined ? 1 : ordem[b.gravidade]);
    });
    lista.innerHTML = ordenadas.map(function (item) {
      var grau = GRAVIDADE[item.gravidade] || "Moderada";
      return '<li class="alergia-' + UI.escapar(item.gravidade || "moderada") + '">' +
        "<strong>" + UI.escapar(item.substancia) + "</strong>" +
        '<span class="grau grau-' + UI.escapar(item.gravidade || "moderada") + '">' + grau + "</span>" +
        (item.observacao ? '<span class="reacao">' + UI.escapar(item.observacao) + "</span>" : "") +
        "</li>";
    }).join("");
  }

  function montarRemedios(remedios) {
    if (!remedios || !remedios.length) return;
    UI.elemento("#quadroRemedios").hidden = false;
    UI.elemento("#listaRemedios").innerHTML = remedios.map(function (item) {
      var dose = Number(item.dosagem);
      var valor = Number.isInteger(dose) ? dose : dose.toFixed(2).replace(".", ",");
      return "<li><strong>" + UI.escapar(item.nome) + "</strong>" +
        "<span>" + valor + " " + UI.escapar(item.unidade) + ", " + UI.escapar(UI.descreverFrequencia(item.frequenciaHoras)) + "</span></li>";
    }).join("");
  }

  function montarContatos(contatos) {
    if (!contatos || !contatos.length) {
      UI.elemento("#quadroContatos").hidden = true;
      return;
    }
    UI.elemento("#listaContatos").innerHTML = contatos.map(function (contato) {
      var digitos = String(contato.telefone || "").replace(/\D/g, "");
      var descricao = contato.parentesco
        ? UI.escapar(contato.parentesco) + ", " + UI.formatarTelefone(digitos)
        : UI.formatarTelefone(digitos);
      return '<a class="ligar" href="tel:+55' + digitos + '">' + ICONE_TELEFONE +
        '<span class="quem"><strong>Ligar para ' + UI.escapar(contato.nome) + "</strong>" +
        "<span>" + descricao + "</span></span></a>";
    }).join("");
  }

  function montar(dados) {
    document.title = "Ficha de emergência de " + dados.nome + " | BioShield";
    UI.elemento("#nome").textContent = dados.nome;

    if (dados.tipoSanguineo) {
      var bloco = UI.elemento("#sangue");
      bloco.hidden = false;
      bloco.querySelector("strong").textContent = dados.tipoSanguineo;
    }

    UI.elemento("#atualizacao").textContent = dados.atualizadoEm
      ? "Atualizada em " + UI.formatarData(dados.atualizadoEm)
      : "";

    montarAlergias(dados.alergias);

    if (dados.condicoes) {
      UI.elemento("#quadroCondicoes").hidden = false;
      UI.elemento("#condicoes").textContent = dados.condicoes;
    }

    montarRemedios(dados.medicamentos);

    if (dados.observacoes) {
      UI.elemento("#quadroObservacoes").hidden = false;
      UI.elemento("#observacoes").textContent = dados.observacoes;
    }

    montarContatos(dados.contatos);
    mostrar("#ficha");
  }

  async function carregar() {
    var token = lerToken();
    if (!token) {
      mostrar("#naoEncontrado");
      return;
    }

    try {
      var dados = await Api.fichaDeEmergencia(token);
      montar(dados);
    } catch (erro) {
      if (erro.status === 410) mostrar("#cancelado");
      else if (erro.status === 404) mostrar("#naoEncontrado");
      else {
        UI.elemento("#mensagemFalha").textContent = erro.status === 0
          ? "O servidor não respondeu. Se a pessoa precisa de socorro, ligue para a emergência agora."
          : erro.message;
        mostrar("#falhou");
      }
    }
  }

  carregar();
})();
