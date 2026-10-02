// Implementacao MySQL do PacienteRepository.
// SQL da ficha medica, incluindo o join com o nome do dono e a leitura das alergias e dos contatos de emergencia.
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import Alergia from "../models/entidade/Alergia";
import ContatoEmergencia from "../models/entidade/ContatoEmergencia";
import Paciente from "../models/entidade/Paciente";
import CodigoCuidador from "../models/valueObjects/CodigoCuidador";
import Telefone from "../models/valueObjects/Telefone";
import TipoSanguineo from "../models/valueObjects/TipoSanguineo";
import TokenQR from "../models/valueObjects/TokenQR";
import { AcessoQr, ListasAlteradas, PacienteComNome, PacienteRepository } from "../repository/PacienteRepository";

// Linha de pacientes com o nome que vem de usuarios pelo join
interface PacienteLinha extends RowDataPacket {
  id: number;
  id_usuario: number;
  nome: string;
  tipo_sanguineo: string | null;
  condicoes: string | null;
  observacoes: string | null;
  token_qr: string;
  token_gerado_em: Date;
  qr_ativo: number;
  qr_cancelado_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
}

interface AlergiaLinha extends RowDataPacket {
  id: number;
  substancia: string;
  gravidade: string;
  observacao: string | null;
}

interface ContatoLinha extends RowDataPacket {
  id: number;
  nome: string;
  telefone: string;
  parentesco: string | null;
  prioridade: number;
}

interface AcessoLinha extends RowDataPacket {
  id: number;
  acessado_em: Date;
  ip: string | null;
  user_agent: string | null;
}

// Teto do historico. Sem isso um QR muito escaneado devolveria uma lista sem fim para a tela.
const LIMITE_ACESSOS = 100;

