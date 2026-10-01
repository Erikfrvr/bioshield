// Regra de negocio da ficha de emergencia.
// Busco a ficha pelo token do QR, checo se o token ainda e valido
// e monto a versao reduzida e publica dos dados, filtrando tudo que e sensivel demais.
import emergenciaInfrastructure from "../infrastructure/emergenciaInfrastructure";
import FichaEmergencia from "../models/entidade/FichaEmergencia";
import TokenQR from "../models/valueObjects/TokenQR";
import { FichaEmergenciaResponseDTO } from "../models/dto/emergencia/FichaEmergenciaResponseDTO";
import { EmergenciaRepository } from "../repository/EmergenciaRepository";

// Limites das colunas acessos_qr.ip VARCHAR(45) e acessos_qr.user_agent VARCHAR(255)
const IP_TAMANHO_MAXIMO = 45;
const USER_AGENT_TAMANHO_MAXIMO = 255;

const MENSAGEM_NAO_ENCONTRADO = "QR Code não encontrado.";
// Texto do contrato para o 410. Enxuto de proposito: nem o nome do titular sai.
const MENSAGEM_CANCELADO = "Este QR Code foi cancelado pelo titular.";

// Mesmo esquema dos outros services: o service diz o tipo, o controller escolhe o status code.
// nao_encontrado vira 404 e cancelado vira 410. O front tem uma tela diferente para cada um.
export type TipoErroEmergencia = "nao_encontrado" | "cancelado";

export class ErroEmergencia extends Error {
  public readonly tipo: TipoErroEmergencia;

  constructor(tipo: TipoErroEmergencia, mensagem: string) {
    super(mensagem);
    this.name = "ErroEmergencia";
    this.tipo = tipo;
  }
}

export class EmergenciaService {
  // O service conhece so a interface. A implementacao MySQL entra pelo construtor.
  private repositorio: EmergenciaRepository;

  constructor(repositorio: EmergenciaRepository = emergenciaInfrastructure) {
    this.repositorio = repositorio;
  }

  // GET /emergencia/:token. Rota publica: quem chama e um estranho socorrendo, sem login.
  // ip e userAgent vem do controller so para o log da LGPD e podem faltar.
  async buscarPorToken(
    tokenDaUrl: string,
    ip: string | null = null,
    userAgent: string | null = null
  ): Promise<FichaEmergenciaResponseDTO> {
    // Token fora do formato nem vira consulta no banco. Para quem escaneou e a mesma coisa que nao existir.
    let token: TokenQR;
    try {
      token = TokenQR.aPartirDoValor(tokenDaUrl);
    } catch {
      throw new ErroEmergencia("nao_encontrado", MENSAGEM_NAO_ENCONTRADO);
    }

    const resultado = await this.repositorio.buscarPorToken(token);
    if (!resultado) {
      throw new ErroEmergencia("nao_encontrado", MENSAGEM_NAO_ENCONTRADO);
    }

    // Registro antes de responder, e registro tambem a tentativa em QR cancelado:
    // o dono precisa saber que alguem escaneou o chaveiro que ele perdeu.
    await this.repositorio.registrarAcesso(
      resultado.idPaciente,
      this.cortar(ip, IP_TAMANHO_MAXIMO),
      this.cortar(userAgent, USER_AGENT_TAMANHO_MAXIMO)
    );

    if (resultado.situacao === "cancelado") {
      throw new ErroEmergencia("cancelado", MENSAGEM_CANCELADO);
    }

    return this.paraResposta(resultado.ficha);
  }

  // Texto vazio vira null, e texto maior que a coluna e cortado.
  // User agent gigante nao pode fazer o INSERT falhar e barrar o socorro.
  private cortar(texto: string | null | undefined, tamanhoMaximo: number): string | null {
    if (typeof texto !== "string" || texto.trim() === "") {
      return null;
    }
    return texto.trim().slice(0, tamanhoMaximo);
  }

  // Campo por campo, igual ao contrato. Se nao esta listado aqui, nao sai.
  // A ordem das listas ja vem pronta da FichaEmergencia: alergia grave primeiro,
  // so remedio ativo e contatos por prioridade. Por isso "ativo" e "prioridade" nao vao na resposta.
  private paraResposta(ficha: FichaEmergencia): FichaEmergenciaResponseDTO {
    return {
      nome: ficha.getNome(),
      tipoSanguineo: ficha.getTipoSanguineo(),
      condicoes: ficha.getCondicoes(),
      observacoes: ficha.getObservacoes(),
      atualizadoEm: ficha.getAtualizadoEm().toISOString(),
      alergias: ficha.getAlergias().map((a) => ({
        substancia: a.substancia,
        gravidade: a.gravidade,
        observacao: a.observacao,
      })),
      medicamentos: ficha.getMedicamentos().map((m) => ({
        nome: m.nome,
        dosagem: m.dosagem,
        unidade: m.unidade,
        frequenciaHoras: m.frequenciaHoras,
      })),
      contatos: ficha.getContatos().map((c) => ({
        nome: c.nome,
        telefone: c.telefone,
        parentesco: c.parentesco,
      })),
    };
  }
}

const emergenciaService = new EmergenciaService();
export default emergenciaService;
