// Arquivo central das chamadas pra API.
// Descubro em qual endereco o servidor esta, monto o fetch com o token e devolvo o JSON,
// assim nao fico repetindo fetch em toda tela. Serve igual para o site e para o app Android.

(function (escopo) {
  "use strict";

  var config = escopo.BioShieldConfig || {};
  var CHAVE_SESSAO = "bioshield.sessao";
  // Endereco do servidor que a pessoa digitou na tela de entrada. Fica guardado no aparelho.
  var CHAVE_SERVIDOR = "bioshield.servidor";
  // Servidor que respondeu nesta aba. Guardo pra nao procurar de novo a cada troca de tela.
  var CHAVE_CONEXAO = "bioshield.conexao";
  var PORTA_PADRAO = "3000";

  // Dentro do app Android o Capacitor coloca esse objeto na janela. No navegador ele nao existe.
  var noApp = Boolean(escopo.Capacitor && typeof escopo.Capacitor.isNativePlatform === "function" && escopo.Capacitor.isNativePlatform());

  var conexaoAtual = null;
  var procurando = null;

  function ler(armazem, chave) {
    try {
      return armazem.getItem(chave);
    } catch (erro) {
      return null;
    }
  }

  function gravar(armazem, chave, valor) {
    try {
      if (valor === null) armazem.removeItem(chave);
      else armazem.setItem(chave, valor);
    } catch (erro) {
      // Navegador sem armazenamento: vale so para esta tela.
    }
  }

  function lerSessao() {
    try {
      return JSON.parse(ler(localStorage, CHAVE_SESSAO) || "null");
    } catch (erro) {
      return null;
    }
  }

  function gravarSessao(sessao) {
    gravar(localStorage, CHAVE_SESSAO, sessao ? JSON.stringify(sessao) : null);
  }

  // A sessao do modo demonstracao tem token que comeca com "demo.". Uso isso pra nao misturar
  // conta de mentira com servidor de verdade, nem o contrario.
  function sessaoDeDemo(sessao) {
    return Boolean(sessao && typeof sessao.token === "string" && sessao.token.indexOf("demo.") === 0);
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

  // ===== Em qual endereco o servidor esta =====

  // Endereco do Tailscale Funnel: termina em .ts.net, e sempre HTTPS e nunca tem porta.
  function ehTailscale(hostname) {
    return /\.ts\.net$/i.test(String(hostname || ""));
  }

  // Aceita "192.168.0.10", "192.168.0.10:3000" ou "http://192.168.0.10:3000/qualquer/coisa"
  // e devolve sempre "http://192.168.0.10:3000". Sem porta, vale a 3000, que e a do backend.
  // Endereco do Tailscale ("bioshield.tail1234ab.ts.net") vira "https://bioshield.tail1234ab.ts.net",
  // mesmo escrito sem o https:// ou com http://, porque o Funnel so atende HTTPS na porta padrao.
  function normalizarServidor(texto) {
    var limpo = String(texto || "").trim();
    if (!limpo) return "";
    var temProtocolo = /^https?:\/\//i.test(limpo);
    try {
      var url = new URL(temProtocolo ? limpo : "http://" + limpo);
      if (ehTailscale(url.hostname)) return "https://" + url.hostname.toLowerCase();
      var porta = url.port || (temProtocolo ? "" : PORTA_PADRAO);
      return url.protocol + "//" + url.hostname + (porta ? ":" + porta : "");
    } catch (erro) {
      return "";
    }
  }

  function servidorSalvo() {
    return normalizarServidor(ler(localStorage, CHAVE_SERVIDOR));
  }

  function candidatos() {
    var lista = [];
    function incluir(origem) {
      if (origem && lista.indexOf(origem) === -1) lista.push(origem);
    }

    incluir(servidorSalvo());
    // URL_API e o nome antigo deste campo, que vinha com o /api no fim.
    incluir(normalizarServidor(config.SERVIDOR || config.URL_API));
    // Fora do app, se a pagina veio por http, quem entregou ela pode ser o proprio backend.
    // Dentro do app a pagina mora no celular, entao esse endereco nao e servidor nenhum.
    if (!noApp && /^https?:$/.test(location.protocol)) incluir(location.origin);
    incluir("http://localhost:" + PORTA_PADRAO);
    return lista;
  }

  // Pergunta para um endereco se ele e o BioShield. So vale se responder o JSON de status:
  // um servidor qualquer que devolva uma pagina no lugar nao engana.
  async function sondar(origem) {
    var controlador = new AbortController();
    var relogio = setTimeout(function () { controlador.abort(); }, config.TEMPO_DA_SONDA_MS || 2500);
    try {
      var resposta = await fetch(origem + "/api/status", { headers: { Accept: "application/json" }, signal: controlador.signal });
      if (!resposta.ok) return null;
      var corpo = await resposta.json();
      if (!corpo || corpo.status !== "ok") return null;
      return { modo: "api", origem: origem, urlPublica: corpo.urlPublica || null };
    } catch (erro) {
      return null;
    } finally {
      clearTimeout(relogio);
    }
  }

  async function procurarServidor() {
    var lista = candidatos();
    for (var i = 0; i < lista.length; i++) {
      var achado = await sondar(lista[i]);
      if (achado) return achado;
    }
    return null;
  }

  // Devolve { modo, origem, urlPublica }. modo "demo" tem origem null.
  async function conectar() {
    if (conexaoAtual) return conexaoAtual;
    if (procurando) return procurando;

    procurando = (async function () {
      if (config.MODO === "demo") return { modo: "demo", origem: null, urlPublica: null };

      // Servidor que ja respondeu nesta aba: uso direto, sem sondar de novo a cada tela.
      try {
        var guardada = JSON.parse(ler(sessionStorage, CHAVE_CONEXAO) || "null");
        if (guardada && guardada.modo === "api" && candidatos().indexOf(guardada.origem) !== -1) return guardada;
      } catch (erro) { /* procura de novo */ }

      var achado = await procurarServidor();
      if (achado) {
        gravar(sessionStorage, CHAVE_CONEXAO, JSON.stringify(achado));
        return achado;
      }

      // Ninguem respondeu. Quem esta logado numa conta de verdade nao pode cair nos dados de mentira,
      // e com MODO "api" a demonstracao esta desligada. Nos dois casos fica "api" sem servidor,
      // e as chamadas vao mostrar que nao conseguiram falar com ele.
      var sessao = lerSessao();
      if (config.MODO === "api" || (sessao && !sessaoDeDemo(sessao))) {
        return { modo: "api", origem: null, urlPublica: null };
      }
      return { modo: "demo", origem: null, urlPublica: null };
    })();

    var resultado = await procurando;
    procurando = null;
    // Sem servidor eu nao guardo o resultado: na proxima chamada procuro de novo, porque ele pode ter voltado.
    if (resultado.modo === "demo" || resultado.origem) conexaoAtual = resultado;

    // Sobrou uma sessao de demonstracao e agora tem servidor de verdade: ela nao vale la.
    if (resultado.modo === "api" && resultado.origem && sessaoDeDemo(lerSessao())) gravarSessao(null);

    // Sessao de uma conta criada na demonstracao, de antes de fechar o app. Os dados da demonstracao
    // recomecaram do zero e essa conta nao existe mais: sem soltar a sessao, toda tela daria "ficha nao encontrada".
    var sessaoAtual = lerSessao();
    if (resultado.modo === "demo" && sessaoDeDemo(sessaoAtual) && escopo.BioShieldDemo &&
        typeof escopo.BioShieldDemo.conheceUsuario === "function" && !escopo.BioShieldDemo.conheceUsuario(sessaoAtual.usuario)) {
      gravarSessao(null);
    }
    return resultado;
  }

  function esquecerConexao() {
    conexaoAtual = null;
    gravar(sessionStorage, CHAVE_CONEXAO, null);
  }

  // Testa o endereco digitado e so salva se o BioShield responder nele.
  async function salvarServidor(texto) {
    var origem = normalizarServidor(texto);
    if (!origem) throw ErroApi("Escreva o endereço do servidor, por exemplo bioshield.tail1234ab.ts.net", 0, null);
    var achado = await sondar(origem);
    if (!achado) {
      var dica = origem.indexOf("https://") === 0
        ? " Confira o endereço, a internet deste aparelho e se o servidor e o Tailscale Funnel estão ligados."
        : " Confira o endereço e se este aparelho está no mesmo wifi do servidor.";
      throw ErroApi("O BioShield não respondeu em " + origem + "." + dica, 0, null);
    }
    gravar(localStorage, CHAVE_SERVIDOR, origem);
    esquecerConexao();
    return achado;
  }

  function esquecerServidor() {
    gravar(localStorage, CHAVE_SERVIDOR, null);
    esquecerConexao();
  }

  // Caminho da tela de entrada a partir da tela atual.
  function caminhoDaEntrada() {
    return location.pathname.indexOf("/pages/") !== -1 ? "../index.html" : "index.html";
  }

  async function bruto(caminho, opcoes) {
    opcoes = opcoes || {};
    var conexao = await conectar();
    if (!conexao.origem) throw ErroApi("Não consegui falar com o servidor.", 0, null);

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
      resposta = await fetch(conexao.origem + "/api" + caminho, {
        method: opcoes.metodo || "GET",
        headers: cabecalhos,
        body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
        signal: controlador.signal
      });
    } catch (erro) {
      // O servidor pode ter caido ou mudado de endereco: na proxima chamada eu procuro de novo.
      esquecerConexao();
      throw ErroApi("Não consegui falar com o servidor.", 0, null);
    } finally {
      clearTimeout(relogio);
    }

    var conteudo = null;
    var texto = await resposta.text();
    if (texto) {
      try { conteudo = JSON.parse(texto); } catch (erro) { conteudo = texto; }
    }

    // Token vencido ou que nao vale neste servidor: a pessoa precisa entrar de novo.
    // Sem isso todas as telas ficariam mostrando erro ate ela achar o botao Sair.
    if (resposta.status === 401 && !opcoes.publico) {
      gravarSessao(null);
      location.replace(caminhoDaEntrada() + "?sessao=expirada");
      throw ErroApi("Sua sessão terminou. Entre de novo.", 401, conteudo);
    }

    if (!resposta.ok) {
      throw ErroApi(mensagemDoCorpo(conteudo, "O servidor respondeu com erro " + resposta.status + "."), resposta.status, conteudo);
    }
    return conteudo;
  }

  async function modo() {
    return (await conectar()).modo;
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

    // true dentro do app Android.
    noApp: noApp,
    // Espera a procura do servidor terminar e devolve { modo, origem, urlPublica }.
    conectar: conectar,
    // O mesmo, mas na hora: null enquanto a procura nao terminou.
    conexao: function () { return conexaoAtual; },
    servidorSalvo: servidorSalvo,
    salvarServidor: salvarServidor,
    esquecerServidor: esquecerServidor,

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

    // Agenda dos proximos dias, que o lembretes.js usa pra agendar o alarme no celular.
    proximasDoses: function (idPaciente) {
      return chamar("proximasDoses", "/doses/proximas?idPaciente=" + idPaciente, {}, [idPaciente]);
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

    // Doses perdidas de quem o cuidador acompanha, para os avisos do avisosCuidador.js.
    alertasDoCuidador: function (idCuidador) {
      return chamar("alertasDoCuidador", "/cuidadores/" + idCuidador + "/alertas", {}, [idCuidador]);
    },

    desvincularCuidador: function (idVinculo) {
      return chamar("desvincularCuidador", "/cuidadores/vinculo/" + idVinculo, { metodo: "DELETE" }, [idVinculo]);
    },

    // A ficha publica so usa os dados de demonstracao se este navegador estiver numa sessao de demonstracao,
    // ou seja, se quem abriu sabe que esta vendo dado de mentira. No celular de quem escaneou o QR nao tem
    // sessao nenhuma: se o servidor nao responder, aparece o erro, e nunca a ficha de um paciente inventado.
    fichaDeEmergencia: async function (token) {
      if ((await modo()) === "demo" && config.MODO !== "demo" && !sessaoDeDemo(lerSessao())) {
        throw ErroApi("Não consegui falar com o servidor.", 0, null);
      }
      return chamar("fichaDeEmergencia", "/emergencia/" + encodeURIComponent(token), { publico: true }, [token]);
    }
  };

  escopo.Api = Api;
})(window);
