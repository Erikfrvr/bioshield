// Script da tela de perfil.
// Carrega a ficha medica do usuario, preenche os campos e salva as alteracoes.
// E aqui tambem que eu mostro o QR Code e o botao de gerar um token novo.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var ficha = null;

  var carregando = UI.elemento("#carregando");
  var semFicha = UI.elemento("#semFicha");
  var cartaoQr = UI.elemento("#cartaoQr");
  var molduraQr = UI.elemento("#molduraQr");
  var telaQr = UI.elemento("#telaQr");
  var marcaCancelado = UI.elemento("#marcaCancelado");
  var situacaoQr = UI.elemento("#situacaoQr");
  var enderecoQr = UI.elemento("#enderecoQr");
  var geradoEm = UI.elemento("#geradoEm");
  var listaAlergias = UI.elemento("#listaAlergias");
  var listaContatos = UI.elemento("#listaContatos");
  var vazioAlergias = UI.elemento("#vazioAlergias");
  var vazioContatos = UI.elemento("#vazioContatos");
  var erroFicha = UI.elemento("#erroFicha");
  var janelaCancelar = UI.elemento("#janelaCancelar");
  var confirmacao = UI.elemento("#confirmacao");
  var confirmarCancelar = UI.elemento("#confirmarCancelar");

  UI.montarTopo(UI.elemento("#topo"), "Minha ficha", "Olá, {nome}. Confira se está tudo certo.");
  UI.montarNavegacao("perfil");
  UI.marcarModo();

  function linhaAlergia(dados) {
    dados = dados || { substancia: "", gravidade: "moderada", observacao: "" };
    var bloco = document.createElement("div");
    bloco.className = "item item-alergia";
    bloco.innerHTML =
      '<div class="item-topo"><strong>Alergia</strong><button type="button" class="remover">Remover</button></div>' +
      '<label class="campo"><span>Substância</span><input type="text" class="campo-substancia" required placeholder="Dipirona" value="' + UI.escapar(dados.substancia) + '"></label>' +
      '<label class="campo"><span>Gravidade</span><select class="campo-gravidade">' +
        '<option value="leve">Leve</option>' +
        '<option value="moderada">Moderada</option>' +
        '<option value="grave">Grave</option>' +
      "</select></label>" +
      '<label class="campo"><span>Reação que costuma ter</span><input type="text" class="campo-observacao" placeholder="Inchaço no rosto e falta de ar" value="' + UI.escapar(dados.observacao || "") + '"></label>';

    bloco.querySelector(".campo-gravidade").value = dados.gravidade || "moderada";
    bloco.querySelector(".remover").addEventListener("click", function () {
      bloco.remove();
      atualizarVazios();
    });
    return bloco;
  }

  function linhaContato(dados) {
    dados = dados || { nome: "", telefone: "", parentesco: "" };
    var bloco = document.createElement("div");
    bloco.className = "item item-contato";
    bloco.innerHTML =
      '<div class="item-topo"><strong>Contato</strong><button type="button" class="remover">Remover</button></div>' +
      '<label class="campo"><span>Nome</span><input type="text" class="campo-nome" required placeholder="Patrícia, filha" value="' + UI.escapar(dados.nome) + '"></label>' +
      '<div class="grade-dupla">' +
        '<label class="campo"><span>Telefone</span><input type="tel" class="campo-telefone" inputmode="numeric" required placeholder="11987654321" value="' + UI.escapar(dados.telefone || "") + '"></label>' +
        '<label class="campo"><span>Parentesco</span><input type="text" class="campo-parentesco" placeholder="Filha" value="' + UI.escapar(dados.parentesco || "") + '"></label>' +
      "</div>";

    bloco.querySelector(".remover").addEventListener("click", function () {
      bloco.remove();
      atualizarVazios();
    });
    return bloco;
  }

  function atualizarVazios() {
    vazioAlergias.hidden = listaAlergias.children.length > 0;
    vazioContatos.hidden = listaContatos.children.length > 0;
  }

  function desenharQr() {
    if (!ficha || !ficha.tokenQr) return;
    var endereco = UI.urlDaFicha(ficha.tokenQr);
    enderecoQr.textContent = endereco;

    try {
      BioShieldQR.desenharNoCanvas(telaQr, endereco, { escala: 8, margem: 3, cor: "#0E3C39" });
    } catch (erro) {
      UI.recado("Não consegui desenhar o QR Code nesta tela.", "erro");
    }

    var ativo = ficha.qrAtivo !== false;
    molduraQr.classList.toggle("inativa", !ativo);
    marcaCancelado.hidden = ativo;
    situacaoQr.textContent = ativo ? "Ativo" : "Cancelado";
    situacaoQr.className = "etiqueta " + (ativo ? "etiqueta-sucesso" : "etiqueta-grave");

    geradoEm.textContent = ativo
      ? "Código criado em " + UI.formatarDataHora(ficha.tokenGeradoEm)
      : "Cancelado em " + UI.formatarDataHora(ficha.qrCanceladoEm);

    UI.elemento("#baixarQr").disabled = !ativo;
    UI.elemento("#rotacionarQr").disabled = !ativo;
    UI.elemento("#cancelarQr").classList.toggle("oculto", !ativo);
    UI.elemento("#irImprimir").classList.toggle("oculto", !ativo);
    UI.elemento("#reativarQr").classList.toggle("oculto", ativo);
    UI.elemento("#rotacionarQr").classList.toggle("oculto", !ativo);
  }

  function preencher() {
    UI.elemento("#tipoSanguineo").value = ficha.tipoSanguineo || "";
    UI.elemento("#condicoes").value = ficha.condicoes || "";
    UI.elemento("#observacoes").value = ficha.observacoes || "";

    listaAlergias.innerHTML = "";
    (ficha.alergias || []).forEach(function (item) { listaAlergias.appendChild(linhaAlergia(item)); });

    listaContatos.innerHTML = "";
    (ficha.contatos || []).forEach(function (item) { listaContatos.appendChild(linhaContato(item)); });

    atualizarVazios();
    cartaoQr.hidden = false;
    semFicha.hidden = true;
    UI.elemento("#cartaoCodigo").hidden = false;
    UI.elemento("#cartaoAcessos").hidden = false;
    desenharQr();
    carregarAcessos();
  }

  function coletar() {
    return {
      idUsuario: sessao.usuario.id,
      tipoSanguineo: UI.elemento("#tipoSanguineo").value || null,
      condicoes: UI.elemento("#condicoes").value.trim() || null,
      observacoes: UI.elemento("#observacoes").value.trim() || null,
      alergias: UI.todos(".item-alergia", listaAlergias).map(function (bloco) {
        return {
          substancia: bloco.querySelector(".campo-substancia").value.trim(),
          gravidade: bloco.querySelector(".campo-gravidade").value,
          observacao: bloco.querySelector(".campo-observacao").value.trim() || null
        };
      }).filter(function (item) { return item.substancia; }),
      contatos: UI.todos(".item-contato", listaContatos).map(function (bloco, indice) {
        return {
          nome: bloco.querySelector(".campo-nome").value.trim(),
          telefone: bloco.querySelector(".campo-telefone").value.replace(/\D/g, ""),
          parentesco: bloco.querySelector(".campo-parentesco").value.trim() || null,
          prioridade: indice + 1
        };
      }).filter(function (item) { return item.nome && item.telefone; })
    };
  }

  async function carregarAcessos() {
    try {
      var acessos = await Api.listarAcessos(ficha.id);
      var lista = UI.elemento("#listaAcessos");
      lista.innerHTML = acessos.map(function (acesso) {
        return "<li><strong>" + UI.formatarDataHora(acesso.acessadoEm) + "</strong><span>" + UI.escapar(acesso.userAgent || acesso.ip || "origem desconhecida") + "</span></li>";
      }).join("");
      UI.elemento("#vazioAcessos").hidden = acessos.length > 0;
    } catch (erro) {
      UI.elemento("#vazioAcessos").hidden = false;
    }
  }

  async function carregar() {
    if (!sessao.idPaciente) {
      carregando.hidden = true;
      semFicha.hidden = false;
      listaAlergias.appendChild(linhaAlergia());
      listaContatos.appendChild(linhaContato());
      atualizarVazios();
      return;
    }
    try {
      ficha = await Api.buscarFicha(sessao.idPaciente);
      carregando.hidden = true;
      preencher();
    } catch (erro) {
      carregando.hidden = true;
      semFicha.hidden = false;
      UI.mostrarErro(erroFicha, "Não consegui carregar a ficha agora. " + erro.message);
    }
  }

  UI.elemento("#novaAlergia").addEventListener("click", function () {
    listaAlergias.appendChild(linhaAlergia());
    atualizarVazios();
  });

  UI.elemento("#novoContato").addEventListener("click", function () {
    listaContatos.appendChild(linhaContato());
    atualizarVazios();
  });

  UI.elemento("#formularioFicha").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    UI.limparErro(erroFicha);

    var dados = coletar();
    var invalidoTelefone = dados.contatos.some(function (contato) {
      return contato.telefone.length < 10 || contato.telefone.length > 11;
    });
    if (invalidoTelefone) {
      UI.mostrarErro(erroFicha, "Telefone precisa ter DDD e 10 ou 11 números, sem pontuação.");
      return;
    }

    var botao = UI.elemento("#salvar");
    botao.disabled = true;
    botao.textContent = "Salvando";

    try {
      if (ficha) {
        ficha = await Api.salvarFicha(ficha.id, dados);
        UI.recado("Ficha salva.");
      } else {
        ficha = await Api.criarFicha(dados);
        var atual = Api.sessao();
        atual.idPaciente = ficha.id;
        Api.gravarSessao(atual);
        sessao = atual;
        UI.recado("Ficha criada e QR Code gerado.");
      }
      preencher();
    } catch (erro) {
      UI.mostrarErro(erroFicha, "Não consegui salvar. " + erro.message);
    } finally {
      botao.disabled = false;
      botao.textContent = "Salvar ficha";
    }
  });

  UI.elemento("#baixarQr").addEventListener("click", function () {
    var link = document.createElement("a");
    link.download = "bioshield-qrcode.png";
    link.href = telaQr.toDataURL("image/png");
    link.click();
    UI.recado("Imagem baixada.");
  });

  UI.elemento("#rotacionarQr").addEventListener("click", async function () {
    var botao = this;
    botao.disabled = true;
    try {
      var resposta = await Api.rotacionarQr(ficha.id);
      ficha.tokenQr = resposta.tokenQr;
      ficha.tokenGeradoEm = resposta.tokenGeradoEm;
      ficha.qrAtivo = true;
      ficha.qrCanceladoEm = null;
      desenharQr();
      UI.recado("Código novo gerado. O anterior parou de funcionar.");
    } catch (erro) {
      UI.recado("Não consegui gerar o código novo. " + erro.message, "erro");
    } finally {
      botao.disabled = false;
    }
  });

  UI.elemento("#cancelarQr").addEventListener("click", function () {
    confirmacao.value = "";
    confirmarCancelar.disabled = true;
    janelaCancelar.hidden = false;
    confirmacao.focus();
  });

  UI.elemento("#voltarCancelar").addEventListener("click", function () {
    janelaCancelar.hidden = true;
  });

  janelaCancelar.addEventListener("click", function (evento) {
    if (evento.target === janelaCancelar) janelaCancelar.hidden = true;
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !janelaCancelar.hidden) janelaCancelar.hidden = true;
  });

  confirmacao.addEventListener("input", function () {
    confirmarCancelar.disabled = confirmacao.value.trim().toUpperCase() !== "CANCELAR";
  });

  confirmarCancelar.addEventListener("click", async function () {
    confirmarCancelar.disabled = true;
    try {
      var resposta = await Api.cancelarQr(ficha.id);
      ficha.qrAtivo = false;
      ficha.qrCanceladoEm = resposta.qrCanceladoEm || new Date().toISOString();
      janelaCancelar.hidden = true;
      desenharQr();
      UI.recado("QR Code cancelado. Os adesivos antigos não abrem mais a sua ficha.");
    } catch (erro) {
      UI.recado("Não consegui cancelar agora. " + erro.message, "erro");
      confirmarCancelar.disabled = false;
    }
  });

  UI.elemento("#reativarQr").addEventListener("click", async function () {
    var botao = this;
    botao.disabled = true;
    try {
      var resposta = await Api.reativarQr(ficha.id);
      ficha.tokenQr = resposta.tokenQr;
      ficha.tokenGeradoEm = resposta.tokenGeradoEm;
      ficha.qrAtivo = true;
      ficha.qrCanceladoEm = null;
      desenharQr();
      UI.recado("Código novo ativo. Imprima os adesivos de novo.");
    } catch (erro) {
      UI.recado("Não consegui ativar um código novo. " + erro.message, "erro");
    } finally {
      botao.disabled = false;
    }
  });

  UI.elemento("#gerarCodigo").addEventListener("click", async function () {
    var botao = this;
    botao.disabled = true;
    try {
      var resposta = await Api.gerarCodigoCuidador(ficha.id);
      var alvo = UI.elemento("#valorCodigo");
      alvo.textContent = resposta.codigo;
      alvo.classList.remove("vazio-codigo");
      UI.recado("Código gerado. Entregue apenas a quem você autoriza.");
    } catch (erro) {
      UI.recado("Não consegui gerar o código. " + erro.message, "erro");
    } finally {
      botao.disabled = false;
    }
  });

  UI.elemento("#valorCodigo").classList.add("vazio-codigo");
  carregar();
})();
