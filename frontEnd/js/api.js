// Arquivo central das chamadas pra API.
// Guardo a URL base aqui e monto o fetch com o token, assim nao fico repetindo fetch em toda tela.
// Se um dia mudar a porta do backend, eu mexo so nesse arquivo.

(function (escopo) {
  "use strict";

  var config = escopo.BioShieldConfig || {};
  var CHAVE_SESSAO = "bioshield.sessao";
  var modoResolvido = null;

  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");
    } catch (erro) {
      return null;
    }
  }

  function gravarSessao(sessao) {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  }

  function ErroApi(mensagem, status, corpo) {
    var erro = new Error(mensagem);
    erro.status = status;
    erro.corpo = corpo;
    return erro;
  }

  function mensagemDoCorpo(corpo, padrao) {
    if (!corpo) return padrao;
    if (typeof corpo === "string") return corpo || padrao;
    return corpo.mensagem || corpo.message || corpo.erro || corpo.error || padrao;
  }

  async function bruto(caminho, opcoes) {
    opcoes = opcoes || {};
    var sessao = lerSessao();
    var cabecalhos = { Accept: "application/json" };
    if (opcoes.corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
    if (sessao && sessao.token && !opcoes.publico) {
      cabecalhos.Authorization = "Bearer " + sessao.token;
    }

    var controlador = new AbortController();
    var relogio = setTimeout(function () { controlador.abort(); }, config.TEMPO_LIMITE_MS || 8000);

    var resposta;
    try {
      resposta = await fetch(config.URL_API + caminho, {
        method: opcoes.metodo || "GET",
        headers: cabecalhos,
        body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
        signal: controlador.signal
      });
    } catch (erro) {
      throw ErroApi("Não consegui falar com o servidor.", 0, null);
    } finally {
      clearTimeout(relogio);
    }

    var conteudo = null;
    var texto = await resposta.text();
    if (texto) {
      try { conteudo = JSON.parse(texto); } catch (erro) { conteudo = texto; }
    }

    if (!resposta.ok) {
      throw ErroApi(mensagemDoCorpo(conteudo, "O servidor respondeu com erro " + resposta.status + "."), resposta.status, conteudo);
    }
    return conteudo;
  }

  async function apiViva() {
    try {
      await bruto("/status", { publico: true });
      return true;
    } catch (erro) {
      return false;
    }
  }

  async function modo() {
    if (config.MODO === "api") return "api";
    if (config.MODO === "demo") return "demo";
    if (modoResolvido) return modoResolvido;
    modoResolvido = (await apiViva()) ? "api" : "demo";
    return modoResolvido;
  }

  async function chamar(nomeDemo, caminho, opcoes, argumentosDemo) {
    var atual = await modo();
    if (atual === "demo") {
      if (!escopo.BioShieldDemo || typeof escopo.BioShieldDemo[nomeDemo] !== "function") {
        throw ErroApi("Essa ação ainda não existe no modo demonstração.", 0, null);
      }
      return escopo.BioShieldDemo[nomeDemo].apply(null, argumentosDemo || []);
    }
    return bruto(caminho, opcoes);
  }

  var Api = {
    CHAVE_SESSAO: CHAVE_SESSAO,
    sessao: lerSessao,
    gravarSessao: gravarSessao,
    modo: modo,
    encerrarSessao: function () { gravarSessao(null); },

    cadastrar: function (dados) {
      return chamar("cadastrar", "/usuarios", { metodo: "POST", corpo: dados, publico: true }, [dados]);
    },

    entrar: async function (dados) {
      var resposta = await chamar("entrar", "/usuarios/login", { metodo: "POST", corpo: dados, publico: true }, [dados]);
      gravarSessao({
        token: resposta.token,
        usuario: resposta.usuario,
        idPaciente: resposta.idPaciente === undefined ? null : resposta.idPaciente
      });
      return resposta;
    },

    buscarFicha: function (idPaciente) {
      return chamar("buscarFicha", "/pacientes/" + idPaciente, {}, [idPaciente]);
    },

    criarFicha: function (dados) {
      return chamar("criarFicha", "/pacientes", { metodo: "POST", corpo: dados }, [dados]);
    },

    salvarFicha: function (idPaciente, dados) {
      return chamar("salvarFicha", "/pacientes/" + idPaciente, { metodo: "PUT", corpo: dados }, [idPaciente, dados]);
    },

    rotacionarQr: function (idPaciente) {
      return chamar("rotacionarQr", "/pacientes/" + idPaciente + "/qr/rotacionar", { metodo: "POST" }, [idPaciente]);
    },

    cancelarQr: function (idPaciente) {
      return chamar("cancelarQr", "/pacientes/" + idPaciente + "/qr", { metodo: "DELETE" }, [idPaciente]);
    },

    reativarQr: function (idPaciente) {
      return chamar("reativarQr", "/pacientes/" + idPaciente + "/qr/reativar", { metodo: "POST" }, [idPaciente]);
    },

    listarAcessos: function (idPaciente) {
      return chamar("listarAcessos", "/pacientes/" + idPaciente + "/acessos", {}, [idPaciente]);
    },

    gerarCodigoCuidador: function (idPaciente) {
      return chamar("gerarCodigoCuidador", "/pacientes/" + idPaciente + "/codigo", { metodo: "POST" }, [idPaciente]);
    },

    listarMedicamentos: function (idPaciente) {
      return chamar("listarMedicamentos", "/medicamentos?idPaciente=" + idPaciente, {}, [idPaciente]);
    },

    cadastrarMedicamento: function (dados) {
      return chamar("cadastrarMedicamento", "/medicamentos", { metodo: "POST", corpo: dados }, [dados]);
    },

    atualizarMedicamento: function (id, dados) {
      return chamar("atualizarMedicamento", "/medicamentos/" + id, { metodo: "PUT", corpo: dados }, [id, dados]);
    },

    apagarMedicamento: function (id) {
      return chamar("apagarMedicamento", "/medicamentos/" + id, { metodo: "DELETE" }, [id]);
    },

    dosesDeHoje: function (idPaciente) {
      return chamar("dosesDeHoje", "/doses/hoje?idPaciente=" + idPaciente, {}, [idPaciente]);
    },

    confirmarDose: function (id) {
      return chamar("confirmarDose", "/doses/" + id + "/confirmar", {
        metodo: "POST",
        corpo: { horarioConfirmado: new Date().toISOString() }
      }, [id]);
    },

    adesao: function (idPaciente) {
      return chamar("adesao", "/doses/adesao?idPaciente=" + idPaciente, {}, [idPaciente]);
    },

    vincularCuidador: function (dados) {
      return chamar("vincularCuidador", "/cuidadores/vincular", { metodo: "POST", corpo: dados }, [dados]);
    },

    pacientesDoCuidador: function (idCuidador) {
      return chamar("pacientesDoCuidador", "/cuidadores/" + idCuidador + "/pacientes", {}, [idCuidador]);
    },

    desvincularCuidador: function (idVinculo) {
      return chamar("desvincularCuidador", "/cuidadores/vinculo/" + idVinculo, { metodo: "DELETE" }, [idVinculo]);
    },

    fichaDeEmergencia: function (token) {
      return chamar("fichaDeEmergencia", "/emergencia/" + encodeURIComponent(token), { publico: true }, [token]);
    }
  };

  escopo.Api = Api;
})(window);
