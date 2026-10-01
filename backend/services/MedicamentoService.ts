// Regra de negocio dos remedios.
// Trato o nome, valido a dosagem e a frequencia e, quando cadastro um remedio novo,
// ja gero as doses da agenda a partir do horario inicial e do intervalo.
// A geracao da agenda entra na Fase 8, junto com o DoseService. Ate la o remedio e gravado sem doses
// e a proximaDose sai null.
import medicamentoInfrastructure from "../infrastructure/medicamentoInfrastructure";
import Medicamento from "../models/entidade/Medicamento";
import Dosagem from "../models/valueObjects/Dosagem";
import HorarioDose from "../models/valueObjects/HorarioDose";
import { AtualizarMedicamentoDTO } from "../models/dto/medicamento/AtualizarMedicamentoDTO";
import { CadastrarMedicamentoDTO } from "../models/dto/medicamento/CadastrarMedicamentoDTO";
import { MedicamentoResponseDTO } from "../models/dto/medicamento/MedicamentoResponseDTO";
import { MedicamentoComProximaDose, MedicamentoRepository } from "../repository/MedicamentoRepository";
import autorizacaoService from "./AutorizacaoService";

// Mesmo esquema do PacienteService: o service diz o tipo, o controller escolhe o status code.
export type TipoErroMedicamento = "validacao" | "nao_encontrado";

export class ErroMedicamento extends Error {
  public readonly tipo: TipoErroMedicamento;

  constructor(tipo: TipoErroMedicamento, mensagem: string) {
    super(mensagem);
    this.name = "ErroMedicamento";
    this.tipo = tipo;
  }
}

export class MedicamentoService {
  private repositorio: MedicamentoRepository;

  constructor(repositorio: MedicamentoRepository = medicamentoInfrastructure) {
    this.repositorio = repositorio;
  }

  // GET /medicamentos?idPaciente=1. So o dono da ficha ve os proprios remedios.
  async listarPorPaciente(idPaciente: number, idLogado: number | undefined): Promise<MedicamentoResponseDTO[]> {
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirDono(idLogado, idPaciente);

    const medicamentos = await this.repositorio.listarPorPaciente(idPaciente);
    return medicamentos.map((m) => this.paraResposta(m));
  }

  // POST /medicamentos. O idPaciente vem no corpo, entao confiro o dono antes de montar qualquer coisa.
  async cadastrar(dados: CadastrarMedicamentoDTO, idLogado: number | undefined): Promise<MedicamentoResponseDTO> {
    const idPaciente = dados?.idPaciente as number;
    this.validarId(idPaciente, "paciente");
    await autorizacaoService.garantirDono(idLogado, idPaciente);

    const medicamento = this.validando(() => new Medicamento(
      idPaciente,
      dados.nome,
      new Dosagem(dados.dosagem, dados.unidade),
      new HorarioDose(dados.horarioInicial, dados.frequenciaHoras),
      dados.dataInicio,
      dados.dataFim ?? null
    ));

    await this.repositorio.cadastrar(medicamento);

    // Leio de novo pra devolver no mesmo formato do GET, com o que o banco preencheu
    return this.lerMedicamento(medicamento.getId() as number);
  }

