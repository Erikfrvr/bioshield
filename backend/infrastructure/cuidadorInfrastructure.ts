// Implementacao MySQL do CuidadorRepository.
// SQL da tabela de vinculo entre cuidador e paciente.
// Nenhuma consulta daqui le tipo sanguineo, condicoes, alergias ou acessos_qr: o cuidador so ve acompanhamento de dose.
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import Cuidador from "../models/entidade/Cuidador";
import CodigoCuidador from "../models/valueObjects/CodigoCuidador";
import {
  CuidadorRepository,
  PacienteDoCodigo,
  ProximaDose,
  VinculoComPaciente,
} from "../repository/CuidadorRepository";

interface VinculoLinha extends RowDataPacket {
  id: number;
  id_cuidador: number;
  id_paciente: number;
  autorizado_em: Date;
  // BOOLEAN no MySQL e TINYINT(1): volta 0 ou 1
  ativo: number;
}

// Linha de cuidador_paciente com o nome que vem de usuarios pelo join
interface VinculoComPacienteLinha extends VinculoLinha {
  nome_paciente: string;
}

interface CodigoLinha extends RowDataPacket {
  id: number;
  codigo_cuidador: string;
  codigo_valido_ate: Date;
}

interface ProximaDoseLinha extends RowDataPacket {
  nome_medicamento: string;
  horario_previsto: Date;
}

const COLUNAS_VINCULO = "id, id_cuidador, id_paciente, autorizado_em, ativo";

export class CuidadorInfrastructure implements CuidadorRepository {
  // Nao filtro a validade aqui: quem decide se o codigo venceu e o service.
  // Codigo sem validade gravada nao autoriza ninguem, entao fica de fora.
  async buscarPacientePorCodigo(codigo: string): Promise<PacienteDoCodigo | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<CodigoLinha[]>(
        `SELECT id, codigo_cuidador, codigo_valido_ate
           FROM pacientes
          WHERE codigo_cuidador = ?
            AND codigo_valido_ate IS NOT NULL`,
        [codigo]
      );
      if (linhas.length === 0) {
        return null;
      }
      return {
        idPaciente: Number(linhas[0].id),
        codigo: CodigoCuidador.aPartirDoValor(linhas[0].codigo_cuidador, linhas[0].codigo_valido_ate),
      };
    } finally {
      conexao.release();
    }
  }

  // Traz o vinculo desfeito tambem: e ele que o service reativa em vez de inserir outro.
  async buscarVinculo(idCuidador: number, idPaciente: number): Promise<Cuidador | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<VinculoLinha[]>(
        `SELECT ${COLUNAS_VINCULO}
           FROM cuidador_paciente
          WHERE id_cuidador = ?
            AND id_paciente = ?`,
        [idCuidador, idPaciente]
      );
      return linhas.length === 0 ? null : this.paraEntidade(linhas[0]);
    } finally {
      conexao.release();
    }
  }

  async buscarVinculoPorId(id: number): Promise<Cuidador | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<VinculoLinha[]>(
        `SELECT ${COLUNAS_VINCULO} FROM cuidador_paciente WHERE id = ?`,
        [id]
      );
      return linhas.length === 0 ? null : this.paraEntidade(linhas[0]);
    } finally {
      conexao.release();
    }
  }

  // Vinculo novo chega sem data de autorizacao: vale a hora em que ele e gravado.
  // Mando a data por parametro em vez de deixar o DEFAULT do banco, pra entidade e a linha ficarem iguais.
  async vincular(vinculo: Cuidador): Promise<void> {
    const autorizadoEm = vinculo.getAutorizadoEm() ?? new Date();

    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "INSERT INTO cuidador_paciente (id_cuidador, id_paciente, autorizado_em, ativo) VALUES (?, ?, ?, ?)",
        [vinculo.getIdCuidador(), vinculo.getIdPaciente(), autorizadoEm, vinculo.estaAtivo()]
      );
      vinculo.setId(resultado.insertId);
      vinculo.setAutorizadoEm(autorizadoEm);
    } finally {
      conexao.release();
    }
  }

  // Desvincular e reativar passam por aqui. Nao existe DELETE nesta tabela:
  // quem teve acesso a dado de saude fica registrado.
  async atualizar(vinculo: Cuidador): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "UPDATE cuidador_paciente SET ativo = ?, autorizado_em = ? WHERE id = ?",
        [vinculo.estaAtivo(), vinculo.getAutorizadoEm(), vinculo.getId()]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // O nome do paciente e o nome da conta dona da ficha: pacientes nao tem coluna de nome.
  async listarPacientes(idCuidador: number): Promise<VinculoComPaciente[]> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<VinculoComPacienteLinha[]>(
        `SELECT cp.id, cp.id_cuidador, cp.id_paciente, cp.autorizado_em, cp.ativo, u.nome AS nome_paciente
           FROM cuidador_paciente cp
           JOIN pacientes p ON p.id = cp.id_paciente
           JOIN usuarios u ON u.id = p.id_usuario
          WHERE cp.id_cuidador = ?
            AND cp.ativo = TRUE
          ORDER BY u.nome, cp.id`,
        [idCuidador]
      );
      return linhas.map((linha) => ({
        vinculo: this.paraEntidade(linha),
        nomePaciente: linha.nome_paciente,
      }));
    } finally {
      conexao.release();
    }
  }

  // Mesma regra do proximaDose dos medicamentos: primeira dose 'prevista' com horario no futuro.
  // O id desempata duas doses no mesmo horario.
  async buscarProximaDose(idPaciente: number, agora: Date): Promise<ProximaDose | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<ProximaDoseLinha[]>(
        `SELECT m.nome AS nome_medicamento, d.horario_previsto
           FROM doses d
           JOIN medicamentos m ON m.id = d.id_medicamento
          WHERE m.id_paciente = ?
            AND d.status = 'prevista'
            AND d.horario_previsto > ?
          ORDER BY d.horario_previsto, d.id
          LIMIT 1`,
        [idPaciente, agora]
      );
      if (linhas.length === 0) {
        return null;
      }
      return {
        nomeMedicamento: linhas[0].nome_medicamento,
        horarioPrevisto: linhas[0].horario_previsto,
      };
    } finally {
      conexao.release();
    }
  }

  private paraEntidade(linha: VinculoLinha): Cuidador {
    return new Cuidador(
      Number(linha.id_cuidador),
      Number(linha.id_paciente),
      Number(linha.id),
      linha.autorizado_em,
      Boolean(Number(linha.ativo))
    );
  }
}

const cuidadorInfrastructure = new CuidadorInfrastructure();
export default cuidadorInfrastructure;
