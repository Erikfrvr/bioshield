// Script da criacao de conta.
// Valida o que da pra validar na tela, cria a conta e ja entra com ela pra pessoa nao digitar duas vezes.

(function () {
  "use strict";

  var formulario = UI.elemento("#formulario");
  var campoNome = UI.elemento("#nome");
  var campoEmail = UI.elemento("#email");
  var campoSenha = UI.elemento("#senha");
  var campoSenha2 = UI.elemento("#senha2");
  var caixaErro = UI.elemento("#erro");
  var botao = UI.elemento("#enviar");
  var forca = UI.elemento("#forca");

  campoSenha.addEventListener("input", function () {
    var valor = campoSenha.value;
    var nivel = 0;
    if (valor.length >= 6) nivel = 1;
    if (valor.length >= 8 && /\d/.test(valor) && /[a-zA-Z]/.test(valor)) nivel = 2;
    if (valor.length >= 10 && /\d/.test(valor) && /[a-zA-Z]/.test(valor) && /[^a-zA-Z0-9]/.test(valor)) nivel = 3;
    forca.dataset.nivel = String(nivel);
  });

  formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(caixaErro);

    var nome = campoNome.value.trim();
    var email = campoEmail.value.trim().toLowerCase();
    var senha = campoSenha.value;

    if (nome.length < 3) {
      UI.mostrarErro(caixaErro, "Escreva o nome completo, com pelo menos 3 letras.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      UI.mostrarErro(caixaErro, "Esse email não parece válido. Confira o endereço.");
      return;
    }
    if (senha.length < 6) {
      UI.mostrarErro(caixaErro, "A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (senha !== campoSenha2.value) {
      UI.mostrarErro(caixaErro, "As duas senhas estão diferentes.");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Criando";

    try {
      await Api.cadastrar({ nome: nome, email: email, senha: senha });
      await Api.entrar({ email: email, senha: senha });
      location.href = "perfil.html";
    } catch (erro) {
      var mensagem = erro.status === 409
        ? "Esse email já tem conta. Entre com ele ou use outro."
        : erro.status === 0
          ? "Não consegui falar com o servidor. Verifique se a API está no ar."
          : erro.message;
      UI.mostrarErro(caixaErro, mensagem);
      botao.disabled = false;
      botao.textContent = "Criar conta";
    }
  });
})();
