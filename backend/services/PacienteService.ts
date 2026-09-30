// Regra de negocio da ficha medica.
// Monto a entidade Paciente, valido tipo sanguineo e telefone pelos value objects
// e gero o token do QR Code quando a ficha e criada.
// Se o usuario pedir pra trocar o QR, gero um token novo e invalido o antigo.
import pacienteInfrastructure from "../infrastructure/pacienteInfrastructure";
import Alergia from "../models/entidade/Alergia";
import ContatoEmergencia from "../models/entidade/ContatoEmergencia";
import Paciente from "../models/entidade/Paciente";
import Telefone from "../models/valueObjects/Telefone";
import TipoSanguineo from "../models/valueObjects/TipoSanguineo";
import TokenQR from "../models/valueObjects/TokenQR";
import { AlergiaDTO, ContatoEmergenciaDTO, CriarPacienteDTO } from "../models/dto/paciente/CriarPacienteDTO";
import { AtualizarPacienteDTO } from "../models/dto/paciente/AtualizarPacienteDTO";
import { PacienteResponseDTO } from "../models/dto/paciente/PacienteResponseDTO";
import { QrResponseDTO } from "../models/dto/paciente/QrResponseDTO";
import { PacienteRepository } from "../repository/PacienteRepository";
import autorizacaoService, { ErroAcesso } from "./AutorizacaoService";

// Quantas vezes eu tento de novo se o token sortear igual a um que ja existe.
// Com 128 bits isso praticamente nao acontece, mas o indice unico do banco barraria, entao trato.
const TENTATIVAS_TOKEN = 3;

// Mesmo esquema do UsuarioService: o service diz o tipo, o controller escolhe o status code.
export type TipoErroPaciente = "validacao" | "nao_encontrado" | "conflito";

export class ErroPaciente extends Error {
  public readonly tipo: TipoErroPaciente;

  constructor(tipo: TipoErroPaciente, mensagem: string) {
    super(mensagem);
    this.name = "ErroPaciente";
    this.tipo = tipo;
  }
}

export class PacienteService {
  private repositorio: PacienteRepository;

  constructor(repositorio: PacienteRepository = pacienteInfrastructure) {
    this.repositorio = repositorio;
  }

  // GET /pacientes/:id. So o dono le a propria ficha.
  async buscarPorId(idPaciente: number, idLogado: number | undefined): Promise<PacienteResponseDTO> {
    this.validarId(idPaciente);
    await autorizacaoService.garantirDono(idLogado, idPaciente);
    return this.lerFicha(idPaciente);
  }

  // POST /pacientes. O dono e sempre quem esta logado: o idUsuario do corpo e ignorado,
  // senao daria pra criar ficha na conta de outra pessoa.
  async criar(dados: CriarPacienteDTO, idLogado: number | undefined): Promise<PacienteResponseDTO> {
    if (!Number.isInteger(idLogado) || (idLogado as number) <= 0) {
      throw new ErroAcesso();
    }
    const idUsuario = idLogado as number;

    if (await this.repositorio.buscarIdPorUsuario(idUsuario) !== null) {
      throw new ErroPaciente("conflito", "Você já tem uma ficha médica. Use a edição para alterar.");
    }

    // O id gerado sai de dentro do callback por aqui
    const criado: { id?: number } = {};
    await this.gerarTokenQR(async (token) => {
      const paciente = this.validando(() => new Paciente(
        idUsuario,
        TipoSanguineo.opcional(dados?.tipoSanguineo),
        dados?.condicoes ?? null,
        dados?.observacoes ?? null,
        token,
        this.montarAlergias(dados?.alergias),
        this.montarContatos(dados?.contatos)
      ));

      try {
        await this.repositorio.criar(paciente);
      } catch (erro) {
        // Duas abas criando a ficha ao mesmo tempo passam pela checagem de cima, mas o indice unico barra a segunda.
        // Traduzo aqui pra nao cair no "sorteia outro token" do gerarTokenQR, que so serve pra token repetido.
        if (this.duplicou(erro, "uk_pacientes_usuario")) {
          throw new ErroPaciente("conflito", "Você já tem uma ficha médica. Use a edição para alterar.");
        }
        throw erro;
      }
      criado.id = paciente.getId() as number;
    });

    // Leio de novo pra devolver com o nome do dono e as datas que o banco preencheu
    return this.lerFicha(criado.id as number);
  }

