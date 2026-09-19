// Modo demonstracao. Responde as mesmas chamadas da API usando os dados ficticios do banco,
// guardados no localStorage. Serve pra rodar o front sozinho enquanto o backend nao esta pronto
// e pra gravar o video da apresentacao. Quando a API responde, este arquivo nao e usado.

(function (escopo) {
  "use strict";

  var CHAVE = "bioshield.demo";

  function hoje(hora) {
    var data = new Date();
    var partes = (hora || "00:00").split(":");
    data.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
    return data.toISOString();
  }

  function deslocar(dias, hora) {
    var data = new Date(hoje(hora));
    data.setDate(data.getDate() + dias);
    return data.toISOString();
  }

  function dataSimples(dias) {
    var data = new Date();
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
  }

  function token() {
    var letras = "0123456789abcdef";
    var saida = "";
    for (var i = 0; i < 32; i++) saida += letras[Math.floor(Math.random() * 16)];
    return saida;
  }

  function sementeInicial() {
    return {
      proximoId: 500,
      usuarios: [
        { id: 1, nome: "Maria Aparecida Souza", email: "maria.souza@exemplo.com", senha: "123456" },
        { id: 2, nome: "Joana Beatriz Lima", email: "joana.lima@exemplo.com", senha: "123456" },
        { id: 3, nome: "Lucas Andrade Ferraz", email: "lucas.andrade@exemplo.com", senha: "123456" },
        { id: 4, nome: "Patrícia Souza Martins", email: "patricia.martins@exemplo.com", senha: "123456" }
      ],
      pacientes: [
        {
          id: 1, idUsuario: 1, tipoSanguineo: "O+",
          condicoes: "Hipertensão e diabetes tipo 2",
          observacoes: "Usa aparelho auditivo no ouvido direito. Mora sozinha.",
          tokenQr: "a3f81c2d94be47a0b6e15d7c0f29b834", qrAtivo: true,
          tokenGeradoEm: deslocar(-30, "10:00"), qrCanceladoEm: null,
          atualizadoEm: deslocar(-2, "19:20"), codigoCuidador: "MARIA24"
        },
        {
          id: 2, idUsuario: 2, tipoSanguineo: "A-",
          condicoes: "Alergia severa a anti inflamatórios",
          observacoes: "Carrega caneta de adrenalina na bolsa.",
          tokenQr: "7d2e9b4a16cf43d8a95e0c73b18f26ad", qrAtivo: true,
          tokenGeradoEm: deslocar(-60, "08:00"), qrCanceladoEm: null,
          atualizadoEm: deslocar(-9, "11:05"), codigoCuidador: "JOANA71"
        },
        {
          id: 3, idUsuario: 3, tipoSanguineo: "AB+",
          condicoes: "Transtorno do espectro autista, nível 2 de suporte",
          observacoes: "Não verbal em situação de estresse. Pode se afastar sozinho.",
          tokenQr: "c51a70e8d3b94f26a8017ce4b9d3628f", qrAtivo: true,
          tokenGeradoEm: deslocar(-10, "16:40"), qrCanceladoEm: null,
          atualizadoEm: deslocar(-1, "21:15"), codigoCuidador: "LUCAS38"
        }
      ],
      alergias: [
        { id: 1, idPaciente: 1, substancia: "Dipirona", gravidade: "grave", observacao: "Inchaço no rosto e falta de ar" },
        { id: 2, idPaciente: 1, substancia: "Penicilina", gravidade: "moderada", observacao: "Manchas vermelhas pelo corpo" },
        { id: 3, idPaciente: 2, substancia: "Ibuprofeno", gravidade: "grave", observacao: "Risco de choque anafilático" },
        { id: 4, idPaciente: 2, substancia: "Camarão", gravidade: "moderada", observacao: "Coceira e vômito" },
        { id: 5, idPaciente: 3, substancia: "Látex", gravidade: "leve", observacao: "Vermelhidão no contato" }
      ],
      contatos: [
        { id: 1, idPaciente: 1, nome: "Patrícia Souza Martins", telefone: "11987654321", parentesco: "Filha", prioridade: 1 },
        { id: 2, idPaciente: 1, nome: "Antônio Souza", telefone: "11976543210", parentesco: "Irmão", prioridade: 2 },
        { id: 3, idPaciente: 2, nome: "Rodrigo Lima", telefone: "11965432109", parentesco: "Esposo", prioridade: 1 },
        { id: 4, idPaciente: 3, nome: "Sílvia Andrade", telefone: "11954321098", parentesco: "Mãe", prioridade: 1 },
        { id: 5, idPaciente: 3, nome: "Marcos Ferraz", telefone: "11943210987", parentesco: "Pai", prioridade: 2 }
      ],
      medicamentos: [
        { id: 1, idPaciente: 1, nome: "Losartana", dosagem: 50, unidade: "mg", frequenciaHoras: 12, horarioInicial: "08:00", dataInicio: dataSimples(-30), dataFim: null, ativo: true },
        { id: 2, idPaciente: 1, nome: "Metformina", dosagem: 850, unidade: "mg", frequenciaHoras: 8, horarioInicial: "07:00", dataInicio: dataSimples(-30), dataFim: null, ativo: true },
        { id: 3, idPaciente: 1, nome: "Sinvastatina", dosagem: 20, unidade: "mg", frequenciaHoras: 24, horarioInicial: "21:00", dataInicio: dataSimples(-15), dataFim: null, ativo: true },
        { id: 4, idPaciente: 2, nome: "Levotiroxina", dosagem: 75, unidade: "mg", frequenciaHoras: 24, horarioInicial: "06:30", dataInicio: dataSimples(-60), dataFim: null, ativo: true },
        { id: 5, idPaciente: 3, nome: "Risperidona", dosagem: 1, unidade: "mg", frequenciaHoras: 24, horarioInicial: "20:00", dataInicio: dataSimples(-10), dataFim: dataSimples(80), ativo: true }
      ],
      doses: [
        { id: 1, idMedicamento: 1, horarioPrevisto: deslocar(-1, "08:00"), horarioConfirmado: deslocar(-1, "08:12"), status: "tomada" },
        { id: 2, idMedicamento: 1, horarioPrevisto: deslocar(-1, "20:00"), horarioConfirmado: deslocar(-1, "20:40"), status: "tomada" },
        { id: 3, idMedicamento: 2, horarioPrevisto: deslocar(-1, "07:00"), horarioConfirmado: deslocar(-1, "07:05"), status: "tomada" },
        { id: 4, idMedicamento: 2, horarioPrevisto: deslocar(-1, "15:00"), horarioConfirmado: null, status: "perdida" },
        { id: 5, idMedicamento: 2, horarioPrevisto: deslocar(-1, "23:00"), horarioConfirmado: deslocar(-1, "23:20"), status: "tomada" },
        { id: 6, idMedicamento: 3, horarioPrevisto: deslocar(-1, "21:00"), horarioConfirmado: null, status: "perdida" },
        { id: 7, idMedicamento: 1, horarioPrevisto: hoje("08:00"), horarioConfirmado: hoje("08:03"), status: "tomada" },
        { id: 8, idMedicamento: 1, horarioPrevisto: hoje("20:00"), horarioConfirmado: null, status: "prevista" },
        { id: 9, idMedicamento: 2, horarioPrevisto: hoje("07:00"), horarioConfirmado: hoje("07:18"), status: "tomada" },
        { id: 10, idMedicamento: 2, horarioPrevisto: hoje("15:00"), horarioConfirmado: null, status: "prevista" },
        { id: 11, idMedicamento: 2, horarioPrevisto: hoje("23:00"), horarioConfirmado: null, status: "prevista" },
        { id: 12, idMedicamento: 3, horarioPrevisto: hoje("21:00"), horarioConfirmado: null, status: "prevista" },
        { id: 13, idMedicamento: 4, horarioPrevisto: hoje("06:30"), horarioConfirmado: hoje("06:35"), status: "tomada" },
        { id: 14, idMedicamento: 5, horarioPrevisto: hoje("20:00"), horarioConfirmado: null, status: "prevista" }
      ],
      vinculos: [
        { id: 1, idCuidador: 4, idPaciente: 1, ativo: true, autorizadoEm: deslocar(-20, "14:00") },
        { id: 2, idCuidador: 4, idPaciente: 3, ativo: true, autorizadoEm: deslocar(-6, "09:30") }
      ],
      acessos: [
        { id: 1, idPaciente: 1, acessadoEm: deslocar(-3, "18:40"), ip: "189.45.12.80", userAgent: "Android 13" },
        { id: 2, idPaciente: 1, acessadoEm: deslocar(0, "07:10"), ip: "200.147.35.12", userAgent: "iPhone iOS 17" },
        { id: 3, idPaciente: 2, acessadoEm: deslocar(-8, "12:25"), ip: "177.92.204.31", userAgent: "Android 12" }
      ]
    };
  }

  function carregar() {
    try {
      var bruto = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
      if (bruto && bruto.pacientes) return bruto;
    } catch (erro) { /* recomeca do zero */ }
    var novo = sementeInicial();
    salvar(novo);
    return novo;
  }

  function salvar(banco) {
    sessionStorage.setItem(CHAVE, JSON.stringify(banco));
  }

  function proximoId(banco) {
    banco.proximoId += 1;
    return banco.proximoId;
  }

  function falhar(mensagem, status) {
    var erro = new Error(mensagem);
    erro.status = status || 400;
    return Promise.reject(erro);
  }

  function pronto(valor) {
    return new Promise(function (resolver) {
      setTimeout(function () { resolver(JSON.parse(JSON.stringify(valor))); }, 180);
    });
  }

  function montarFicha(banco, paciente) {
    var usuario = banco.usuarios.find(function (u) { return u.id === paciente.idUsuario; });
    return {
      id: paciente.id,
      idUsuario: paciente.idUsuario,
      nome: usuario ? usuario.nome : "Sem nome",
      tipoSanguineo: paciente.tipoSanguineo,
      condicoes: paciente.condicoes,
      observacoes: paciente.observacoes,
      tokenQr: paciente.tokenQr,
      qrAtivo: paciente.qrAtivo,
      tokenGeradoEm: paciente.tokenGeradoEm,
      qrCanceladoEm: paciente.qrCanceladoEm,
      atualizadoEm: paciente.atualizadoEm,
      alergias: banco.alergias.filter(function (a) { return a.idPaciente === paciente.id; }),
      contatos: banco.contatos
        .filter(function (c) { return c.idPaciente === paciente.id; })
        .sort(function (a, b) { return a.prioridade - b.prioridade; })
    };
  }

  function proximaDoseDe(banco, idMedicamento) {
    var agora = Date.now();
    var futuras = banco.doses
      .filter(function (d) { return d.idMedicamento === idMedicamento && d.status === "prevista" && new Date(d.horarioPrevisto).getTime() >= agora; })
      .sort(function (a, b) { return new Date(a.horarioPrevisto) - new Date(b.horarioPrevisto); });
    return futuras.length ? futuras[0].horarioPrevisto : null;
  }

  function dosesDoPaciente(banco, idPaciente) {
    var remedios = banco.medicamentos.filter(function (m) { return m.idPaciente === idPaciente; });
    var ids = remedios.map(function (m) { return m.id; });
    return banco.doses
      .filter(function (d) { return ids.indexOf(d.idMedicamento) !== -1; })
      .map(function (d) {
        var remedio = remedios.find(function (m) { return m.id === d.idMedicamento; });
        return {
          id: d.id,
          idMedicamento: d.idMedicamento,
          nomeMedicamento: remedio.nome,
          dosagem: remedio.dosagem,
          unidade: remedio.unidade,
          horarioPrevisto: d.horarioPrevisto,
          horarioConfirmado: d.horarioConfirmado,
          status: d.status
        };
      });
  }

  function contar(lista) {
    var previstas = lista.length;
    var tomadas = lista.filter(function (d) { return d.status === "tomada"; }).length;
    return {
      previstas: previstas,
      tomadas: tomadas,
      perdidas: lista.filter(function (d) { return d.status === "perdida"; }).length,
      percentual: previstas ? Math.round((tomadas / previstas) * 100) : 0
    };
  }

  function gerarAgenda(banco, remedio, diasParaFrente) {
    var inicio = new Date();
    var partes = remedio.horarioInicial.split(":");
    inicio.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
    var limite = new Date();
    limite.setDate(limite.getDate() + (diasParaFrente || 3));

    var passo = remedio.frequenciaHoras * 60 * 60 * 1000;
    var marca = inicio.getTime();
    while (marca < Date.now() - passo) marca += passo;

    while (marca <= limite.getTime()) {
      banco.doses.push({
        id: proximoId(banco),
        idMedicamento: remedio.id,
        horarioPrevisto: new Date(marca).toISOString(),
        horarioConfirmado: null,
        status: "prevista"
      });
      marca += passo;
    }
  }

  var Demo = {
    cadastrar: function (dados) {
      var banco = carregar();
      if (banco.usuarios.some(function (u) { return u.email === String(dados.email).toLowerCase(); })) {
        return falhar("Esse email já tem conta no BioShield.", 409);
      }
      var usuario = {
        id: proximoId(banco),
        nome: dados.nome,
        email: String(dados.email).toLowerCase(),
        senha: dados.senha
      };
      banco.usuarios.push(usuario);
      salvar(banco);
      return pronto({ id: usuario.id, nome: usuario.nome, email: usuario.email });
    },

    entrar: function (dados) {
      var banco = carregar();
      var usuario = banco.usuarios.find(function (u) {
        return u.email === String(dados.email).toLowerCase() && u.senha === dados.senha;
      });
      if (!usuario) return falhar("Email ou senha não conferem.", 401);
      var paciente = banco.pacientes.find(function (p) { return p.idUsuario === usuario.id; });
      return pronto({
        token: "demo." + usuario.id,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
        idPaciente: paciente ? paciente.id : null
      });
    },

    buscarFicha: function (idPaciente) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.id === Number(idPaciente); });
      if (!paciente) return falhar("Ficha nao encontrada.", 404);
      return pronto(montarFicha(banco, paciente));
    },

    criarFicha: function (dados) {
      var banco = carregar();
      var paciente = {
        id: proximoId(banco),
        idUsuario: Number(dados.idUsuario),
        tipoSanguineo: dados.tipoSanguineo || null,
        condicoes: dados.condicoes || null,
        observacoes: dados.observacoes || null,
        tokenQr: token(),
        qrAtivo: true,
        tokenGeradoEm: new Date().toISOString(),
        qrCanceladoEm: null,
        atualizadoEm: new Date().toISOString(),
        codigoCuidador: null
      };
      banco.pacientes.push(paciente);
      (dados.alergias || []).forEach(function (a) {
        banco.alergias.push({ id: proximoId(banco), idPaciente: paciente.id, substancia: a.substancia, gravidade: a.gravidade, observacao: a.observacao || null });
      });
      (dados.contatos || []).forEach(function (c, indice) {
        banco.contatos.push({ id: proximoId(banco), idPaciente: paciente.id, nome: c.nome, telefone: c.telefone, parentesco: c.parentesco || null, prioridade: c.prioridade || indice + 1 });
      });
      salvar(banco);
      return pronto(montarFicha(banco, paciente));
    },

    salvarFicha: function (idPaciente, dados) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.id === Number(idPaciente); });
      if (!paciente) return falhar("Ficha nao encontrada.", 404);

      paciente.tipoSanguineo = dados.tipoSanguineo || null;
      paciente.condicoes = dados.condicoes || null;
      paciente.observacoes = dados.observacoes || null;
      paciente.atualizadoEm = new Date().toISOString();

      banco.alergias = banco.alergias.filter(function (a) { return a.idPaciente !== paciente.id; });
      (dados.alergias || []).forEach(function (a) {
        banco.alergias.push({ id: proximoId(banco), idPaciente: paciente.id, substancia: a.substancia, gravidade: a.gravidade, observacao: a.observacao || null });
      });

      banco.contatos = banco.contatos.filter(function (c) { return c.idPaciente !== paciente.id; });
      (dados.contatos || []).forEach(function (c, indice) {
        banco.contatos.push({ id: proximoId(banco), idPaciente: paciente.id, nome: c.nome, telefone: c.telefone, parentesco: c.parentesco || null, prioridade: c.prioridade || indice + 1 });
      });

      salvar(banco);
      return pronto(montarFicha(banco, paciente));
    },

    rotacionarQr: function (idPaciente) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.id === Number(idPaciente); });
      if (!paciente) return falhar("Ficha nao encontrada.", 404);
      paciente.tokenQr = token();
      paciente.tokenGeradoEm = new Date().toISOString();
      paciente.qrAtivo = true;
      paciente.qrCanceladoEm = null;
      salvar(banco);
      return pronto({ tokenQr: paciente.tokenQr, tokenGeradoEm: paciente.tokenGeradoEm, qrAtivo: true, qrCanceladoEm: null });
    },

    cancelarQr: function (idPaciente) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.id === Number(idPaciente); });
      if (!paciente) return falhar("Ficha nao encontrada.", 404);
      paciente.qrAtivo = false;
      paciente.qrCanceladoEm = new Date().toISOString();
      salvar(banco);
      return pronto({ qrAtivo: false, qrCanceladoEm: paciente.qrCanceladoEm });
    },

    reativarQr: function (idPaciente) {
      return Demo.rotacionarQr(idPaciente);
    },

    listarAcessos: function (idPaciente) {
      var banco = carregar();
      return pronto(
        banco.acessos
          .filter(function (a) { return a.idPaciente === Number(idPaciente); })
          .sort(function (a, b) { return new Date(b.acessadoEm) - new Date(a.acessadoEm); })
      );
    },

    gerarCodigoCuidador: function (idPaciente) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.id === Number(idPaciente); });
      if (!paciente) return falhar("Ficha nao encontrada.", 404);
      var letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      var codigo = "";
      for (var i = 0; i < 4; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
      for (var j = 0; j < 3; j++) codigo += Math.floor(Math.random() * 10);
      paciente.codigoCuidador = codigo;
      salvar(banco);
      return pronto({ codigo: codigo, validoAte: new Date(Date.now() + 86400000).toISOString() });
    },

    listarMedicamentos: function (idPaciente) {
      var banco = carregar();
      return pronto(
        banco.medicamentos
          .filter(function (m) { return m.idPaciente === Number(idPaciente); })
          .map(function (m) {
            var copia = Object.assign({}, m);
            copia.proximaDose = proximaDoseDe(banco, m.id);
            return copia;
          })
      );
    },

    cadastrarMedicamento: function (dados) {
      var banco = carregar();
      var remedio = {
        id: proximoId(banco),
        idPaciente: Number(dados.idPaciente),
        nome: dados.nome,
        dosagem: Number(dados.dosagem),
        unidade: dados.unidade,
        frequenciaHoras: Number(dados.frequenciaHoras),
        horarioInicial: dados.horarioInicial,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim || null,
        ativo: true
      };
      banco.medicamentos.push(remedio);
      gerarAgenda(banco, remedio, 3);
      salvar(banco);
      var copia = Object.assign({}, remedio);
      copia.proximaDose = proximaDoseDe(banco, remedio.id);
      return pronto(copia);
    },

    atualizarMedicamento: function (id, dados) {
      var banco = carregar();
      var remedio = banco.medicamentos.find(function (m) { return m.id === Number(id); });
      if (!remedio) return falhar("Remédio não encontrado.", 404);
      Object.keys(dados).forEach(function (chave) {
        if (dados[chave] !== undefined && chave !== "id" && chave !== "idPaciente") remedio[chave] = dados[chave];
      });
      salvar(banco);
      return pronto(remedio);
    },

    apagarMedicamento: function (id) {
      var banco = carregar();
      banco.medicamentos = banco.medicamentos.filter(function (m) { return m.id !== Number(id); });
      banco.doses = banco.doses.filter(function (d) { return d.idMedicamento !== Number(id); });
      salvar(banco);
      return pronto({ apagado: true });
    },

    dosesDeHoje: function (idPaciente) {
      var banco = carregar();
      var inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      var fim = new Date(); fim.setHours(23, 59, 59, 999);
      return pronto(
        dosesDoPaciente(banco, Number(idPaciente))
          .filter(function (d) {
            var marca = new Date(d.horarioPrevisto);
            return marca >= inicio && marca <= fim;
          })
          .sort(function (a, b) { return new Date(a.horarioPrevisto) - new Date(b.horarioPrevisto); })
      );
    },

    confirmarDose: function (id) {
      var banco = carregar();
      var dose = banco.doses.find(function (d) { return d.id === Number(id); });
      if (!dose) return falhar("Dose não encontrada.", 404);
      dose.status = "tomada";
      dose.horarioConfirmado = new Date().toISOString();
      salvar(banco);
      return pronto({ id: dose.id, status: dose.status, horarioConfirmado: dose.horarioConfirmado });
    },

    adesao: function (idPaciente) {
      var banco = carregar();
      var todas = dosesDoPaciente(banco, Number(idPaciente));
      var inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      var inicioSemana = new Date(); inicioSemana.setDate(inicioSemana.getDate() - 6); inicioSemana.setHours(0, 0, 0, 0);
      var agora = new Date();

      var doDia = todas.filter(function (d) {
        var marca = new Date(d.horarioPrevisto);
        return marca >= inicioDia && marca <= new Date(inicioDia.getTime() + 86399999);
      });
      var daSemana = todas.filter(function (d) {
        var marca = new Date(d.horarioPrevisto);
        return marca >= inicioSemana && marca <= agora;
      });

      return pronto({ hoje: contar(doDia), semana: contar(daSemana) });
    },

    vincularCuidador: function (dados) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) {
        return p.codigoCuidador && p.codigoCuidador.toUpperCase() === String(dados.codigo || "").toUpperCase();
      });
      if (!paciente) return falhar("Esse código não corresponde a nenhum paciente.", 404);
      var jaExiste = banco.vinculos.find(function (v) {
        return v.idCuidador === Number(dados.idCuidador) && v.idPaciente === paciente.id;
      });
      if (jaExiste) {
        jaExiste.ativo = true;
        salvar(banco);
        return pronto({ idVinculo: jaExiste.id, idPaciente: paciente.id });
      }
      var vinculo = { id: proximoId(banco), idCuidador: Number(dados.idCuidador), idPaciente: paciente.id, ativo: true, autorizadoEm: new Date().toISOString() };
      banco.vinculos.push(vinculo);
      salvar(banco);
      return pronto({ idVinculo: vinculo.id, idPaciente: paciente.id });
    },

    pacientesDoCuidador: function (idCuidador) {
      var banco = carregar();
      var agora = Date.now();
      var lista = banco.vinculos
        .filter(function (v) { return v.idCuidador === Number(idCuidador) && v.ativo; })
        .map(function (v) {
          var paciente = banco.pacientes.find(function (p) { return p.id === v.idPaciente; });
          var usuario = banco.usuarios.find(function (u) { return u.id === paciente.idUsuario; });
          var doses = dosesDoPaciente(banco, paciente.id);
          var inicioSemana = new Date(); inicioSemana.setDate(inicioSemana.getDate() - 6); inicioSemana.setHours(0, 0, 0, 0);
          var semana = doses.filter(function (d) {
            var marca = new Date(d.horarioPrevisto);
            return marca >= inicioSemana && marca.getTime() <= agora;
          });
          var futuras = doses
            .filter(function (d) { return d.status === "prevista" && new Date(d.horarioPrevisto).getTime() >= agora; })
            .sort(function (a, b) { return new Date(a.horarioPrevisto) - new Date(b.horarioPrevisto); });
          var resumo = contar(semana);
          return {
            idVinculo: v.id,
            idPaciente: paciente.id,
            nome: usuario.nome,
            adesaoSemana: resumo.percentual,
            dosesPerdidas: resumo.perdidas,
            proximaDose: futuras.length ? { nomeMedicamento: futuras[0].nomeMedicamento, horarioPrevisto: futuras[0].horarioPrevisto } : null
          };
        });
      return pronto(lista);
    },

    desvincularCuidador: function (idVinculo) {
      var banco = carregar();
      var vinculo = banco.vinculos.find(function (v) { return v.id === Number(idVinculo); });
      if (vinculo) vinculo.ativo = false;
      salvar(banco);
      return pronto({ removido: true });
    },

    fichaDeEmergencia: function (tokenBuscado) {
      var banco = carregar();
      var paciente = banco.pacientes.find(function (p) { return p.tokenQr === tokenBuscado; });
      if (!paciente) return falhar("Esse código não existe no BioShield.", 404);
      if (!paciente.qrAtivo) return falhar("Este QR Code foi cancelado pelo titular.", 410);

      var usuario = banco.usuarios.find(function (u) { return u.id === paciente.idUsuario; });
      paciente.acessosRegistrados = true;
      banco.acessos.push({
        id: proximoId(banco),
        idPaciente: paciente.id,
        acessadoEm: new Date().toISOString(),
        ip: "modo demonstração",
        userAgent: navigator.userAgent.slice(0, 60)
      });
      salvar(banco);

      var ordem = { grave: 0, moderada: 1, leve: 2 };
      return pronto({
        nome: usuario.nome,
        tipoSanguineo: paciente.tipoSanguineo,
        condicoes: paciente.condicoes,
        observacoes: paciente.observacoes,
        atualizadoEm: paciente.atualizadoEm,
        alergias: banco.alergias
          .filter(function (a) { return a.idPaciente === paciente.id; })
          .sort(function (a, b) { return ordem[a.gravidade] - ordem[b.gravidade]; }),
        medicamentos: banco.medicamentos
          .filter(function (m) { return m.idPaciente === paciente.id && m.ativo; })
          .map(function (m) { return { nome: m.nome, dosagem: m.dosagem, unidade: m.unidade, frequenciaHoras: m.frequenciaHoras }; }),
        contatos: banco.contatos
          .filter(function (c) { return c.idPaciente === paciente.id; })
          .sort(function (a, b) { return a.prioridade - b.prioridade; })
          .map(function (c) { return { nome: c.nome, telefone: c.telefone, parentesco: c.parentesco }; })
      });
    },

    reiniciar: function () {
      sessionStorage.removeItem(CHAVE);
      return pronto({ reiniciado: true });
    }
  };

  escopo.BioShieldDemo = Demo;
})(window);
