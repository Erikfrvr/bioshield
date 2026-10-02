// Regra de negocio das doses.
// Monto a agenda do dia, marco a dose como tomada com a hora real da confirmacao
// e calculo a adesao (doses confirmadas dividido pelas doses previstas no periodo).
// Dose atrasada nao vira dose perdida na hora, tem uma janela de tolerancia.
import doseInfrastructure from "../infrastructure/doseInfrastructure";
import Dose from "../models/entidade/Dose";
import { ConfirmarDoseDTO } from "../models/dto/dose/ConfirmarDoseDTO";
import {
  AdesaoPeriodoDTO,
  AdesaoResponseDTO,
  DoseConfirmadaResponseDTO,
  DoseResponseDTO,
} from "../models/dto/dose/DoseResponseDTO";
import { ContagemDoses, DoseComMedicamento, DoseRepository } from "../repository/DoseRepository";
import autorizacaoService from "./AutorizacaoService";

// "semana" na adesao sao os ultimos 7 dias ate agora, nao a semana do calendario.
const DIAS_DA_SEMANA = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

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

  constructor(repositorio: DoseRepository = doseInfrastructure) {
    this.repositorio = repositorio;
  }

  // GET /doses/hoje?idPaciente=1. O dono ou um cuidador com vinculo ativo.
  async listarDeHoje(idPaciente: number, idLogado: number | undefined): Promise<DoseResponseDTO[]> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.aplicarTolerancia(idPaciente, agora);

    const inicio = this.inicioDoDia(agora);
    const doses = await this.repositorio.listarPorPeriodo(idPaciente, inicio, this.inicioDoDiaSeguinte(agora));
    return doses.map((d) => this.paraResposta(d));
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
    await this.aplicarTolerancia(idPaciente, agora);

    // As duas janelas terminam em agora: dose no futuro nao entra na conta,
    // senao o dia comeca em 0% e assusta o usuario a toa.
    const [hoje, semana] = await Promise.all([
      this.repositorio.contarPorPeriodo(idPaciente, this.inicioDoDia(agora), agora),
      this.repositorio.contarPorPeriodo(idPaciente, this.inicioDaSemana(agora), agora),
    ]);

    return { hoje: this.paraAdesao(hoje), semana: this.paraAdesao(semana) };
  }

  // A adesao dos ultimos 7 dias, pro painel do cuidador (CuidadorService).
  // Atencao: este metodo NAO confere permissao. Quem chama ja tem que ter garantido o vinculo.
  // Aplica a tolerancia antes de contar, senao o familiar ve "em dia" pra quem nao abriu o app.
  async resumirSemana(idPaciente: number, agora: Date): Promise<AdesaoPeriodoDTO> {
    await this.aplicarTolerancia(idPaciente, agora);
    return this.paraAdesao(await this.repositorio.contarPorPeriodo(idPaciente, this.inicioDaSemana(agora), agora));
  }

  // Nao existe job que mude 'prevista' pra 'perdida': a troca acontece aqui, na hora da leitura.
  // Dose atrasada dentro da tolerancia continua prevista e ainda pode ser confirmada sem virar perdida.
  // O tamanho da tolerancia mora na entidade Dose (duvida 2 do docs/DUVIDAS_CONTRATO.md).
  private async aplicarTolerancia(idPaciente: number, agora: Date): Promise<void> {
    await this.repositorio.marcarPerdidas(idPaciente, Dose.limiteDePerdidas(agora));
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
