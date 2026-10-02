// Regra de negocio do modo cuidador.
// Checo se o paciente autorizou o vinculo antes de liberar qualquer dado
// e monto o resumo que o cuidador ve: proxima dose, doses perdidas e adesao da semana.
// Cuidador ve acompanhamento, nao edita a ficha medica do paciente.
import cuidadorInfrastructure from "../infrastructure/cuidadorInfrastructure";
import Cuidador from "../models/entidade/Cuidador";
import { PacienteAcompanhadoResponseDTO, VinculoResponseDTO } from "../models/dto/cuidador/CuidadorResponseDTO";
import { VincularCuidadorDTO } from "../models/dto/cuidador/VincularCuidadorDTO";
import { CuidadorRepository, VinculoComPaciente } from "../repository/CuidadorRepository";
import autorizacaoService, { ErroAcesso } from "./AutorizacaoService";
import doseService from "./DoseService";

// Mensagem unica pra codigo que nao existe e pra codigo vencido (os dois dao 404 no contrato).
// Se fossem diferentes, daria pra descobrir quais codigos ja existiram so tentando.
const MENSAGEM_CODIGO_INVALIDO = "Esse código não corresponde a nenhum paciente.";

// Mesmo esquema do DoseService: o service diz o tipo, o controller escolhe o status code.
export type TipoErroCuidador = "validacao" | "nao_encontrado";

export class ErroCuidador extends Error {
  public readonly tipo: TipoErroCuidador;

  constructor(tipo: TipoErroCuidador, mensagem: string) {
    super(mensagem);
    this.name = "ErroCuidador";
    this.tipo = tipo;
  }
}

export class CuidadorService {
  private repositorio: CuidadorRepository;

  constructor(repositorio: CuidadorRepository = cuidadorInfrastructure) {
    this.repositorio = repositorio;
  }

  // POST /cuidadores/vincular. O cuidador e sempre quem esta logado: o idCuidador do corpo e ignorado,
  // senao daria pra vincular a conta de outra pessoa. O vinculo so nasce a partir do codigo
  // que o paciente gerou: e essa a autorizacao explicita.
  async vincular(dados: VincularCuidadorDTO, idLogado: number | undefined): Promise<VinculoResponseDTO> {
    const idCuidador = this.lerIdLogado(idLogado);
    const codigo = this.lerCodigo(dados);
    const agora = new Date();

    const achado = await this.repositorio.buscarPacientePorCodigo(codigo);
    if (!achado || achado.codigo.estaVencido(agora)) {
      throw new ErroCuidador("nao_encontrado", MENSAGEM_CODIGO_INVALIDO);
    }
    if (achado.idDono === idCuidador) {
      throw new ErroCuidador("validacao", "Você não pode ser cuidador da sua própria ficha.");
    }

    // O banco tem UNIQUE (id_cuidador, id_paciente): quem ja teve vinculo reaproveita a linha antiga.
    let vinculo = await this.repositorio.buscarVinculo(idCuidador, achado.idPaciente);
    if (vinculo === null) {
      vinculo = new Cuidador(idCuidador, achado.idPaciente, null, agora);
      await this.repositorio.vincular(vinculo);
    } else if (!vinculo.estaAtivo()) {
      vinculo.reativar(agora);
      await this.repositorio.atualizar(vinculo);
    }
    // Vinculo que ja estava ativo fica como esta: digitar o codigo de novo nao e erro.

    return { idVinculo: vinculo.getId() as number, idPaciente: vinculo.getIdPaciente() };
  }

  // GET /cuidadores/:id/pacientes. :id e o usuario cuidador e precisa ser o de quem esta logado.
  // Sai so acompanhamento de dose: nada da ficha medica e nada do log de acessos.
  async listarPacientes(idCuidador: number, idLogado: number | undefined): Promise<PacienteAcompanhadoResponseDTO[]> {
    this.validarId(idCuidador, "cuidador");
    autorizacaoService.garantirMesmoUsuario(idLogado, idCuidador);

    const agora = new Date();
    const vinculos = await this.repositorio.listarPacientes(idCuidador);
    return Promise.all(vinculos.map((v) => this.paraResposta(v, agora)));
  }

  // DELETE /cuidadores/vinculo/:id. Marca ativo = FALSE e nao apaga a linha:
  // quem teve acesso a dado de saude fica registrado.
  // Pode desfazer o proprio cuidador ou o dono da ficha, que e quem autorizou e pode voltar atras.
  async desvincular(idVinculo: number, idLogado: number | undefined): Promise<void> {
    this.validarId(idVinculo, "vínculo");

    const vinculo = await this.repositorio.buscarVinculoPorId(idVinculo);
    if (!vinculo) {
      throw new ErroCuidador("nao_encontrado", "Vínculo não encontrado.");
    }
    if (vinculo.getIdCuidador() !== idLogado) {
      await autorizacaoService.garantirDono(idLogado, vinculo.getIdPaciente());
    }

    // Vinculo que ja estava desfeito fica como esta: desvincular duas vezes nao e erro.
    if (!vinculo.estaAtivo()) {
      return;
    }

    vinculo.desvincular();
    const achou = await this.repositorio.atualizar(vinculo);
    if (!achou) {
      throw new ErroCuidador("nao_encontrado", "Vínculo não encontrado.");
    }
  }

  // Campo por campo, igual ao contrato. A adesao vem do DoseService, pra conta ser a mesma do GET /doses/adesao.
  private async paraResposta(
    { vinculo, nomePaciente }: VinculoComPaciente,
    agora: Date
  ): Promise<PacienteAcompanhadoResponseDTO> {
    const idPaciente = vinculo.getIdPaciente();
    // A semana primeiro: ela aplica a tolerancia, e dose que virou perdida nao pode aparecer como proxima.
    const semana = await doseService.resumirSemana(idPaciente, agora);
    const proximaDose = await this.repositorio.buscarProximaDose(idPaciente, agora);

    return {
      idVinculo: vinculo.getId() as number,
      idPaciente,
      nome: nomePaciente,
      adesaoSemana: semana.percentual,
      dosesPerdidas: semana.perdidas,
      proximaDose: proximaDose
        ? { nomeMedicamento: proximaDose.nomeMedicamento, horarioPrevisto: proximaDose.horarioPrevisto.toISOString() }
        : null,
    };
  }

  // O middleware autenticar ja barra quem nao tem token. Isto aqui e so a garantia de que o id chegou.
  private lerIdLogado(idLogado: number | undefined): number {
    if (!Number.isInteger(idLogado) || (idLogado as number) <= 0) {
      throw new ErroAcesso();
    }

    return idLogado as number;
  }

  // Aceita minusculo e espaco em volta, que e como a pessoa costuma digitar.
  private lerCodigo(dados: VincularCuidadorDTO): string {
    const codigo = typeof dados?.codigo === "string" ? dados.codigo.trim().toUpperCase() : "";
    if (codigo === "") {
      throw new ErroCuidador("validacao", "Informe o código que o paciente gerou.");
    }

    return codigo;
  }

  private validarId(id: number, qual: "cuidador" | "vínculo"): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroCuidador("validacao", `O id do ${qual} precisa ser um número inteiro positivo.`);
    }
  }
}

const cuidadorService = new CuidadorService();
export default cuidadorService;
