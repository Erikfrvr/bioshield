// Alarme dos remedios.
// No app Android, cada dose vira um aviso agendado no proprio celular, com som de alarme e vibracao,
// que toca na hora e repete de 5 em 5 minutos ate a pessoa confirmar ou ate a dose passar da tolerancia.
// Toca com a tela bloqueada e com o app fechado, porque quem dispara e o Android, nao a pagina.
// Com o BioShield aberto (no app ou no navegador) aparece tambem a janela de alarme por cima da tela, com som.
// A agenda vem do Api.proximasDoses, entao funciona igual no modo demonstracao e com o servidor.
// Fala com o plugin @capacitor/local-notifications direto pela ponte que o Android coloca na janela,
// do mesmo jeito que o ui.js faz com o botao de voltar, porque o front nao tem empacotador.
// Todos os textos que a pessoa ve estao listados no docs/GUIA_APK.md, na parte do alarme.

(function (escopo) {
  "use strict";

  // ===== Regras do alarme =====

  var REPETIR_A_CADA_MIN = 5;
  // Igual a tolerancia do backend (TOLERANCIA_ATRASO_MINUTOS da entidade Dose): depois disso a dose
  // vira perdida, entao o ultimo aviso sai 60 minutos depois do horario.
  var REPETIR_ATE_MIN = 60;
  // O Android aceita no maximo 500 alarmes por app. Fico bem abaixo, com os mais proximos primeiro.
  var MAXIMO_AVISOS = 300;
  // Aviso com horario no passado o plugin dispara na mesma hora. So agendo o que ainda falta pelo menos isso.
  var FOLGA_MS = 5000;
  // De quanto em quanto tempo uma troca de tela busca a agenda de novo no servidor.
  var SINCRONIZAR_A_CADA_MS = 5 * 60 * 1000;
  var MINUTO_MS = 60 * 1000;
  var ESPERA_TESTE_MS = 5000;
  // Toque na notificacao que nao foi tratado em 10 minutos e descartado.
  var ACAO_VALE_POR_MS = 10 * MINUTO_MS;
  // A janela de alarme toca o som por no maximo 2 minutos. O proximo lembrete toca de novo.
  var SOM_POR_MS = 2 * MINUTO_MS;

  // ===== Identidade no Android =====

  var PLUGIN = "LocalNotifications";
  // O canal guarda o som e a importancia, e o Android nao deixa mudar depois de criado.
  // Se um dia o som mudar, o nome do canal tem que mudar junto.
  var CANAL = "bioshield_alarme";
  var SOM = "bioshield_alarme.wav";
  var ICONE = "ic_stat_bioshield";
  var COR = "#E8604C";
  var TIPO_ACOES = "bioshield_dose";
  // Cada dose usa os ids idDose x 20 ate idDose x 20 + 19: de 0 a 12 sao as repeticoes,
  // e o 19 e o "Lembrar em 5 min". O teste do alarme usa um id que nenhuma dose alcanca.
  var IDS_POR_DOSE = 20;
  var POSICAO_ADIADA = 19;
  var ID_TESTE = 2147000000;

  var CHAVE_ACAO = "bioshield.alarme.acao";
  var CHAVE_AGENDA = "bioshield.alarme.agenda";
  var CHAVE_ADIADOS = "bioshield.alarme.adiados";
  var CHAVE_MOSTRADAS = "bioshield.alarme.mostradas";
  var CHAVE_PEDIU = "bioshield.alarme.pediuPermissao";

  var DOSE_TESTE = { id: null, nomeMedicamento: "Teste do alarme", dosagem: null, unidade: "", horarioPrevisto: null, teste: true };

  // ===== Armazenamento =====

  function lerJson(armazem, chave) {
    try {
      return JSON.parse(armazem.getItem(chave) || "null");
    } catch (erro) {
      return null;
    }
  }

  function gravarJson(armazem, chave, valor) {
    try {
      if (valor === null) armazem.removeItem(chave);
      else armazem.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
      // Sem armazenamento: vale so para esta tela.
    }
  }

  // ===== Ponte com o Android =====

  function pontePronta() {
    var cap = escopo.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return false;
    if (typeof cap.nativePromise !== "function" || typeof cap.addListener !== "function") return false;
    return (cap.PluginHeaders || []).some(function (plugin) { return plugin.name === PLUGIN; });
  }

  var nativo = pontePronta();

  function plugin(metodo, opcoes) {
    return escopo.Capacitor.nativePromise(PLUGIN, metodo, opcoes || {});
  }

  // ===== Onde estou =====

  function naEntrada() {
    return location.pathname.indexOf("/pages/") === -1;
  }

  function caminhoDasDoses() {
    return naEntrada() ? "pages/doses.html" : "doses.html";
  }

  function sessaoComFicha() {
    var sessao = escopo.Api ? escopo.Api.sessao() : null;
    return sessao && sessao.usuario && sessao.idPaciente ? sessao : null;
  }

  function recado(texto, tipo) {
    if (escopo.UI) escopo.UI.recado(texto, tipo);
  }

  // ===== Textos =====

  function formatarDosagem(dose) {
    var numero = Number(dose.dosagem);
    var valor = Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace(".", ",");
    return valor + " " + dose.unidade;
  }

  function hora(valorIso) {
    return escopo.UI ? escopo.UI.formatarHora(valorIso) : new Date(valorIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function textoDoAviso(dose, posicao) {
    var nome = dose.nomeMedicamento;
    var quanto = formatarDosagem(dose);
    var horario = hora(dose.horarioPrevisto);

    if (posicao === 0) {
      return { titulo: "Hora do remédio: " + nome, corpo: "Tome " + quanto + " agora. Depois toque em Tomei." };
    }
    if (posicao === POSICAO_ADIADA) {
      return { titulo: "Lembrete: " + nome, corpo: "Você pediu para lembrar de novo. Tome " + quanto + " e toque em Tomei." };
    }
    if (posicao * REPETIR_A_CADA_MIN >= REPETIR_ATE_MIN) {
      return { titulo: "Último aviso: " + nome, corpo: "A dose das " + horario + " passou 1 hora sem confirmação. Se já tomou, toque em Tomei." };
    }
    return { titulo: "Lembrete: " + nome, corpo: "A dose das " + horario + " ainda não foi confirmada. Tome " + quanto + " e toque em Tomei." };
  }

  var TEXTO_TESTE = {
    titulo: "Teste do alarme do BioShield",
    corpo: "Se você ouviu o som e viu este aviso, o alarme dos remédios está funcionando."
  };

  // ===== Plano de avisos =====

  function idDoAviso(idDose, posicao) {
    return Number(idDose) * IDS_POR_DOSE + posicao;
  }

  function resumoDaDose(dose) {
    return {
      id: dose.id,
      nomeMedicamento: dose.nomeMedicamento,
      dosagem: dose.dosagem,
      unidade: dose.unidade,
      horarioPrevisto: dose.horarioPrevisto
    };
  }

  // "Lembrar em 5 min" de cada dose: { idDose: horario em ms }. Passado o horario, some sozinho.
  function lerAdiados() {
    var adiados = lerJson(localStorage, CHAVE_ADIADOS) || {};
    var agora = Date.now();
    Object.keys(adiados).forEach(function (id) {
      if (adiados[id] < agora) delete adiados[id];
    });
    return adiados;
  }

  function gravarAdiado(idDose, quando) {
    var adiados = lerAdiados();
    if (quando === null) delete adiados[idDose];
    else adiados[idDose] = quando;
    gravarJson(localStorage, CHAVE_ADIADOS, adiados);
  }

  // Cada dose prevista vira o aviso do horario e as repeticoes de 5 em 5 minutos ate a tolerancia.
  // Quem tocou em "Lembrar em 5 min" ganha o aviso adiado, e as repeticoes antes dele saem do plano.
  // So entra o que ainda vai acontecer, mais proximo primeiro, ate o limite de avisos.
  function montarAvisos(doses, agora) {
    var avisos = [];
    var adiados = lerAdiados();
    (doses || []).forEach(function (dose) {
      if (dose.status && dose.status !== "prevista") return;
      var base = new Date(dose.horarioPrevisto).getTime();
      var adiado = adiados[dose.id] || 0;
      for (var posicao = 0; posicao * REPETIR_A_CADA_MIN <= REPETIR_ATE_MIN; posicao++) {
        var quando = base + posicao * REPETIR_A_CADA_MIN * MINUTO_MS;
        if (quando < agora + FOLGA_MS || quando < adiado) continue;
        avisos.push({ dose: dose, posicao: posicao, quando: quando });
      }
      if (adiado >= agora + FOLGA_MS) avisos.push({ dose: dose, posicao: POSICAO_ADIADA, quando: adiado });
    });
    avisos.sort(function (a, b) { return a.quando - b.quando; });
    return avisos.slice(0, MAXIMO_AVISOS);
  }

  // O aviso no formato do plugin. O extra leva a dose junto, pra o toque em "Tomei"
  // funcionar mesmo com o app fechado, sem buscar nada antes.
  function paraNotificacao(aviso, exato) {
    var texto = aviso.teste ? TEXTO_TESTE : textoDoAviso(aviso.dose, aviso.posicao);
    return {
      id: aviso.teste ? ID_TESTE : idDoAviso(aviso.dose.id, aviso.posicao),
      title: texto.titulo,
      body: texto.corpo,
      largeBody: texto.corpo,
      channelId: CANAL,
      sound: SOM,
      smallIcon: ICONE,
      iconColor: COR,
      actionTypeId: TIPO_ACOES,
      // Prioridade alta no Android 7, que ainda nao tem canal de notificacao.
      foreground: true,
      autoCancel: true,
      // Sem a permissao de horario exato o plugin abriria as configuracoes do celular a cada agendamento.
      // Nesse caso o aviso vai sem horario exato, e o cartao da tela de doses explica como liberar.
      isExactNotification: exato,
      // allowWhileIdle: toca mesmo com o celular parado em economia de energia.
      schedule: { at: new Date(aviso.quando).toISOString(), allowWhileIdle: true },
      extra: aviso.teste
        ? { bioshield: true, teste: true }
        : { bioshield: true, idDose: aviso.dose.id, posicao: aviso.posicao, dose: resumoDaDose(aviso.dose) }
    };
  }

  // ===== Android: canal, botoes e permissao =====

  var preparado = null;

  // O canal e o que faz a notificacao descer da barra com som e vibracao.
  // Os botoes aparecem embaixo de cada aviso. No Android 7 o canal nao existe e a chamada falha calada.
  function prepararNativo() {
    if (!preparado) {
      preparado = Promise.all([
        plugin("createChannel", {
          id: CANAL,
          name: "Alarme dos remédios",
          description: "Toca na hora de cada dose e repete a cada 5 minutos até você confirmar.",
          importance: 4,
          visibility: 1,
          sound: SOM,
          vibration: true,
          lights: true,
          lightColor: COR
        }).catch(function () { /* Android 7 */ }),
        plugin("registerActionTypes", {
          types: [{
            id: TIPO_ACOES,
            actions: [
              { id: "tomei", title: "Tomei" },
              { id: "adiar", title: "Lembrar em 5 min" }
            ]
          }]
        }).catch(function () { /* fica sem os botoes */ })
      ]);
    }
    return preparado;
  }

  // "granted", "denied" ou "prompt". No navegador nao existe permissao a pedir.
  async function permissao() {
    if (!nativo) return "navegador";
    try {
      var resposta = await plugin("checkPermissions");
      var estado = resposta && resposta.display;
      if (estado === "granted" || estado === "denied") return estado;
      return "prompt";
    } catch (erro) {
      return "prompt";
    }
  }

  async function exatoLiberado() {
    if (!nativo) return true;
    try {
      var resposta = await plugin("checkExactNotificationSetting");
      return !resposta || resposta.exact_alarm !== "denied";
    } catch (erro) {
      return true;
    }
  }

  async function pedirPermissao() {
    if (!nativo) return "navegador";
    gravarJson(localStorage, CHAVE_PEDIU, true);
    var estado;
    try {
      var resposta = await plugin("requestPermissions");
      estado = resposta && resposta.display === "granted" ? "granted" : "denied";
    } catch (erro) {
      estado = "denied";
    }
    if (estado === "granted") await sincronizar(true);
    avisarMudanca();
    return estado;
  }

  // Pede a permissao uma vez so, sozinho. Depois disso, quem decide e o cartao da tela de doses.
  async function pedirSeNuncaPediu() {
    if (!nativo || lerJson(localStorage, CHAVE_PEDIU)) return;
    if ((await permissao()) === "prompt") await pedirPermissao();
  }

  async function liberarHorarioExato() {
    if (!nativo) return;
    try {
      await plugin("changeExactNotificationSetting");
    } catch (erro) {
      // A pessoa voltou sem mudar nada.
    }
    await sincronizar(true);
    avisarMudanca();
  }

  // ===== Android: agendar e cancelar =====

  var avisosAgendados = 0;

  async function cancelarAgendados(manterTeste) {
    var resposta = await plugin("getPending");
    var nossos = ((resposta && resposta.notifications) || []).filter(function (aviso) {
      if (!aviso.extra || !aviso.extra.bioshield) return false;
      return !(manterTeste && aviso.id === ID_TESTE);
    }).map(function (aviso) { return { id: aviso.id }; });
    if (nossos.length) await plugin("cancel", { notifications: nossos });
  }

  // Troca a agenda inteira: cancela os avisos do BioShield e agenda de novo a partir das doses.
  // Assim remedio suspenso, apagado ou com horario novo nunca deixa aviso velho tocando.
  async function agendarNoCelular(doses) {
    await prepararNativo();
    await cancelarAgendados(true);
    avisosAgendados = 0;
    try {
      await arrumarBarra(doses);
    } catch (erro) {
      // A barra fica como esta ate a proxima vez.
    }
    if ((await permissao()) !== "granted") return;
    var exato = await exatoLiberado();
    var avisos = montarAvisos(doses, Date.now()).map(function (aviso) { return paraNotificacao(aviso, exato); });
    if (avisos.length) await plugin("schedule", { notifications: avisos });
    avisosAgendados = avisos.length;
  }

  // Cada lembrete que toca fica na barra do Android. Sem arrumar, uma hora sem confirmar daria
  // 13 avisos da mesma dose empilhados, e o Android esconde os botoes quando junta varios num grupo.
  // Fica um aviso so por dose ainda prevista (a repeticao mais avancada; o adiado so quando e o unico),
  // e sai o aviso de dose que ja foi tomada, que passou da tolerancia ou que saiu da agenda.
  async function arrumarBarra(doses) {
    var resposta = await plugin("getDeliveredNotifications");
    var entregues = ((resposta && resposta.notifications) || [])
      .map(function (aviso) { return aviso.id; })
      .filter(function (id) { return id !== ID_TESTE && id >= IDS_POR_DOSE; });
    var previstas = {};
    (doses || []).forEach(function (dose) { previstas[dose.id] = true; });

    var fica = {};
    entregues.forEach(function (id) {
      var idDose = Math.floor(id / IDS_POR_DOSE);
      if (!previstas[idDose]) return;
      var posicao = id % IDS_POR_DOSE;
      var atual = fica[idDose];
      var atualAdiado = atual !== undefined && atual % IDS_POR_DOSE === POSICAO_ADIADA;
      if (atual === undefined || atualAdiado || (posicao !== POSICAO_ADIADA && posicao > atual % IDS_POR_DOSE)) {
        fica[idDose] = id;
      }
    });

    var tirar = entregues.filter(function (id) { return fica[Math.floor(id / IDS_POR_DOSE)] !== id; });
    if (tirar.length) await plugin("removeDeliveredNotificationsById", { ids: tirar });
  }

  // Lembrete novo chegou com o app vivo: os avisos anteriores da mesma dose saem da barra na hora.
  function deixarSoOUltimo(aviso) {
    if (!aviso || !aviso.extra || !aviso.extra.idDose) return;
    var outros = [];
    for (var posicao = 0; posicao < IDS_POR_DOSE; posicao++) {
      var id = idDoAviso(aviso.extra.idDose, posicao);
      if (id !== aviso.id) outros.push(id);
    }
    plugin("removeDeliveredNotificationsById", { ids: outros }).catch(function () { /* fica para a proxima arrumacao */ });
  }

  async function tirarDaBarra(idDose) {
    var ids = [];
    for (var posicao = 0; posicao < IDS_POR_DOSE; posicao++) ids.push(idDoAviso(idDose, posicao));
    try {
      await plugin("cancel", { notifications: ids.map(function (id) { return { id: id }; }) });
      await plugin("removeDeliveredNotificationsById", { ids: ids });
    } catch (erro) {
      // O proximo agendamento completo resolve.
    }
  }

  // ===== Agenda =====

  // A ultima agenda que veio do servidor (ou da demonstracao), guardada por aba.
  // Serve pra trocar de tela sem buscar de novo e pra continuar com o alarme se o servidor cair.
  function agendaGuardada(dono) {
    var guardada = lerJson(sessionStorage, CHAVE_AGENDA);
    return guardada && guardada.dono === dono ? guardada : null;
  }

  function donoDaSessao(sessao) {
    return sessao.usuario.id + ":" + sessao.idPaciente + ":" + String(sessao.token || "").slice(-16);
  }

  var dosesAtuais = [];

  // Aplica uma agenda sem ir ao servidor: no celular, nos relogios da tela e na janela de dose atrasada.
  async function aplicar(doses) {
    dosesAtuais = doses || [];
    if (nativo) {
      try {
        await agendarNoCelular(dosesAtuais);
      } catch (erro) {
        // Fica com o que ja estava agendado.
      }
    }
    await programarTela(dosesAtuais);
    avisarMudanca();
  }

  async function executarSincronia(forcar) {
    var sessao = sessaoComFicha();
    if (!sessao) {
      await desligar();
      return;
    }

    var dono = donoDaSessao(sessao);
    var guardada = agendaGuardada(dono);
    if (!forcar && guardada && Date.now() - guardada.em < SINCRONIZAR_A_CADA_MS) {
      await programarTela(guardada.doses);
      dosesAtuais = guardada.doses;
      avisarMudanca();
      return;
    }

    var doses;
    try {
      doses = await escopo.Api.proximasDoses(sessao.idPaciente);
    } catch (erro) {
      // Sem servidor nao cancelo nada: os avisos que ja estao no celular continuam valendo.
      if (guardada) await programarTela(guardada.doses);
      return;
    }
    gravarJson(sessionStorage, CHAVE_AGENDA, { dono: dono, em: Date.now(), doses: doses });
    await aplicar(doses);
  }

  var fila = Promise.resolve();

  // Uma sincronia por vez. forcar ignora o intervalo de 5 minutos (remedio novo, dose confirmada, login).
  function sincronizar(forcar) {
    fila = fila.then(function () { return executarSincronia(forcar); }).catch(function () { /* tenta na proxima */ });
    return fila;
  }

  // Sem conta (saiu, sessao terminou, conta de cuidador sem ficha): nenhum aviso pode continuar tocando.
  async function desligar() {
    limparRelogios();
    dosesAtuais = [];
    gravarJson(sessionStorage, CHAVE_AGENDA, null);
    gravarJson(localStorage, CHAVE_ADIADOS, null);
    avisosAgendados = 0;
    if (nativo) {
      try {
        await cancelarAgendados(false);
        // Os avisos que ja tocaram tambem saem da barra: sao da conta de quem saiu.
        await plugin("removeAllDeliveredNotifications");
      } catch (erro) {
        // Na proxima abertura tento de novo.
      }
    }
  }

  // Tira a dose da agenda guardada na hora, sem esperar o servidor. Senao, trocando de tela logo depois
  // de confirmar, a janela de alarme abriria de novo para uma dose que ja foi tomada.
  function tirarDaAgendaGuardada(idDose) {
    var guardada = lerJson(sessionStorage, CHAVE_AGENDA);
    if (guardada) {
      guardada.doses = guardada.doses.filter(function (dose) { return dose.id !== idDose; });
      gravarJson(sessionStorage, CHAVE_AGENDA, guardada);
    }
    return dosesAtuais.filter(function (dose) { return dose.id !== idDose; });
  }

  // Chamado por quem confirmou uma dose (tela de doses, janela de alarme ou botao da notificacao).
  // avisarTela false: quem chamou ja recarrega a propria lista.
  async function doseConfirmada(idDose, avisarTela) {
    gravarAdiado(idDose, null);
    fecharJanelaDaDose(idDose);
    if (nativo) await tirarDaBarra(idDose);
    await aplicar(tirarDaAgendaGuardada(idDose));
    if (avisarTela !== false) document.dispatchEvent(new CustomEvent("bioshield:doses-mudaram"));
    sincronizar(true);
  }

  // ===== Acoes =====

  async function confirmar(dose) {
    if (dose.teste) {
      fecharJanelaDaDose(null);
      recado("Teste concluído. O alarme está funcionando.");
      return;
    }
    try {
      await escopo.Api.confirmarDose(dose.id);
      recado("Dose de " + dose.nomeMedicamento + " confirmada.");
    } catch (erro) {
      if (erro.status === 400 && /já foi confirmada/.test(erro.message)) {
        recado("Essa dose já estava confirmada.");
      } else {
        recado("Não consegui confirmar. " + erro.message, "erro");
        return;
      }
    }
    await doseConfirmada(dose.id, true);
  }

  async function adiar(dose) {
    fecharJanelaDaDose(dose.teste ? null : dose.id);
    if (dose.teste) {
      recado("Teste concluído. O alarme está funcionando.");
      return;
    }
    gravarAdiado(dose.id, Date.now() + REPETIR_A_CADA_MIN * MINUTO_MS);
    await aplicar(dosesAtuais.length ? dosesAtuais : [dose]);
    recado("Vou lembrar de novo em 5 minutos.");
  }

  // O toque na notificacao chega pelo plugin, as vezes antes da tela estar pronta, ou na tela de entrada.
  // Guardo na aba e trato numa tela com conta. Na entrada, levo a pessoa para as doses e trato la.
  function guardarAcao(acao, extra) {
    gravarJson(sessionStorage, CHAVE_ACAO, { acao: acao, extra: extra, em: Date.now() });
  }

  function temAcaoPendente() {
    var pendente = lerJson(sessionStorage, CHAVE_ACAO);
    return Boolean(pendente && Date.now() - pendente.em < ACAO_VALE_POR_MS);
  }

  async function processarAcaoPendente() {
    var pendente = lerJson(sessionStorage, CHAVE_ACAO);
    if (!pendente) return;
    if (Date.now() - pendente.em > ACAO_VALE_POR_MS || !sessaoComFicha()) {
      gravarJson(sessionStorage, CHAVE_ACAO, null);
      return;
    }
    if (naEntrada()) {
      location.replace(caminhoDasDoses());
      return;
    }
    gravarJson(sessionStorage, CHAVE_ACAO, null);

    var extra = pendente.extra || {};
    var dose = extra.teste ? DOSE_TESTE : extra.dose;
    if (!dose) return;
    if (pendente.acao === "tomei") await confirmar(dose);
    else if (pendente.acao === "adiar") await adiar(dose);
    else tocarNaTela(dose, extra.posicao || 0, { origem: "toque" });
  }

  // ===== Som da janela de alarme =====

  var contextoSom = null;

  function obterSom() {
    if (contextoSom) return contextoSom;
    var Construtor = escopo.AudioContext || escopo.webkitAudioContext;
    if (!Construtor) return null;
    try {
      contextoSom = new Construtor();
    } catch (erro) {
      contextoSom = null;
    }
    return contextoSom;
  }

  // O navegador so deixa tocar som depois de um toque na tela. O primeiro toque ja destrava.
  function destravarSom() {
    var contexto = obterSom();
    if (contexto && contexto.state === "suspended") contexto.resume().catch(function () {});
  }

  function bip(contexto, inicio, frequencia, duracao) {
    var oscilador = contexto.createOscillator();
    var volume = contexto.createGain();
    oscilador.type = "square";
    oscilador.frequency.value = frequencia;
    volume.gain.setValueAtTime(0.0001, inicio);
    volume.gain.exponentialRampToValueAtTime(0.18, inicio + 0.015);
    volume.gain.setValueAtTime(0.18, inicio + duracao - 0.03);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    oscilador.connect(volume);
    volume.connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracao + 0.02);
  }

  // Tres bipes curtos e um longo, o mesmo desenho do som do aviso do celular.
  function tocarSequencia() {
    var contexto = obterSom();
    if (!contexto) return;
    if (contexto.state === "suspended") contexto.resume().catch(function () {});
    var t = contexto.currentTime + 0.05;
    bip(contexto, t, 988, 0.13);
    bip(contexto, t + 0.22, 988, 0.13);
    bip(contexto, t + 0.44, 988, 0.13);
    bip(contexto, t + 0.7, 1319, 0.42);
    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate([400, 200, 400, 200, 800]); } catch (erro) { /* sem vibracao */ }
    }
  }

  var relogioSom = null;
  var fimDoSom = 0;

  function pararSom() {
    if (relogioSom) clearInterval(relogioSom);
    if (relogioSom && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(0); } catch (erro) { /* sem vibracao */ }
    }
    relogioSom = null;
  }

  // Toca em ciclo enquanto a janela estiver aberta. Se a janela fechar por qualquer caminho
  // (botao, voltar do Android), o ciclo percebe e para sozinho.
  function tocarSom(esperaMs) {
    pararSom();
    fimDoSom = Date.now() + SOM_POR_MS;
    var comecar = function () {
      if (!janela || janela.hidden) return;
      tocarSequencia();
      relogioSom = setInterval(function () {
        if (!janela || janela.hidden || Date.now() > fimDoSom) {
          pararSom();
          return;
        }
        tocarSequencia();
      }, 2200);
    };
    if (esperaMs) setTimeout(comecar, esperaMs);
    else comecar();
  }

  // ===== Janela de alarme =====

  var ICONE_SINO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/><path d="M3.5 6.5a8.5 8.5 0 0 1 2.4-3.4M20.5 6.5a8.5 8.5 0 0 0-2.4-3.4"/></svg>';
  var ICONE_CERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICONE_RELOGIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/></svg>';

  var janela = null;
  var doseNaJanela = null;
  var posicaoNaJanela = 0;
  var filaDaJanela = [];

  function montarJanela() {
    if (janela) return janela;
    janela = document.createElement("div");
    janela.className = "sobreposicao alarme";
    janela.hidden = true;
    janela.setAttribute("role", "alertdialog");
    janela.setAttribute("aria-modal", "true");
    janela.setAttribute("aria-labelledby", "alarmeNome");
    janela.setAttribute("aria-describedby", "alarmeDetalhe");
    janela.innerHTML =
      '<div class="janela alarme-janela">' +
        '<span class="alarme-icone">' + ICONE_SINO + "</span>" +
        '<p class="alarme-rotulo" id="alarmeRotulo"></p>' +
        '<h2 class="alarme-nome" id="alarmeNome"></h2>' +
        '<p class="alarme-detalhe" id="alarmeDetalhe"></p>' +
        '<p class="alarme-fila" id="alarmeFila" hidden></p>' +
        '<div class="alarme-botoes">' +
          '<button type="button" class="botao botao-coral alarme-tomei" id="alarmeTomei">' + ICONE_CERTO + "Tomei</button>" +
          '<button type="button" class="botao botao-secundario" id="alarmeAdiar">' + ICONE_RELOGIO + "Lembrar em 5 min</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(janela);

    janela.querySelector("#alarmeTomei").addEventListener("click", async function () {
      var botao = this;
      if (!doseNaJanela) return;
      botao.disabled = true;
      pararSom();
      try {
        await confirmar(doseNaJanela);
      } finally {
        botao.disabled = false;
      }
    });
    janela.querySelector("#alarmeAdiar").addEventListener("click", function () {
      pararSom();
      if (doseNaJanela) adiar(doseNaJanela);
    });
    return janela;
  }

  function preencherJanela(dose, posicao) {
    var rotulo = janela.querySelector("#alarmeRotulo");
    var detalhe = janela.querySelector("#alarmeDetalhe");
    janela.querySelector("#alarmeNome").textContent = dose.nomeMedicamento;
    if (dose.teste) {
      rotulo.textContent = "Teste do alarme";
      detalhe.textContent = "Se você ouviu o som, o alarme dos remédios está funcionando.";
    } else {
      var atrasada = posicao > 0 || new Date(dose.horarioPrevisto).getTime() < Date.now() - MINUTO_MS;
      rotulo.textContent = atrasada ? "Lembrete do remédio" : "Hora do remédio";
      detalhe.textContent = "Tome " + formatarDosagem(dose) + ". Dose das " + hora(dose.horarioPrevisto) + ".";
    }
    var outras = filaDaJanela.length;
    var fila = janela.querySelector("#alarmeFila");
    fila.hidden = outras === 0;
    fila.textContent = outras === 1 ? "Depois deste, tem mais 1 remédio esperando." : "Depois deste, tem mais " + outras + " remédios esperando.";
  }

  function marcarMostrada(idDose) {
    if (idDose === null) return;
    var mostradas = lerJson(sessionStorage, CHAVE_MOSTRADAS) || {};
    mostradas[idDose] = Date.now();
    gravarJson(sessionStorage, CHAVE_MOSTRADAS, mostradas);
  }

  function mostradaHaPouco(idDose) {
    var mostradas = lerJson(sessionStorage, CHAVE_MOSTRADAS) || {};
    return Boolean(mostradas[idDose] && Date.now() - mostradas[idDose] < REPETIR_A_CADA_MIN * MINUTO_MS - FOLGA_MS);
  }

  // Abre a janela de alarme. Se ja tem outra dose na janela, esta entra na fila.
  // origem "aviso": o celular acabou de tocar o som dele, entao o som da janela espera um pouco.
  // origem "toque": a pessoa tocou na notificacao e ja esta olhando, entao a janela abre sem som.
  function tocarNaTela(dose, posicao, opcoes) {
    if (!dose || !document.body) return;
    opcoes = opcoes || {};
    montarJanela();
    var idDose = dose.teste ? null : dose.id;
    marcarMostrada(idDose);

    var aberta = !janela.hidden && doseNaJanela;
    if (aberta && doseNaJanela.id !== idDose) {
      if (!filaDaJanela.some(function (item) { return item.dose.id === idDose; })) {
        filaDaJanela.push({ dose: dose, posicao: posicao });
      }
      preencherJanela(doseNaJanela, posicaoNaJanela);
      return;
    }

    doseNaJanela = dose;
    posicaoNaJanela = posicao;
    preencherJanela(dose, posicao);
    janela.hidden = false;
    janela.querySelector("#alarmeTomei").focus();
    if (opcoes.origem === "toque") pararSom();
    else tocarSom(opcoes.origem === "aviso" ? 3500 : 0);
  }

  // Fecha a janela daquela dose e abre a proxima da fila, se tiver.
  function fecharJanelaDaDose(idDose) {
    filaDaJanela = filaDaJanela.filter(function (item) { return item.dose.id !== idDose; });
    if (!janela || janela.hidden || !doseNaJanela) return;
    var idNaJanela = doseNaJanela.teste ? null : doseNaJanela.id;
    if (idNaJanela !== idDose) return;
    pararSom();
    janela.hidden = true;
    doseNaJanela = null;
    var proxima = filaDaJanela.shift();
    if (proxima) tocarNaTela(proxima.dose, proxima.posicao, {});
  }

  // ===== Relogios da tela =====

  var relogios = [];

  function limparRelogios() {
    relogios.forEach(clearTimeout);
    relogios = [];
  }

  // Com a tela aberta: dose atrasada e ainda nao confirmada abre a janela na hora.
  // No navegador, ou no app sem permissao de notificacao, os relogios abrem a janela no horario de cada aviso.
  // No app com o alarme ligado quem abre a janela e o proprio aviso do celular (localNotificationReceived).
  async function programarTela(doses) {
    limparRelogios();
    var agora = Date.now();
    (doses || []).forEach(function (dose) {
      if (dose.status && dose.status !== "prevista") return;
      var horario = new Date(dose.horarioPrevisto).getTime();
      var atraso = agora - horario;
      if (atraso >= 0 && atraso <= REPETIR_ATE_MIN * MINUTO_MS && !mostradaHaPouco(dose.id)) {
        tocarNaTela(dose, Math.floor(atraso / (REPETIR_A_CADA_MIN * MINUTO_MS)), { origem: "atrasada" });
      }
    });

    if (nativo && (await permissao()) === "granted") return;
    montarAvisos(doses, agora).forEach(function (aviso) {
      var espera = aviso.quando - agora;
      // Relogio de mais de um dia nao faz sentido: a tela recarrega a agenda muito antes disso.
      if (espera > 24 * 60 * MINUTO_MS) return;
      relogios.push(setTimeout(function () {
        tocarNaTela(aviso.dose, aviso.posicao, { origem: "relogio" });
      }, espera));
    });
  }

  // ===== Teste =====

  async function testar() {
    destravarSom();
    if (nativo) {
      var estado = await permissao();
      if (estado !== "granted") estado = await pedirPermissao();
      if (estado !== "granted") {
        recado("O celular não deixou o BioShield mostrar avisos. Veja o cartão do alarme na tela de doses.", "erro");
        return;
      }
      await prepararNativo();
      var exato = await exatoLiberado();
      await plugin("schedule", { notifications: [paraNotificacao({ teste: true, quando: Date.now() + ESPERA_TESTE_MS }, exato)] });
      recado("O alarme de teste toca em 5 segundos. Pode bloquear a tela para conferir.");
      return;
    }
    recado("O alarme de teste toca em 5 segundos.");
    setTimeout(function () { tocarNaTela(DOSE_TESTE, 0, {}); }, ESPERA_TESTE_MS);
  }

  // ===== Cartao do alarme (tela de doses) =====

  function avisarMudanca() {
    document.dispatchEvent(new CustomEvent("bioshield:alarme-mudou"));
  }

  function proximaDose() {
    var agora = Date.now();
    return dosesAtuais
      .filter(function (dose) { return new Date(dose.horarioPrevisto).getTime() > agora; })
      .sort(function (a, b) { return new Date(a.horarioPrevisto) - new Date(b.horarioPrevisto); })[0] || null;
  }

  // Cada situacao do alarme: titulo, explicacao, botoes e se esta tudo certo.
  async function situacao() {
    if (!nativo) {
      return {
        tipo: "navegador", ok: true,
        titulo: "Alarme com a tela aberta",
        texto: "No navegador, o alarme toca enquanto o BioShield estiver aberto. No app Android ele toca mesmo com o celular bloqueado.",
        botoes: ["testar"]
      };
    }
    var estado = await permissao();
    if (estado === "prompt") {
      return {
        tipo: "desligado", ok: false,
        titulo: "Alarme desligado",
        texto: "Para o celular avisar na hora do remédio, permita as notificações do BioShield.",
        botoes: ["ligar"]
      };
    }
    if (estado === "denied") {
      return {
        tipo: "bloqueado", ok: false,
        titulo: "Notificações bloqueadas",
        texto: "O celular está bloqueando os avisos do BioShield. Abra as Configurações do celular, toque em Apps, depois em BioShield, depois em Notificações, e permita.",
        botoes: ["conferir"]
      };
    }
    if (!(await exatoLiberado())) {
      return {
        tipo: "atrasa", ok: false,
        titulo: "Alarme ligado, mas pode atrasar",
        texto: "O Android está segurando o horário exato dos alarmes. Toque em Liberar horário exato e ative a opção do BioShield.",
        botoes: ["exato", "testar"]
      };
    }
    return {
      tipo: "ligado", ok: true,
      titulo: "Alarme ligado",
      texto: "O celular toca na hora de cada dose e repete a cada 5 minutos até você confirmar. Funciona com a tela bloqueada e com o app fechado.",
      botoes: ["testar"]
    };
  }

  var ROTULOS = {
    testar: "Testar o alarme",
    ligar: "Ligar o alarme",
    conferir: "Já permiti, conferir de novo",
    exato: "Liberar horário exato"
  };

  async function desenharCartao(alvo) {
    var atual = await situacao();
    var proxima = proximaDose();
    var linhaProxima = proxima
      ? "Próximo alarme: " + proxima.nomeMedicamento + ", " + (escopo.UI ? escopo.UI.quandoFor(proxima.horarioPrevisto) : hora(proxima.horarioPrevisto)) + "."
      : "Nenhuma dose nos próximos 2 dias.";

    alvo.dataset.estado = atual.tipo;
    alvo.innerHTML =
      '<div class="alarme-cabecalho">' +
        '<span class="icone-tile' + (atual.ok ? "" : " coral") + '" aria-hidden="true">' + ICONE_SINO + "</span>" +
        "<div>" +
          '<h2 id="tituloAlarme">' + escopo.UI.escapar(atual.titulo) + "</h2>" +
          '<p class="alarme-situacao">' + escopo.UI.escapar(atual.texto) + "</p>" +
        "</div>" +
      "</div>" +
      (atual.ok ? '<p class="alarme-proximo">' + escopo.UI.escapar(linhaProxima) + "</p>" : "") +
      '<div class="alarme-acoes">' +
        atual.botoes.map(function (chave, indice) {
          var classe = indice === 0 && !atual.ok ? "botao botao-coral" : "botao botao-secundario";
          return '<button type="button" class="' + classe + '" data-alarme="' + chave + '">' + ROTULOS[chave] + "</button>";
        }).join("") +
      "</div>";

    escopo.UI.todos("[data-alarme]", alvo).forEach(function (botao) {
      botao.addEventListener("click", async function () {
        botao.disabled = true;
        try {
          var acao = botao.dataset.alarme;
          if (acao === "testar") await testar();
          else if (acao === "ligar" || acao === "conferir") {
            var estado = await pedirPermissao();
            if (estado !== "granted") recado("O celular não deixou ligar o alarme. Siga o passo a passo do cartão.", "erro");
            else recado("Alarme ligado.");
          } else if (acao === "exato") await liberarHorarioExato();
        } finally {
          botao.disabled = false;
          desenharCartao(alvo);
        }
      });
    });
    alvo.hidden = false;
  }

  // A tela de doses mostra o cartao e redesenha quando o alarme muda ou quando a pessoa volta das configuracoes.
  function montarCartao(alvo) {
    if (!alvo) return;
    desenharCartao(alvo);
    document.addEventListener("bioshield:alarme-mudou", function () { desenharCartao(alvo); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) desenharCartao(alvo);
    });
  }

  // ===== Partida =====

  function iniciar() {
    document.addEventListener("pointerdown", destravarSom, { once: true });
    document.addEventListener("keydown", destravarSom, { once: true });

    if (nativo) {
      escopo.Capacitor.addListener(PLUGIN, "localNotificationActionPerformed", function (dados, erro) {
        if (erro || !dados || !dados.notification) return;
        var extra = dados.notification.extra;
        if (!extra || !extra.bioshield) return;
        guardarAcao(dados.actionId, extra);
        processarAcaoPendente();
      });
      escopo.Capacitor.addListener(PLUGIN, "localNotificationReceived", function (dados, erro) {
        if (erro || !dados || !dados.extra || !dados.extra.bioshield) return;
        if (!dados.extra.teste) deixarSoOUltimo(dados);
        if (!naEntrada() && sessaoComFicha()) {
          tocarNaTela(dados.extra.teste ? DOSE_TESTE : dados.extra.dose, dados.extra.posicao || 0, { origem: "aviso" });
        }
      });
      prepararNativo();
    }

    // Na entrada so trato o toque na notificacao. Sem conta, nenhum aviso de quem saiu continua tocando.
    if (naEntrada()) {
      if (!escopo.Api || !escopo.Api.sessao()) desligar();
      processarAcaoPendente();
      return;
    }

    processarAcaoPendente();
    sincronizar(false);
    // O app volta do fundo horas depois: a agenda e a janela de dose atrasada se acertam sozinhas.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) sincronizar(false);
    });
  }

  escopo.Lembretes = {
    nativo: nativo,
    sincronizar: sincronizar,
    desligar: desligar,
    doseConfirmada: doseConfirmada,
    pedirPermissao: pedirPermissao,
    pedirSeNuncaPediu: pedirSeNuncaPediu,
    temAcaoPendente: temAcaoPendente,
    testar: testar,
    montarCartao: montarCartao,
    // Usados pelos testes automaticos.
    _montarAvisos: montarAvisos,
    _textoDoAviso: textoDoAviso,
    _tocarNaTela: tocarNaTela
  };

  iniciar();
})(window);
