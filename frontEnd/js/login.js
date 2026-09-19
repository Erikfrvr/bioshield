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

  Api.modo().then(function (modo) {
    if (modo === "demo") UI.elemento("#cartaoDemo").hidden = false;
  });

  if (Api.sessao()) location.replace("pages/perfil.html");

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
      location.href = "pages/perfil.html";
    } catch (erro) {
      var mensagem = erro.status === 401
        ? "Email ou senha não conferem. Confira e tente de novo."
        : erro.status === 0
          ? "Não consegui falar com o servidor. Verifique se a API está no ar."
          : erro.message;
      UI.mostrarErro(caixaErro, mensagem);
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  });
})();
