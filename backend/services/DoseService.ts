// Regra de negocio das doses.
// Monto a agenda do dia, marco a dose como tomada com a hora real da confirmacao
// e calculo a adesao (doses confirmadas dividido pelas doses previstas no periodo).
// Dose atrasada nao vira dose perdida na hora, tem uma janela de tolerancia.
// Antes de cada leitura eu completo a agenda, 7 dias pra frente (duvida 3 do docs/DUVIDAS_CONTRATO.md).
import doseInfrastructure from "../infrastructure/doseInfrastructure";
import medicamentoInfrastructure from "../infrastructure/medicamentoInfrastructure";
import Dose from "../models/entidade/Dose";
import { DIAS_DE_AGENDA } from "../models/entidade/Medicamento";
import { ConfirmarDoseDTO } from "../models/dto/dose/ConfirmarDoseDTO";
import {
  AdesaoPeriodoDTO,
  AdesaoResponseDTO,
  DoseConfirmadaResponseDTO,
  DoseResponseDTO,
} from "../models/dto/dose/DoseResponseDTO";
import { RegistrarDoseDTO } from "../models/dto/dose/RegistrarDoseDTO";
import { ContagemDoses, DoseComMedicamento, DoseRepository } from "../repository/DoseRepository";
import { MedicamentoRepository } from "../repository/MedicamentoRepository";
import autorizacaoService from "./AutorizacaoService";

// "semana" na adesao sao os ultimos 7 dias ate agora, nao a semana do calendario.
const DIAS_DA_SEMANA = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Quantos dias de doses o app recebe pra agendar o alarme no celular (frontEnd/js/lembretes.js).
// Dois dias seguram o alarme tocando pra quem passa um tempo sem abrir o app,
// e cabem folgados no limite de 500 alarmes por app do Android.
export const DIAS_DE_LEMBRETE = 2;

// Mesmo esquema do MedicamentoService: o service diz o tipo, o controller escolhe o status code.
export type TipoErroDose = "validacao" | "nao_encontrado";

export class ErroDose extends Error {
  public readonly tipo: TipoErroDose;

  constructor(tipo: TipoErroDose, mensagem: string) {
    super(mensagem);
    this.name = "ErroDose";
    this.tipo = tipo;
  }
}

export class DoseService {
  private repositorio: DoseRepository;
  // Preciso dos remedios do paciente pra completar a agenda: e a entidade Medicamento que sabe gerar os horarios.
  private medicamentos: MedicamentoRepository;

  constructor(
    repositorio: DoseRepository = doseInfrastructure,
    medicamentos: MedicamentoRepository = medicamentoInfrastructure
  ) {
    this.repositorio = repositorio;
    this.medicamentos = medicamentos;
  }

  // GET /doses/hoje?idPaciente=1. O dono ou um cuidador com vinculo ativo.
  async listarDeHoje(idPaciente: number, idLogado: number | undefined): Promise<DoseResponseDTO[]> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.prepararAgenda(idPaciente, agora);

