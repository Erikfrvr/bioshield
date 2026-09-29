// Quem pode ver os dados de qual paciente (duvida 9 do docs/DUVIDAS_CONTRATO.md).
// O middleware de autenticacao so diz QUEM esta logado (req.idUsuario). Aqui eu decido o que essa pessoa pode ver.
// Fica no service, e nao num middleware, porque o id do paciente chega de jeitos diferentes em cada rota:
// ?idPaciente na query, :id na URL, ou escondido atras de um id de dose ou de medicamento.
// So o service de cada dominio sabe achar o paciente, e depois chama uma destas funcoes.
//
// Regra:
// - Dono da ficha pode tudo.
// - Cuidador com vinculo ativo passa so nas rotas de dose e adesao (garantirAcompanhamento).
// - Qualquer outro caso vira ErroAcesso, que o controller traduz para 403.
import autorizacaoInfrastructure from "../infrastructure/autorizacaoInfrastructure";
import { AutorizacaoRepository } from "../repository/AutorizacaoRepository";

// Mensagem unica para "ficha nao existe" e "ficha nao e sua". Se eu devolvesse 404 para uma e 403 para outra,
// daria pra descobrir quais ids de paciente existem so trocando o numero na URL.
const MENSAGEM_SEM_ACESSO = "Você não tem permissão para ver os dados desse paciente.";

export class ErroAcesso extends Error {
  constructor(mensagem: string = MENSAGEM_SEM_ACESSO) {
    super(mensagem);
    this.name = "ErroAcesso";
  }
}

export class AutorizacaoService {
  private repositorio: AutorizacaoRepository;

  constructor(repositorio: AutorizacaoRepository = autorizacaoInfrastructure) {
    this.repositorio = repositorio;
  }

  // Ficha medica, QR, acessos, codigo do cuidador e medicamentos: so o dono.
  async garantirDono(idUsuario: number | undefined, idPaciente: number): Promise<void> {
    if (!(await this.ehDono(idUsuario, idPaciente))) {
      throw new ErroAcesso();
    }
  }

  // Doses de hoje, confirmar dose e adesao: o dono ou um cuidador com vinculo ativo.
  async garantirAcompanhamento(idUsuario: number | undefined, idPaciente: number): Promise<void> {
    if (await this.ehDono(idUsuario, idPaciente)) {
      return;
    }
    if (this.idValido(idUsuario) && this.idValido(idPaciente)
        && await this.repositorio.temVinculoAtivo(idUsuario as number, idPaciente)) {
      return;
    }
    throw new ErroAcesso();
  }

  // Rotas que recebem o id do proprio usuario na URL, como GET /cuidadores/:id/pacientes.
  // Ninguem le a lista de outra pessoa trocando o numero.
  garantirMesmoUsuario(idUsuario: number | undefined, idPedido: number): void {
    if (!this.idValido(idUsuario) || idUsuario !== idPedido) {
      throw new ErroAcesso("Você só pode ver os seus próprios dados.");
    }
  }

  private async ehDono(idUsuario: number | undefined, idPaciente: number): Promise<boolean> {
    if (!this.idValido(idUsuario) || !this.idValido(idPaciente)) {
      return false;
    }
    const dono = await this.repositorio.buscarDonoDoPaciente(idPaciente);
    return dono !== null && dono === idUsuario;
  }

  private idValido(id: number | undefined): boolean {
    return Number.isInteger(id) && (id as number) > 0;
  }
}

const autorizacaoService = new AutorizacaoService();
export default autorizacaoService;