export class PacienteInfrastructure implements PacienteRepository {
  // Ficha, alergias e contatos entram juntos ou nao entram. Ficha pela metade na emergencia e pior que ficha nenhuma.
  async criar(paciente: Paciente): Promise<void> {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO pacientes (id_usuario, tipo_sanguineo, condicoes, observacoes, token_qr, token_gerado_em)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          paciente.getIdUsuario(),
          paciente.getTipoSanguineo()?.getValor() ?? null,
          paciente.getCondicoes(),
          paciente.getObservacoes(),
          paciente.getTokenQr().getValor(),
          paciente.getTokenQr().getGeradoEm(),
        ]
      );
      paciente.setId(resultado.insertId);

      await this.inserirAlergias(conexao, paciente);
      await this.inserirContatos(conexao, paciente);
      await conexao.commit();
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }

  // Tres consultas na mesma conexao, e nao um join so com as duas listas:
  // juntar alergias e contatos na mesma linha multiplica o resultado (3 alergias x 2 contatos = 6 linhas).
  async buscarPorId(idPaciente: number): Promise<PacienteComNome | null> {
    const conexao = await pool.getConnection();
    try {
      // Do usuario so sai o nome. Email e senha ficam fora do SELECT de proposito.
      const [linhas] = await conexao.query<PacienteLinha[]>(
        `SELECT p.id, p.id_usuario, u.nome, p.tipo_sanguineo, p.condicoes, p.observacoes,
                p.token_qr, p.token_gerado_em, p.qr_ativo, p.qr_cancelado_em, p.criado_em, p.atualizado_em
           FROM pacientes p
           JOIN usuarios u ON u.id = p.id_usuario
          WHERE p.id = ?`,
        [idPaciente]
      );
      if (linhas.length === 0) {
        return null;
      }

      const [alergias] = await conexao.query<AlergiaLinha[]>(
        "SELECT id, substancia, gravidade, observacao FROM alergias WHERE id_paciente = ? ORDER BY id",
        [idPaciente]
      );
      const [contatos] = await conexao.query<ContatoLinha[]>(
        `SELECT id, nome, telefone, parentesco, prioridade
           FROM contatos_emergencia
          WHERE id_paciente = ?
          ORDER BY prioridade, id`,
        [idPaciente]
      );

      return { paciente: this.paraEntidade(linhas[0], alergias, contatos), nome: linhas[0].nome };
    } finally {
      conexao.release();
    }
  }

  async buscarIdPorUsuario(idUsuario: number): Promise<number | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<RowDataPacket[]>(
        "SELECT id FROM pacientes WHERE id_usuario = ?",
        [idUsuario]
      );
      return linhas.length === 0 ? null : Number(linhas[0].id);
    } finally {
      conexao.release();
    }
  }

  // Lista que veio no PUT e o estado final (contrato), entao apago as linhas do paciente e insiro de novo.
  // Na transacao: se um INSERT falhar no meio, o rollback devolve as alergias antigas em vez de deixar a lista vazia.
  async atualizar(paciente: Paciente, listas: ListasAlteradas): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultado] = await conexao.query<ResultSetHeader>(
        `UPDATE pacientes
            SET tipo_sanguineo = ?, condicoes = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          paciente.getTipoSanguineo()?.getValor() ?? null,
          paciente.getCondicoes(),
          paciente.getObservacoes(),
          paciente.getId(),
        ]
      );
      if (resultado.affectedRows === 0) {
        await conexao.rollback();
        return false;
      }

      if (listas.alergias) {
        await conexao.query("DELETE FROM alergias WHERE id_paciente = ?", [paciente.getId()]);
        await this.inserirAlergias(conexao, paciente);
      }
      if (listas.contatos) {
        await conexao.query("DELETE FROM contatos_emergencia WHERE id_paciente = ?", [paciente.getId()]);
        await this.inserirContatos(conexao, paciente);
      }

      await conexao.commit();
      return true;
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }

  // Um UPDATE so: o token antigo some na mesma hora em que o novo entra, nao tem janela com os dois valendo.
  // qr_cancelado_em volta a nulo porque o QR novo nunca foi cancelado.
  async trocarTokenQR(idPaciente: number, token: TokenQR): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        `UPDATE pacientes
            SET token_qr = ?, token_gerado_em = ?, qr_ativo = TRUE, qr_cancelado_em = NULL
          WHERE id = ?`,
        [token.getValor(), token.getGeradoEm(), idPaciente]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // O token fica na linha de proposito: e o rastro de qual codigo foi impresso no chaveiro perdido.
  // O filtro qr_ativo = TRUE impede que cancelar duas vezes sobrescreva a data do primeiro cancelamento.
  async cancelarQR(idPaciente: number, canceladoEm: Date): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        `UPDATE pacientes
            SET qr_ativo = FALSE, qr_cancelado_em = ?
          WHERE id = ? AND qr_ativo = TRUE`,
        [canceladoEm, idPaciente]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // Mais recente primeiro. O id desempata duas leituras no mesmo segundo.
  async listarAcessos(idPaciente: number): Promise<AcessoQr[]> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<AcessoLinha[]>(
        `SELECT id, acessado_em, ip, user_agent
           FROM acessos_qr
          WHERE id_paciente = ?
          ORDER BY acessado_em DESC, id DESC
          LIMIT ?`,
        [idPaciente, LIMITE_ACESSOS]
      );
      return linhas.map((linha) => ({
        id: Number(linha.id),
        acessadoEm: linha.acessado_em,
        ip: linha.ip,
        userAgent: linha.user_agent,
      }));
    } finally {
      conexao.release();
    }
  }

  // Um UPDATE so: o codigo antigo deixa de valer na mesma hora em que o novo entra.
  // atualizado_em = atualizado_em segura a data da ficha. Sem isso o ON UPDATE da coluna mudaria
  // o "atualizada em" que aparece na emergencia, e gerar codigo nao e mexer na ficha medica.
  async gravarCodigoCuidador(idPaciente: number, codigo: CodigoCuidador): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        `UPDATE pacientes
            SET codigo_cuidador = ?, codigo_valido_ate = ?, atualizado_em = atualizado_em
          WHERE id = ?`,
        [codigo.getValor(), codigo.getValidoAte(), idPaciente]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // Os dois inserir rodam dentro da transacao de quem chamou, por isso recebem a conexao em vez de pegar outra do pool.
  // Os ids gerados voltam pra dentro das entidades.
  private async inserirAlergias(conexao: PoolConnection, paciente: Paciente): Promise<void> {
    const idPaciente = paciente.getId();
    for (const alergia of paciente.getAlergias()) {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "INSERT INTO alergias (id_paciente, substancia, gravidade, observacao) VALUES (?, ?, ?, ?)",
        [idPaciente, alergia.getSubstancia(), alergia.getGravidade(), alergia.getObservacao()]
      );
      alergia.setId(resultado.insertId);
    }
  }

  private async inserirContatos(conexao: PoolConnection, paciente: Paciente): Promise<void> {
    const idPaciente = paciente.getId();
    for (const contato of paciente.getContatos()) {
      const [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO contatos_emergencia (id_paciente, nome, telefone, parentesco, prioridade)
         VALUES (?, ?, ?, ?, ?)`,
        [idPaciente, contato.getNome(), contato.getTelefone().getValor(), contato.getParentesco(), contato.getPrioridade()]
      );
      contato.setId(resultado.insertId);
    }
  }

  // Dado do banco ja foi validado na entrada, mas passo pelos value objects mesmo assim:
  // assim a entidade e sempre a mesma, venha do front ou do banco.
  private paraEntidade(linha: PacienteLinha, alergias: AlergiaLinha[], contatos: ContatoLinha[]): Paciente {
    return new Paciente(
      linha.id_usuario,
      TipoSanguineo.opcional(linha.tipo_sanguineo),
      linha.condicoes,
      linha.observacoes,
      TokenQR.aPartirDoValor(linha.token_qr, linha.token_gerado_em),
      alergias.map((a) => new Alergia(a.substancia, a.gravidade, a.observacao, a.id)),
      contatos.map((c) => new ContatoEmergencia(c.nome, new Telefone(c.telefone), c.parentesco, c.prioridade, c.id)),
      linha.id,
      Boolean(linha.qr_ativo),
      linha.qr_cancelado_em,
      linha.criado_em,
      linha.atualizado_em
    );
  }
}

const pacienteInfrastructure = new PacienteInfrastructure();
export default pacienteInfrastructure;
