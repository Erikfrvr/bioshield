// Script da tela de login.
// Pega email e senha, manda pro POST /usuarios/login, guarda o token e redireciona.
// Se o backend responder erro, mostro a mensagem na tela em vez de alert seco.

(function () {
  "use strict";

  var formulario = UI.elemento("#formulario");
  var campoEmail = UI.elemento("#email");
  var campoSenha = UI.elemento("#senha");
  var caixaErro = UI.elemento("#erro");
  var botao = UI.elemento("#enviar");

  // ===== Servidor =====
  // Mostra de onde os dados estao vindo e deixa a pessoa escrever o endereco do servidor.
  // No app Android esse cartao aparece sempre, porque o app nao tem como adivinhar o endereco.
  // No site ele so aparece quando nenhum servidor respondeu ou quando ja existe um endereco salvo.

  var cartaoServidor = UI.elemento("#cartaoServidor");
  var estadoServidor = UI.elemento("#estadoServidor");
  var formularioServidor = UI.elemento("#formularioServidor");
  var campoServidor = UI.elemento("#enderecoServidor");
  var erroServidor = UI.elemento("#erroServidor");
  var botaoAbrirServidor = UI.elemento("#abrirServidor");

  function mostrarConexao(conexao) {
    var ligado = conexao.modo === "api" && Boolean(conexao.origem);
    UI.elemento("#cartaoDemo").hidden = conexao.modo !== "demo";

    estadoServidor.dataset.estado = ligado ? "ligado" : "desligado";
    estadoServidor.textContent = ligado
      ? "Conectado ao servidor " + conexao.origem
      : conexao.modo === "demo"
        ? "Nenhum servidor respondeu. O app está no modo demonstração, com dados fictícios."
        : "Nenhum servidor respondeu.";
    botaoAbrirServidor.textContent = ligado ? "Trocar de servidor" : "Informar o endereço do servidor";

    cartaoServidor.hidden = !(Api.noApp || !ligado || Boolean(Api.servidorSalvo()));
  }

  Api.conectar().then(mostrarConexao);

  botaoAbrirServidor.addEventListener("click", function () {
    UI.limparErro(erroServidor);
    campoServidor.value = Api.servidorSalvo().replace("http://", "");
    formularioServidor.hidden = false;
    botaoAbrirServidor.hidden = true;
    campoServidor.focus();
  });

  formularioServidor.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(erroServidor);

    var botaoSalvar = UI.elemento("#salvarServidor");
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Testando";
    try {
      await Api.salvarServidor(campoServidor.value);
      // Conta de um servidor nao vale no outro, e o alarme dela tambem nao.
      Api.encerrarSessao();
      if (window.Lembretes) Lembretes.desligar();
      if (window.AvisosCuidador) AvisosCuidador.desligar();
      formularioServidor.hidden = true;
      botaoAbrirServidor.hidden = false;
      mostrarConexao(await Api.conectar());
      UI.recado("Servidor encontrado e salvo.");
    } catch (erro) {
      UI.mostrarErro(erroServidor, erro.message);
    } finally {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = "Testar e salvar";
    }
  });

  UI.elemento("#esquecerServidor").addEventListener("click", async function () {
    Api.esquecerServidor();
    formularioServidor.hidden = true;
    botaoAbrirServidor.hidden = false;
    estadoServidor.textContent = "Procurando o servidor.";
    mostrarConexao(await Api.conectar());
  });

  // Quem foi mandado de volta pra ca porque o login venceu precisa saber o motivo.
  if (location.search.indexOf("sessao=expirada") !== -1) {
    UI.mostrarErro(caixaErro, "Sua sessão terminou. Entre de novo.");
  }

  // No modo demonstracao, tocar numa conta de exemplo ja preenche o formulario.
  UI.todos(".lista-contas button").forEach(function (conta) {
    conta.addEventListener("click", function () {
      campoEmail.value = conta.dataset.email;
      campoSenha.value = "123456";
      botao.focus();
    });
  });

  // No app fechado, o toque numa notificacao abre o app por esta tela, e o toque chega pelo plugin como evento
  // guardado. Ele so e entregue depois que o pedido de ouvir (addListener, feito pelo lembretes.js e pelo
  // avisosCuidador.js) chega no Android. Normalmente sao milissegundos, mas com o app abrindo do zero num
  // celular lento ja vi passar de 2 segundos. Se esta tela trocar de pagina antes, o evento vai para uma pagina
  // que ja nao existe e se perde. O Android atende as chamadas dos plugins numa fila so, em ordem: quando a
  // resposta de uma chamada qualquer volta, os eventos guardados ja chegaram aqui.
  // O limite de tempo so vale se a ponte com o Android quebrar; sem o plugin, a chamada falha na hora.
  function esperarAberturaPeloAviso() {
    var cap = window.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform() || typeof cap.nativePromise !== "function") {
      return Promise.resolve();
    }
    var idaEVolta;
    try {
      idaEVolta = Promise.resolve(cap.nativePromise("App", "getState", {})).catch(function () { /* segue mesmo assim */ });
    } catch (erro) {
      return Promise.resolve();
    }
    var limite = new Promise(function (resolver) { setTimeout(resolver, 10000); });
    return Promise.race([idaEVolta, limite]);
  }

  // Ja esta logado: vai direto pra ficha. Espero a procura do servidor porque ela pode descartar
  // uma sessao de demonstracao que sobrou no aparelho.
  // Se o app abriu pelo toque numa notificacao do alarme, vai para as doses, onde o toque e tratado.
  // Se abriu pelo aviso de dose perdida de quem a pessoa acompanha, vai para o painel do cuidador.
  Promise.all([Api.conectar(), esperarAberturaPeloAviso()]).then(function () {
    if (!Api.sessao()) return;
    var destino = "pages/perfil.html";
    if (window.Lembretes && Lembretes.temAcaoPendente()) destino = "pages/doses.html";
    else if (window.AvisosCuidador && AvisosCuidador.temAcaoPendente()) destino = "pages/cuidador.html";
    location.replace(destino);
  });

  formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(caixaErro);

    var email = campoEmail.value.trim();
    var senha = campoSenha.value;

    if (!email || !senha) {
      UI.mostrarErro(caixaErro, "Preencha o email e a senha para entrar.");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Entrando";

    try {
      await Api.entrar({ email: email, senha: senha });
      // replace e nao href: o botao de voltar do celular nao deve trazer a pessoa de volta pro login.
      location.replace("pages/perfil.html");
    } catch (erro) {
      var mensagem = erro.status === 401
        ? "Email ou senha não conferem. Confira e tente de novo."
        : erro.status === 0
          ? "Não consegui falar com o servidor. Confira o endereço no quadro Servidor, aqui embaixo."
          : erro.message;
      UI.mostrarErro(caixaErro, mensagem);
      botao.disabled = false;
      botao.textContent = "Entrar";
      // Sem servidor, o quadro tem que aparecer pra pessoa conseguir arrumar.
      if (erro.status === 0) Api.conectar().then(mostrarConexao);
    }
  });
})();