  // PUT /pacientes/:id. Campo que nao veio fica como esta, campo que veio null e apagado.
  // alergias e contatos, quando vem, sao o estado final da lista e substituem tudo.
  async atualizar(
    idPaciente: number,
    dados: AtualizarPacienteDTO,
    idLogado: number | undefined
  ): Promise<PacienteResponseDTO> {
    this.validarId(idPaciente);
    await autorizacaoService.garantirDono(idLogado, idPaciente);

    const atual = await this.repositorio.buscarPorId(idPaciente);
    if (!atual) {
      throw new ErroPaciente("nao_encontrado", "Ficha médica não encontrada.");
    }
    const paciente = atual.paciente;

    this.validando(() => {
      if (dados?.tipoSanguineo !== undefined) {
        paciente.setTipoSanguineo(TipoSanguineo.opcional(dados.tipoSanguineo));
      }
      if (dados?.condicoes !== undefined) {
        paciente.setCondicoes(dados.condicoes);
      }
      if (dados?.observacoes !== undefined) {
        paciente.setObservacoes(dados.observacoes);
      }
      if (dados?.alergias !== undefined) {
        paciente.substituirAlergias(this.montarAlergias(dados.alergias));
      }
      if (dados?.contatos !== undefined) {
        paciente.substituirContatos(this.montarContatos(dados.contatos));
      }
    });

    const achou = await this.repositorio.atualizar(paciente, {
      alergias: dados?.alergias !== undefined,
      contatos: dados?.contatos !== undefined,
    });
    if (!achou) {
      throw new ErroPaciente("nao_encontrado", "Ficha médica não encontrada.");
    }

    return this.lerFicha(idPaciente);
  }

  // POST /pacientes/:id/qr/rotacionar. So o dono da ficha troca o QR.
  async rotacionarQR(idPaciente: number, idLogado: number | undefined): Promise<QrResponseDTO> {
    this.validarId(idPaciente);
    await autorizacaoService.garantirDono(idLogado, idPaciente);
    return this.trocarToken(idPaciente);
  }

  // DELETE /pacientes/:id/qr. O cancelamento, pra quando a pessoa perde o chaveiro.
  // Nao apaga o token nem a ficha: a emergencia passa a devolver 410 para esse token.
  async cancelarQR(idPaciente: number, idLogado: number | undefined): Promise<QrResponseDTO> {
    this.validarId(idPaciente);
    await autorizacaoService.garantirDono(idLogado, idPaciente);

    const canceladoEm = new Date();
    const cancelou = await this.repositorio.cancelarQR(idPaciente, canceladoEm);
    if (!cancelou) {
      throw new ErroPaciente("conflito", "Esse QR Code já está cancelado.");
    }

    return { qrAtivo: false, qrCanceladoEm: canceladoEm.toISOString() };
  }

  // POST /pacientes/:id/qr/reativar. Reativar NAO ressuscita o token antigo, gera outro.
  // Se o chaveiro perdido voltasse a abrir a ficha, cancelar nao teria servido pra nada.
  // Por isso e a mesma troca de token da rotacao, que ja deixa qr_ativo = TRUE.
  async reativarQR(idPaciente: number, idLogado: number | undefined): Promise<QrResponseDTO> {
    this.validarId(idPaciente);
    await autorizacaoService.garantirDono(idLogado, idPaciente);
    return this.trocarToken(idPaciente);
  }

  private async trocarToken(idPaciente: number): Promise<QrResponseDTO> {
    const token = await this.gerarTokenQR(async (novo) => {
      const achou = await this.repositorio.trocarTokenQR(idPaciente, novo);
      if (!achou) {
        throw new ErroPaciente("nao_encontrado", "Ficha médica não encontrada.");
      }
    });

    return this.paraRespostaQR(token, true, null);
  }

  // Sorteia um token e entrega pra funcao que grava. Se o banco disser que o token ja existe,
  // sorteia outro. O criar da ficha usa este mesmo metodo com o INSERT dentro.
  async gerarTokenQR(gravar: (token: TokenQR) => Promise<void>): Promise<TokenQR> {
    for (let tentativa = 1; ; tentativa++) {
      const token = TokenQR.gerar();
      try {
        await gravar(token);
        return token;
      } catch (erro) {
        const repetido = (erro as { code?: string })?.code === "ER_DUP_ENTRY";
        if (!repetido || tentativa >= TENTATIVAS_TOKEN) {
          throw erro;
        }
      }
    }
  }

