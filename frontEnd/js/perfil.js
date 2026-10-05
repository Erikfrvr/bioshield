// Script da tela de perfil.
// Carrega a ficha medica do usuario, preenche os campos e salva as alteracoes.
// E aqui tambem que eu mostro o QR Code e o botao de gerar um token novo.

(function () {
  "use strict";

  var sessao = UI.exigirSessao();
  if (!sessao) return;

  var ficha = null;
  var jaAbriuAba = false;

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

  // Abas da tela. Cada painel tem data-aba igual ao botao que abre ele.
  var abas = UI.todos(".aba");
  var paineis = UI.todos(".painel-aba");

  function abrirAba(nome) {
    abas.forEach(function (aba) {
      var ativa = aba.dataset.aba === nome;
      aba.setAttribute("aria-selected", ativa ? "true" : "false");
      aba.tabIndex = ativa ? 0 : -1;
    });
    paineis.forEach(function (painel) {
      painel.classList.toggle("fora-da-aba", painel.dataset.aba !== nome);
    });
  }

  abas.forEach(function (aba, indice) {
    aba.addEventListener("click", function () { abrirAba(aba.dataset.aba); });
    aba.addEventListener("keydown", function (evento) {
      if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
      var passo = evento.key === "ArrowRight" ? 1 : -1;
      var proxima = abas[(indice + passo + abas.length) % abas.length];
      proxima.focus();
      abrirAba(proxima.dataset.aba);
    });
  });

  abrirAba("qr");

  var ICONE_REMOVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  function linhaAlergia(dados) {
    dados = dados || { substancia: "", gravidade: "moderada", observacao: "" };
    var bloco = document.createElement("div");
    bloco.className = "item item-alergia";
    bloco.innerHTML =
      '<div class="item-topo"><strong>Alergia</strong><button type="button" class="remover">' + ICONE_REMOVER + "Remover</button></div>" +
      '<label class="campo"><span>Substância</span><input type="text" class="campo-substancia" required placeholder="Dipirona" value="' + UI.escapar(dados.substancia) + '"></label>' +
      '<label class="campo"><span>Gravidade</span><select class="campo-gravidade">' +
        '<option value="leve">Leve</option>' +
        '<option value="moderada">Moderada</option>' +
        '<option value="grave">Grave</option>' +
      "</select></label>" +
      '<label class="campo"><span>Reação que costuma ter</span><input type="text" class="campo-observacao" placeholder="Inchaço no rosto e falta de ar" value="' + UI.escapar(dados.observacao || "") + '"></label>';

    var seletorGravidade = bloco.querySelector(".campo-gravidade");
    seletorGravidade.value = dados.gravidade || "moderada";
    bloco.dataset.gravidade = seletorGravidade.value;
    seletorGravidade.addEventListener("change", function () {
      bloco.dataset.gravidade = seletorGravidade.value;
    });
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
      '<div class="item-topo"><strong>Contato</strong><button type="button" class="remover">' + ICONE_REMOVER + "Remover</button></div>" +
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
    UI.elemento("#verFicha").href = endereco;
    // O QR guarda o endereco inteiro. Com "localhost" dentro, ele so abriria neste computador.
    UI.elemento("#avisoEndereco").hidden = !UI.ehEnderecoLocal(endereco);

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
    // Dentro do app Android nao existe baixar arquivo nem imprimir pelo navegador.
    // No lugar dos dois botoes fica o recado de onde fazer isso.
    if (Api.noApp) {
      var conexao = Api.conexao();
      var ondeAbrir = "";
      if (conexao && conexao.origem) {
        ondeAbrir = UI.ehEnderecoLocal(conexao.origem) && conexao.urlPublica ? conexao.urlPublica : conexao.origem;
      }
      UI.elemento("#acoesQr").classList.add("oculto");
      UI.elemento("#notaApp").hidden = !ativo;
      UI.elemento("#notaApp").textContent = "Para baixar a imagem ou imprimir as etiquetas, abra o BioShield no navegador de um computador" +
        (ondeAbrir ? ", no endereço " + ondeAbrir + "." : ".");
    }
    UI.elemento("#rotacionarQr").disabled = !ativo;
    UI.elemento("#cancelarQr").classList.toggle("oculto", !ativo);
    UI.elemento("#irImprimir").classList.toggle("oculto", !ativo);
    UI.elemento("#reativarQr").classList.toggle("oculto", ativo);
    UI.elemento("#rotacionarQr").classList.toggle("oculto", !ativo);
    UI.elemento("#verFicha").classList.toggle("oculto", !ativo);
  }

  // Resumo do que a pessoa que socorre vai ver, pra conferir sem abrir o formulario.
  function montarPrevia() {
    var alergias = ficha.alergias || [];
    var graves = alergias.filter(function (item) { return item.gravidade === "grave"; }).length;
    var contatos = ficha.contatos || [];

    var linhas = [
      {
        rotulo: "Tipo sanguíneo",
        valor: ficha.tipoSanguineo || "Não informado",
        falta: !ficha.tipoSanguineo
      },
      {
        rotulo: "Alergias",
        valor: alergias.length
          ? alergias.map(function (item) { return item.substancia; }).join(", ")
          : "Nenhuma registrada",
        destaque: graves > 0
      },
      {
        rotulo: "Quem avisar",
        valor: contatos.length
          ? contatos.map(function (item) { return item.nome.split(" ")[0]; }).join(", ")
          : "Nenhum contato",
        falta: !contatos.length
      }
    ];

    UI.elemento("#previaLista").innerHTML = linhas.map(function (linha) {
      var classe = linha.destaque ? " previa-alerta" : linha.falta ? " previa-falta" : "";
      return '<li class="' + classe.trim() + '"><span>' + linha.rotulo + "</span><strong>" + UI.escapar(linha.valor) + "</strong></li>";
    }).join("");

    UI.elemento("#previa").hidden = false;
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
    UI.elemento("#abas").hidden = false;
    if (!jaAbriuAba) {
      abrirAba("qr");
      jaAbriuAba = true;
    }
    montarPrevia();
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
      // A prioridade e numerada depois de tirar as linhas vazias, pra ordem de ligar ficar 1, 2, 3 sem buraco.
      contatos: UI.todos(".item-contato", listaContatos).map(function (bloco) {
        return {
          nome: bloco.querySelector(".campo-nome").value.trim(),
          telefone: bloco.querySelector(".campo-telefone").value.replace(/\D/g, ""),
          parentesco: bloco.querySelector(".campo-parentesco").value.trim() || null
        };
      }).filter(function (item) { return item.nome && item.telefone; })
        .map(function (item, indice) {
          item.prioridade = indice + 1;
          return item;
        })
    };
  }

  // Linha toda em branco e ignorada pelo coletar. Linha preenchida pela metade nao pode sumir calada:
  // contato sem telefone some da ficha e, na emergencia, ninguem sabe que ele existia.
  // Devolve o primeiro problema com o campo que precisa de atencao, ou null quando esta tudo certo.
  function conferirLinhas() {
    var alergias = UI.todos(".item-alergia", listaAlergias);
    for (var i = 0; i < alergias.length; i++) {
      var substancia = alergias[i].querySelector(".campo-substancia");
      var reacao = alergias[i].querySelector(".campo-observacao");
      if (!substancia.value.trim() && reacao.value.trim()) {
        return { campo: substancia, mensagem: "Escreva a substância da alergia ou toque em Remover nessa linha." };
      }
    }

    var contatos = UI.todos(".item-contato", listaContatos);
    for (var j = 0; j < contatos.length; j++) {
      var nome = contatos[j].querySelector(".campo-nome");
      var telefone = contatos[j].querySelector(".campo-telefone");
      var parentesco = contatos[j].querySelector(".campo-parentesco");
      var digitos = telefone.value.replace(/\D/g, "");
      var algumPreenchido = nome.value.trim() || digitos || parentesco.value.trim();
      if (!algumPreenchido) continue;
      if (!nome.value.trim()) {
        return { campo: nome, mensagem: "Escreva o nome do contato de emergência ou toque em Remover nessa linha." };
      }
      if (!digitos) {
        return { campo: telefone, mensagem: "Escreva o telefone de " + nome.value.trim() + ", com DDD." };
      }
      if (digitos.length < 10 || digitos.length > 11) {
        return { campo: telefone, mensagem: "O telefone de " + nome.value.trim() + " precisa ter DDD e 10 ou 11 números." };
      }
    }
    return null;
  }

  // O aviso fica no fim do formulario, perto do botao. Quando tem um campo culpado, levo a pessoa ate ele
  // e repito a mensagem num recado, que aparece por cima da tela. Sem campo, rolo ate o aviso.
  function mostrarErroFicha(mensagem, campo) {
    UI.mostrarErro(erroFicha, mensagem);
    if (campo) {
      campo.focus();
      UI.recado(mensagem, "erro");
    } else {
      erroFicha.scrollIntoView({ block: "center" });
    }
  }

  // O backend guarda o user agent inteiro ("Mozilla/5.0 (Linux; Android 13) ..."), que nao diz nada pra pessoa.
  // Aqui vira o tipo de aparelho. Quando nao da pra reconhecer, sobra o ip.
  function descreverAparelho(acesso) {
    var agente = String(acesso.userAgent || "");
    if (/iPhone/i.test(agente)) return "iPhone";
    if (/iPad/i.test(agente)) return "iPad";
    if (/Android/i.test(agente)) return /Mobile/i.test(agente) || !/Tablet/i.test(agente) ? "Celular Android" : "Tablet Android";
    if (/Windows/i.test(agente)) return "Computador Windows";
    if (/Macintosh|Mac OS X/i.test(agente)) return "Computador Mac";
    if (/Linux/i.test(agente)) return "Computador Linux";
    if (agente) return "Outro aparelho";
    return acesso.ip ? "Endereço " + acesso.ip : "Origem desconhecida";
  }

  async function carregarAcessos() {
    try {
      var acessos = await Api.listarAcessos(ficha.id);
      var lista = UI.elemento("#listaAcessos");
      lista.innerHTML = acessos.map(function (acesso) {
        return "<li><i aria-hidden=\"true\"></i><strong>" + UI.formatarDataHora(acesso.acessadoEm) + "</strong><span>" + UI.escapar(descreverAparelho(acesso)) + "</span></li>";
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
      abrirAba("ficha");
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
      // A ficha existe, so nao chegou. Mostrar o formulario vazio com "voce ainda nao tem ficha"
      // faria a pessoa achar que perdeu tudo, entao aqui aparece so o aviso e o botao de tentar de novo.
      carregando.hidden = true;
      var mensagem = erro.status === 0
        ? "Não consegui falar com o servidor. Confira a internet ou o endereço do servidor e tente de novo."
        : erro.status === 403
          ? "Esta conta não tem acesso a essa ficha. Toque em Sair e entre de novo."
          : "Não consegui carregar a sua ficha agora. " + erro.message;
      UI.elemento("#erroCarregar").textContent = mensagem;
      UI.elemento("#falhaCarregar").hidden = false;
    }
  }

  UI.elemento("#tentarDeNovo").addEventListener("click", function () {
    UI.elemento("#falhaCarregar").hidden = true;
    carregando.hidden = false;
    carregar();
  });

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

    var problema = conferirLinhas();
    if (problema) {
      mostrarErroFicha(problema.mensagem, problema.campo);
      return;
    }
    var dados = coletar();

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
        jaAbriuAba = false;
        if (window.Lembretes) Lembretes.sincronizar(true);
      }
      preencher();
    } catch (erro) {
      // 409 no criar: a ficha foi criada em outro aparelho depois deste login, e a sessao daqui nao sabe dela.
      var mensagem = erro.status === 409 && !ficha
        ? "Esta conta já tem uma ficha salva. Toque em Sair e entre de novo para carregar ela."
        : "Não consegui salvar. " + erro.message;
      mostrarErroFicha(mensagem);
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
      // O codigo vence em 24 horas. Sem a data, o familiar tenta usar no dia seguinte e nao entende o erro.
      var validade = UI.elemento("#validadeCodigo");
      validade.textContent = resposta.validoAte ? "Vale até " + UI.formatarDataHora(resposta.validoAte) + ". Gerar outro cancela este." : "";
      validade.hidden = !resposta.validoAte;
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
