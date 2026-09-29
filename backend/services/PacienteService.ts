// Regra de negocio da ficha medica.
// Monto a entidade Paciente, valido tipo sanguineo e telefone pelos value objects
// e gero o token do QR Code quando a ficha e criada.
// Se o usuario pedir pra trocar o QR, gero um token novo e invalido o antigo.
import pacienteInfrastructure from "../infrastructure/pacienteInfrastructure";
import TokenQR from "../models/valueObjects/TokenQR";
import { QrResponseDTO } from "../models/dto/paciente/QrResponseDTO";
import { PacienteRepository } from "../repository/PacienteRepository";
import autorizacaoService from "./AutorizacaoService";

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
  // sorteia outro. O criar da ficha (Fase 5) usa este mesmo metodo com o INSERT dentro.
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