  private async lerFicha(idPaciente: number): Promise<PacienteResponseDTO> {
    const ficha = await this.repositorio.buscarPorId(idPaciente);
    if (!ficha) {
      throw new ErroPaciente("nao_encontrado", "Ficha médica não encontrada.");
    }
    return this.paraResposta(ficha.paciente, ficha.nome);
  }

  // null e lista vazia sao a mesma coisa: nenhuma alergia
  private montarAlergias(alergias: AlergiaDTO[] | null | undefined): Alergia[] {
    if (alergias === null || alergias === undefined) {
      return [];
    }
    if (!Array.isArray(alergias)) {
      throw new ErroPaciente("validacao", "As alergias precisam vir em uma lista.");
    }
    return this.validando(() =>
      alergias.map((a) => new Alergia(a?.substancia as string, a?.gravidade, a?.observacao ?? null))
    );
  }

  // Contato sem prioridade ganha a posicao na lista (1, 2, 3...), que e a ordem em que a tela mostra.
  // Sem isso todos cairiam no padrao 1 e a entidade barraria por prioridade repetida.
  private montarContatos(contatos: ContatoEmergenciaDTO[] | null | undefined): ContatoEmergencia[] {
    if (contatos === null || contatos === undefined) {
      return [];
    }
    if (!Array.isArray(contatos)) {
      throw new ErroPaciente("validacao", "Os contatos de emergência precisam vir em uma lista.");
    }
    return this.validando(() =>
      contatos.map((c, indice) => new ContatoEmergencia(
        c?.nome as string,
        new Telefone(c?.telefone as string),
        c?.parentesco ?? null,
        c?.prioridade ?? indice + 1
      ))
    );
  }

  // Entidade e value object jogam Error comum. Aqui isso vira erro de validacao (400),
  // porque a culpa e do dado que chegou. ErroPaciente que ja veio pronto passa direto.
  private validando<T>(montar: () => T): T {
    try {
      return montar();
    } catch (erro) {
      if (erro instanceof ErroPaciente) {
        throw erro;
      }
      throw new ErroPaciente("validacao", (erro as Error).message);
    }
  }

  // O MySQL diz qual indice unico barrou dentro da mensagem do ER_DUP_ENTRY
  private duplicou(erro: unknown, indice: string): boolean {
    const e = erro as { code?: string; message?: string };
    return e?.code === "ER_DUP_ENTRY" && typeof e.message === "string" && e.message.includes(indice);
  }

  // Campo por campo, igual ao contrato. Se nao esta listado aqui, nao sai.
  private paraResposta(paciente: Paciente, nome: string): PacienteResponseDTO {
    const qrCanceladoEm = paciente.getQrCanceladoEm();
    const atualizadoEm = paciente.getAtualizadoEm();

    return {
      id: paciente.getId() as number,
      idUsuario: paciente.getIdUsuario(),
      nome,
      tipoSanguineo: paciente.getTipoSanguineo()?.getValor() ?? null,
      condicoes: paciente.getCondicoes(),
      observacoes: paciente.getObservacoes(),
      tokenQr: paciente.getTokenQr().getValor(),
      qrAtivo: paciente.estaComQrAtivo(),
      tokenGeradoEm: paciente.getTokenQr().getGeradoEm().toISOString(),
      qrCanceladoEm: qrCanceladoEm ? qrCanceladoEm.toISOString() : null,
      atualizadoEm: atualizadoEm ? atualizadoEm.toISOString() : null,
      alergias: paciente.getAlergias().map((a) => ({
        id: a.getId() as number,
        substancia: a.getSubstancia(),
        gravidade: a.getGravidade(),
        observacao: a.getObservacao(),
      })),
      contatos: paciente.getContatos().map((c) => ({
        id: c.getId() as number,
        nome: c.getNome(),
        telefone: c.getTelefone().getValor(),
        parentesco: c.getParentesco(),
        prioridade: c.getPrioridade(),
      })),
    };
  }

  private validarId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroPaciente("validacao", "O id do paciente precisa ser um número inteiro positivo.");
    }
  }

  private paraRespostaQR(token: TokenQR, qrAtivo: boolean, qrCanceladoEm: Date | null): QrResponseDTO {
    return {
      tokenQr: token.getValor(),
      tokenGeradoEm: token.getGeradoEm().toISOString(),
      qrAtivo,
      qrCanceladoEm: qrCanceladoEm ? qrCanceladoEm.toISOString() : null,
    };
  }
}

const pacienteService = new PacienteService();
export default pacienteService;