  // PUT /medicamentos/:id. Campo que nao veio fica como esta. dataFim null volta pra tratamento continuo.
  async atualizar(
    id: number,
    dados: AtualizarMedicamentoDTO,
    idLogado: number | undefined
  ): Promise<MedicamentoResponseDTO> {
    const medicamento = await this.buscarDoDono(id, idLogado);

    this.validando(() => {
      if (dados?.nome !== undefined) {
        medicamento.setNome(dados.nome);
      }
      // Dosagem e HorarioDose sao imutaveis: monto outro com o que veio e completo com o valor atual
      if (dados?.dosagem !== undefined || dados?.unidade !== undefined) {
        medicamento.setDosagem(new Dosagem(
          dados.dosagem ?? medicamento.getDosagem().getValor(),
          dados.unidade ?? medicamento.getDosagem().getUnidade()
        ));
      }
      if (dados?.horarioInicial !== undefined || dados?.frequenciaHoras !== undefined) {
        medicamento.setHorarioDose(new HorarioDose(
          dados.horarioInicial ?? medicamento.getHorarioDose().getHorarioInicial(),
          dados.frequenciaHoras ?? medicamento.getHorarioDose().getFrequenciaHoras()
        ));
      }
      // Quando o fim tambem veio, solto o fim antigo antes de mexer no inicio.
      // Senao empurrar o periodo inteiro pra frente bateria no "inicio depois do fim" com o fim velho.
      if (dados?.dataFim !== undefined) {
        medicamento.setDataFim(null);
      }
      if (dados?.dataInicio !== undefined) {
        medicamento.setDataInicio(dados.dataInicio);
      }
      if (dados?.dataFim !== undefined) {
        medicamento.setDataFim(dados.dataFim);
      }
    });

    const achou = await this.repositorio.atualizar(medicamento);
    if (!achou) {
      throw new ErroMedicamento("nao_encontrado", "Medicamento não encontrado.");
    }

    return this.lerMedicamento(id);
  }

  // DELETE /medicamentos/:id. Apaga de verdade, e as doses vao junto pelo ON DELETE CASCADE.
  async apagar(id: number, idLogado: number | undefined): Promise<void> {
    await this.buscarDoDono(id, idLogado);

    const apagou = await this.repositorio.apagar(id);
    if (!apagou) {
      throw new ErroMedicamento("nao_encontrado", "Medicamento não encontrado.");
    }
  }

  // Nas rotas com :id o paciente esta escondido atras do remedio: busco o remedio pra descobrir de quem ele e.
  // Remedio que nao existe da 404 (e o recurso da propria rota, como diz o contrato). Remedio de outra pessoa da 403.
  private async buscarDoDono(id: number, idLogado: number | undefined): Promise<Medicamento> {
    this.validarId(id, "medicamento");

    const achado = await this.repositorio.buscarPorId(id);
    if (!achado) {
      throw new ErroMedicamento("nao_encontrado", "Medicamento não encontrado.");
    }
    await autorizacaoService.garantirDono(idLogado, achado.medicamento.getIdPaciente());

    return achado.medicamento;
  }

  private async lerMedicamento(id: number): Promise<MedicamentoResponseDTO> {
    const achado = await this.repositorio.buscarPorId(id);
    if (!achado) {
      throw new ErroMedicamento("nao_encontrado", "Medicamento não encontrado.");
    }
    return this.paraResposta(achado);
  }

  // Entidade e value object jogam Error comum. Aqui isso vira erro de validacao (400),
  // porque a culpa e do dado que chegou. ErroMedicamento que ja veio pronto passa direto.
  private validando<T>(montar: () => T): T {
    try {
      return montar();
    } catch (erro) {
      if (erro instanceof ErroMedicamento) {
        throw erro;
      }
      throw new ErroMedicamento("validacao", (erro as Error).message);
    }
  }

  // Campo por campo, igual ao contrato. Se nao esta listado aqui, nao sai.
  // proximaDose vira ISO so aqui, na saida.
  private paraResposta({ medicamento, proximaDose }: MedicamentoComProximaDose): MedicamentoResponseDTO {
    return {
      id: medicamento.getId() as number,
      idPaciente: medicamento.getIdPaciente(),
      nome: medicamento.getNome(),
      dosagem: medicamento.getDosagem().getValor(),
      unidade: medicamento.getDosagem().getUnidade(),
      frequenciaHoras: medicamento.getHorarioDose().getFrequenciaHoras(),
      horarioInicial: medicamento.getHorarioDose().getHorarioInicial(),
      dataInicio: medicamento.getDataInicio(),
      dataFim: medicamento.getDataFim(),
      ativo: medicamento.estaAtivo(),
      proximaDose: proximaDose ? proximaDose.toISOString() : null,
    };
  }

  private validarId(id: number, qual: "paciente" | "medicamento"): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroMedicamento("validacao", `O id do ${qual} precisa ser um número inteiro positivo.`);
    }
  }
}

const medicamentoService = new MedicamentoService();
export default medicamentoService;
