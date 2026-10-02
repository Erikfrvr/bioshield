// Regra de negocio das doses.
// Monto a agenda do dia, marco a dose como tomada com a hora real da confirmacao
// e calculo a adesao (doses confirmadas dividido pelas doses previstas no periodo).
// Dose atrasada nao vira dose perdida na hora, tem uma janela de tolerancia.
//
// As regras de tempo vieram do docs/DUVIDAS_CONTRATO.md:
// - duvida 1: dose do futuro nao entra na adesao
// - duvida 2: dose prevista vira perdida depois de 60 minutos, na hora da leitura
// - duvida 3: a agenda e completada antes de cada leitura, 7 dias pra frente
// - duvida 7: da pra confirmar a partir de 60 minutos antes do horario
// Quem sabe que horas sao e este service. O repository recebe todo horario por parametro.
import doseInfrastructure from "../infrastructure/doseInfrastructure";
import medicamentoInfrastructure from "../infrastructure/medicamentoInfrastructure";
import Dose from "../models/entidade/Dose";
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
import { DIAS_DE_AGENDA } from "./MedicamentoService";

const DIA_EM_MS = 24 * 60 * 60 * 1000;

// A adesao da semana olha os ultimos 7 dias ate agora, nao a semana do calendario.
const DIAS_DA_SEMANA = 7;

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
  // "Hoje" e o dia de Brasilia, da meia noite ate a meia noite seguinte (config/fuso.ts).
  async listarDeHoje(idPaciente: number, idLogado: number | undefined): Promise<DoseResponseDTO[]> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.prepararAgenda(idPaciente, agora);

    const inicioDoDia = this.inicioDoDia(agora);
    const doses = await this.repositorio.listarPorPeriodo(
      idPaciente,
      inicioDoDia,
      new Date(inicioDoDia.getTime() + DIA_EM_MS)
    );
    return doses.map((dose) => this.paraResposta(dose));
  }

  // POST /doses/:id/confirmar. A rota so traz o id da dose: busco a dose pra descobrir de qual paciente ela e.
  // Dose que nao existe da 404 (e o recurso da propria rota). Dose de outro paciente da 403.
  async confirmar(
    idDose: number,
    dados: ConfirmarDoseDTO,
    idLogado: number | undefined
  ): Promise<DoseConfirmadaResponseDTO> {
    this.validarId(idDose, "dose");

    const achada = await this.repositorio.buscarPorId(idDose);
    if (!achada) {
      throw new ErroDose("nao_encontrado", "Dose não encontrada.");
    }
    await autorizacaoService.garantirAcompanhamento(idLogado, achada.idPaciente);

    const horarioConfirmado = this.lerHorarioConfirmado(dados);
    const dose = achada.dose;

    // A entidade recusa dose ja confirmada e dose cedo demais (duvida 7), olhando o relogio do servidor.
    // Dose perdida passa: e o "Tomei mesmo assim" da tela.
    this.validando(() => dose.confirmar(horarioConfirmado, new Date()));

    const gravou = await this.repositorio.confirmar(dose);
    if (!gravou) {
      throw new ErroDose("nao_encontrado", "Dose não encontrada.");
    }

    return {
      id: dose.getId() as number,
      status: dose.getStatus(),
      horarioConfirmado: (dose.getHorarioConfirmado() as Date).toISOString(),
    };
  }

  // GET /doses/adesao?idPaciente=1. O dono ou um cuidador com vinculo ativo.
  // As duas janelas param em agora (duvida 1): a dose das 20h so entra na conta quando der 20h,
  // senao o dia comecaria em 0% e assustaria a pessoa a toa.
  async calcularAdesao(idPaciente: number, idLogado: number | undefined): Promise<AdesaoResponseDTO> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirAcompanhamento(idLogado, idPaciente);

    const agora = new Date();
    await this.prepararAgenda(idPaciente, agora);

    const hoje = await this.repositorio.contarPorPeriodo(idPaciente, this.inicioDoDia(agora), agora);
    const semana = await this.repositorio.contarPorPeriodo(
      idPaciente,
      new Date(agora.getTime() - DIAS_DA_SEMANA * DIA_EM_MS),
      agora
    );

    return { hoje: this.paraAdesao(hoje), semana: this.paraAdesao(semana) };
  }

  // Deixa as doses do paciente em dia antes de qualquer leitura: primeiro completa a agenda,
  // depois marca as perdidas. Nessa ordem, porque a dose que acabou de nascer no passado
  // (a pessoa ficou dias sem abrir o app) ja tem que sair daqui como perdida.
  // E publico porque a lista do cuidador, na Fase 9, precisa chamar tambem: sem isso o familiar
  // veria "em dia" justamente pra quem parou de abrir o app.
  async prepararAgenda(idPaciente: number, agora: Date): Promise<void> {
    await this.completarAgenda(idPaciente, agora);
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
    const fim = new Date(agora.getTime() + DIAS_DE_AGENDA * DIA_EM_MS);
    const maisAntigo = agora.getTime() - DIAS_DA_SEMANA * DIA_EM_MS;

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

  // O corpo traz a hora real da tomada, em ISO. E so gravada: quem decide se esta cedo e o relogio daqui.
  private lerHorarioConfirmado(dados: ConfirmarDoseDTO): Date {
    const texto = dados?.horarioConfirmado;
    if (typeof texto !== "string" || texto.trim() === "") {
      throw new ErroDose("validacao", "Informe o horário em que a dose foi tomada.");
    }

    const horario = new Date(texto);
    if (Number.isNaN(horario.getTime())) {
      throw new ErroDose("validacao", "O horário da confirmação é inválido.");
    }

    return horario;
  }

  private inicioDoDia(agora: Date): Date {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }

  // Janela sem dose nenhuma devolve 0, senao dividiria por zero.
  private paraAdesao(contagem: ContagemDoses): AdesaoPeriodoDTO {
    return {
      previstas: contagem.previstas,
      tomadas: contagem.tomadas,
      perdidas: contagem.perdidas,
      percentual: contagem.previstas === 0 ? 0 : Math.round((contagem.tomadas / contagem.previstas) * 100),
    };
  }

  // Campo por campo, igual ao contrato. Se nao esta listado aqui, nao sai. Os horarios viram ISO so aqui.
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

  // Entidade joga Error comum. Aqui isso vira erro de validacao (400).
  private validando<T>(montar: () => T): T {
    try {
      return montar();
    } catch (erro) {
      if (erro instanceof ErroDose) {
        throw erro;
      }
      throw new ErroDose("validacao", (erro as Error).message);
    }
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