    const inicio = this.inicioDoDia(agora);
    const doses = await this.repositorio.listarPorPeriodo(idPaciente, inicio, this.inicioDoDiaSeguinte(agora));
    return doses.map((d) => this.paraResposta(d));
  }

  // GET /doses/proximas?idPaciente=1. O dono ou um cuidador com vinculo ativo, igual ao /doses/hoje.
  // Devolve so as doses 'prevista' de agora menos a tolerancia ate DIAS_DE_LEMBRETE pra frente.
  // Comeca na tolerancia porque a dose atrasada ha menos de 60 minutos ainda pode ser confirmada
  // e ainda merece lembrete. Tomada e perdida ficam de fora: nao tem mais o que lembrar.
  async listarProximas(idPaciente: number, idLogado: number | undefined): Promise<DoseResponseDTO[]> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.prepararAgenda(idPaciente, agora);

    const inicio = Dose.limiteDePerdidas(agora);
    const fim = new Date(agora.getTime() + DIAS_DE_LEMBRETE * MS_POR_DIA);
    const doses = await this.repositorio.listarPorPeriodo(idPaciente, inicio, fim);
    return doses.filter((d) => d.dose.estaPrevista()).map((d) => this.paraResposta(d));
  }

  // POST /doses/:id/confirmar. Vale pra dose prevista e pra perdida ("Tomei mesmo assim").
  async confirmar(
    id: number,
    dados: ConfirmarDoseDTO,
    idLogado: number | undefined
  ): Promise<DoseConfirmadaResponseDTO> {
    this.validarId(id, "dose");

    // O paciente esta escondido atras da dose: busco a dose pra descobrir de quem ela e.
    // Dose que nao existe da 404 (e o recurso da propria rota). Dose de outra pessoa da 403.
    const achada = await this.repositorio.buscarPorId(id);
    if (!achada) {
      throw new ErroDose("nao_encontrado", "Dose não encontrada.");
    }
    await autorizacaoService.garantirAcompanhamento(idLogado, achada.idPaciente);

    const horarioConfirmado = this.lerHorarioConfirmado(dados);
    const dose = achada.dose;

    // A entidade joga Error comum (dose ja confirmada, ou cedo demais pelo relogio do servidor).
    // Aqui isso vira erro de validacao (400).
    try {
      dose.confirmar(horarioConfirmado, new Date());
    } catch (erro) {
      throw new ErroDose("validacao", (erro as Error).message);
    }

    const achou = await this.repositorio.confirmar(dose);
    if (!achou) {
      throw new ErroDose("nao_encontrado", "Dose não encontrada.");
    }

    return {
      id,
      status: dose.getStatus(),
      horarioConfirmado: horarioConfirmado.toISOString(),
    };
  }

  // GET /doses/adesao?idPaciente=1. O dono ou um cuidador com vinculo ativo.
  async calcularAdesao(idPaciente: number, idLogado: number | undefined): Promise<AdesaoResponseDTO> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.prepararAgenda(idPaciente, agora);

    // As duas janelas terminam em agora: dose no futuro nao entra na conta,
    // senao o dia comeca em 0% e assusta o usuario a toa.
    const [hoje, semana] = await Promise.all([
      this.repositorio.contarPorPeriodo(idPaciente, this.inicioDoDia(agora), agora),
      this.repositorio.contarPorPeriodo(idPaciente, this.inicioDaSemana(agora), agora),
    ]);

    return { hoje: this.paraAdesao(hoje), semana: this.paraAdesao(semana) };
  }

  // As doses do paciente num periodo, ja com a agenda completa e a tolerancia aplicada.
  // Usado pelos avisos de dose perdida do cuidador (CuidadorService.listarAlertas).
  // Atencao: este metodo NAO confere permissao. Quem chama ja tem que ter garantido o vinculo.
  async dosesDoPeriodo(idPaciente: number, inicio: Date, fim: Date, agora: Date): Promise<DoseComMedicamento[]> {
    await this.prepararAgenda(idPaciente, agora);
    return this.repositorio.listarPorPeriodo(idPaciente, inicio, fim);
  }

  // A adesao dos ultimos 7 dias, pro painel do cuidador (CuidadorService).
  // Atencao: este metodo NAO confere permissao. Quem chama ja tem que ter garantido o vinculo.
  // Prepara a agenda antes de contar, senao o familiar ve "em dia" pra quem nao abriu o app.
  async resumirSemana(idPaciente: number, agora: Date): Promise<AdesaoPeriodoDTO> {
    await this.prepararAgenda(idPaciente, agora);
    return this.paraAdesao(await this.repositorio.contarPorPeriodo(idPaciente, this.inicioDaSemana(agora), agora));
  }

  // Deixa as doses do paciente em dia antes de qualquer leitura: primeiro completa a agenda,
  // depois aplica a tolerancia. Nessa ordem, porque a dose que acabou de nascer no passado
  // (a pessoa ficou dias sem abrir o app) ja tem que sair daqui como perdida.
  // E publico porque a lista do cuidador (Fase 9) e a lista de remedios tambem chamam: sem isso o familiar
  // veria "em dia" justamente pra quem parou de abrir o app.
  async prepararAgenda(idPaciente: number, agora: Date): Promise<void> {
    await this.completarAgenda(idPaciente, agora);
    await this.aplicarTolerancia(idPaciente, agora);
  }

  // Nao existe job que mude 'prevista' pra 'perdida': a troca acontece aqui, na hora da leitura.
  // Dose atrasada dentro da tolerancia continua prevista e ainda pode ser confirmada sem virar perdida.
  // O tamanho da tolerancia mora na entidade Dose (duvida 2 do docs/DUVIDAS_CONTRATO.md).
  private async aplicarTolerancia(idPaciente: number, agora: Date): Promise<void> {
    await this.repositorio.marcarPerdidas(idPaciente, Dose.limiteDePerdidas(agora));
  }

  // Duvida 3. O cadastro gera 7 dias. Aqui eu continuo de onde a ultima dose parou ate agora mais 7 dias.
  // Continuo da ultima dose, e nao de uma data fixa, por dois motivos: nao repito dose que ja existe,
  // e nao invento dose de antes do remedio ser cadastrado ou de antes de uma troca de horario.
  // Se a agenda acabou no passado, o buraco e preenchido, mas so ate 7 dias pra tras:
  // a adesao nao olha mais longe que isso.
  private async completarAgenda(idPaciente: number, agora: Date): Promise<void> {
    const remedios = await this.medicamentos.listarPorPaciente(idPaciente);
    if (remedios.length === 0) {
      return;
    }

    const ultimos = await this.repositorio.ultimoHorarioPorMedicamento(idPaciente);
    const fim = new Date(agora.getTime() + DIAS_DE_AGENDA * MS_POR_DIA);
    const maisAntigo = agora.getTime() - DIAS_DA_SEMANA * MS_POR_DIA;

    const novas: RegistrarDoseDTO[] = [];
    for (const { medicamento } of remedios) {
      const idMedicamento = medicamento.getId() as number;
      const ultimo = ultimos.get(idMedicamento);

      // Remedio sem dose nenhuma comeca de agora. Com dose, comeca logo depois da ultima.
      const inicio = ultimo === undefined
        ? agora
        : new Date(Math.max(ultimo.getTime() + 1, maisAntigo));

      // Remedio suspenso devolve lista vazia, e o que ja passou do dataFim tambem.
      for (const horarioPrevisto of medicamento.gerarHorariosEntre(inicio, fim)) {
        novas.push({ idMedicamento, horarioPrevisto });
      }
    }

    await this.repositorio.registrar(novas);
  }

  // Janela sem dose nenhuma dividiria por zero: devolvo 0, igual ao demo.js.
  private paraAdesao(contagem: ContagemDoses): AdesaoPeriodoDTO {
    const percentual = contagem.previstas === 0
      ? 0
      : Math.round((contagem.tomadas / contagem.previstas) * 100);

    return {
      previstas: contagem.previstas,
      tomadas: contagem.tomadas,
      perdidas: contagem.perdidas,
      percentual,
    };
  }

  // O front manda a hora real em ISO. Se nao mandar, vale a hora em que o pedido chegou.
  private lerHorarioConfirmado(dados: ConfirmarDoseDTO): Date {
    const texto = dados?.horarioConfirmado;
    if (texto === undefined || texto === null || texto === "") {
      return new Date();
    }

    const horario = typeof texto === "string" ? new Date(texto) : new Date(NaN);
    if (Number.isNaN(horario.getTime())) {
      throw new ErroDose("validacao", "O horário confirmado precisa ser uma data válida.");
    }

    return horario;
  }

  // Meia-noite de hoje na hora local do servidor, a mesma hora em que a agenda foi gerada.
  private inicioDoDia(agora: Date): Date {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }

  private inicioDaSemana(agora: Date): Date {
    return new Date(agora.getTime() - DIAS_DA_SEMANA * MS_POR_DIA);
  }

  private inicioDoDiaSeguinte(agora: Date): Date {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  }

  // Campo por campo, igual ao contrato. Os horarios viram ISO so aqui, na saida.
  private paraResposta({ dose, nomeMedicamento, dosagem }: DoseComMedicamento): DoseResponseDTO {
    const horarioConfirmado = dose.getHorarioConfirmado();

    return {
      id: dose.getId() as number,
      idMedicamento: dose.getIdMedicamento(),
      nomeMedicamento,
      dosagem: dosagem.getValor(),
      unidade: dosagem.getUnidade(),
      horarioPrevisto: dose.getHorarioPrevisto().toISOString(),
      horarioConfirmado: horarioConfirmado ? horarioConfirmado.toISOString() : null,
      status: dose.getStatus(),
    };
  }

  private validarId(id: number, qual: "paciente" | "dose"): void {
    if (!Number.isInteger(id) || id <= 0) {
      const artigo = qual === "dose" ? "da" : "do";
      throw new ErroDose("validacao", `O id ${artigo} ${qual} precisa ser um número inteiro positivo.`);
    }
  }
}

const doseService = new DoseService();
export default doseService;
