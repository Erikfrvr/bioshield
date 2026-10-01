// Implementacao MySQL do DoseRepository.
// SQL da agenda de doses e da confirmacao. As contas de adesao ficam no service, aqui eu so trago os numeros.
// As consultas vieram do database/rascunho_medicamentos_doses.sql. Cada @variavel virou ?,
// e cada NOW() e CURDATE() tambem: quem manda a hora e o service (ver o DoseRepository).
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import Dose from "../models/entidade/Dose";
import Dosagem from "../models/valueObjects/Dosagem";
import { RegistrarDoseDTO } from "../models/dto/dose/RegistrarDoseDTO";
import { ContagemDoses, DoseComMedicamento, DoseComPaciente, DoseRepository } from "../repository/DoseRepository";

interface DoseLinha extends RowDataPacket {
  id: number;
  id_medicamento: number;
  horario_previsto: Date;
  horario_confirmado: Date | null;
  status: string;
}

// Linha de doses com o que vem de medicamentos pelo join
interface DoseComMedicamentoLinha extends DoseLinha {
  nome_medicamento: string;
  // O mysql2 devolve DECIMAL como texto, "50.00". O value object Dosagem converte.
  dosagem: string;
  unidade: string;
}

interface DoseComPacienteLinha extends DoseLinha {
  id_paciente: number;
}

// SUM tambem volta como texto no mysql2, e vem NULL quando a janela nao tem linha nenhuma
interface ContagemLinha extends RowDataPacket {
  previstas: number;
  tomadas: string | null;
  perdidas: string | null;
}

export class DoseInfrastructure implements DoseRepository {
  // Um INSERT so com todas as linhas: o "VALUES ?" do mysql2 abre a lista de [id, horario].
  // status e horario_confirmado ficam com o DEFAULT do banco ('prevista' e NULL).
  async registrar(doses: RegistrarDoseDTO[]): Promise<void> {
    if (doses.length === 0) {
      return;
    }

    const conexao = await pool.getConnection();
    try {
      await conexao.query(
        "INSERT INTO doses (id_medicamento, horario_previsto) VALUES ?",
        [doses.map((dose) => [dose.idMedicamento, dose.horarioPrevisto])]
      );
    } finally {
      conexao.release();
    }
  }

  // Dose tomada e dose ja perdida ficam como estao: so a 'prevista' atrasada muda.
  async marcarPerdidas(idPaciente: number, limite: Date): Promise<void> {
    const conexao = await pool.getConnection();
    try {
      await conexao.query(
        `UPDATE doses d
           JOIN medicamentos m ON m.id = d.id_medicamento
            SET d.status = 'perdida'
          WHERE m.id_paciente = ?
            AND d.status = 'prevista'
            AND d.horario_previsto < ?`,
        [idPaciente, limite]
      );
    } finally {
      conexao.release();
    }
  }

  // Uso intervalo em vez de DATE(d.horario_previsto) = ? porque funcao em cima da coluna
  // impede o banco de usar o indice idx_doses_agenda. O id desempata duas doses no mesmo horario.
  async listarPorPeriodo(idPaciente: number, inicio: Date, fim: Date): Promise<DoseComMedicamento[]> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<DoseComMedicamentoLinha[]>(
        `SELECT d.id, d.id_medicamento, m.nome AS nome_medicamento, m.dosagem, m.unidade,
                d.horario_previsto, d.horario_confirmado, d.status
           FROM doses d
           JOIN medicamentos m ON m.id = d.id_medicamento
          WHERE m.id_paciente = ?
            AND d.horario_previsto >= ?
            AND d.horario_previsto < ?
          ORDER BY d.horario_previsto, d.id`,
        [idPaciente, inicio, fim]
      );
      return linhas.map((linha) => ({
        dose: this.paraEntidade(linha),
        nomeMedicamento: linha.nome_medicamento,
        dosagem: new Dosagem(linha.dosagem, linha.unidade),
      }));
    } finally {
      conexao.release();
    }
  }

  // O paciente vem do remedio pelo join: a tabela doses nao tem id_paciente.
  async buscarPorId(id: number): Promise<DoseComPaciente | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<DoseComPacienteLinha[]>(
        `SELECT d.id, d.id_medicamento, d.horario_previsto, d.horario_confirmado, d.status, m.id_paciente
           FROM doses d
           JOIN medicamentos m ON m.id = d.id_medicamento
          WHERE d.id = ?`,
        [id]
      );
      if (linhas.length === 0) {
        return null;
      }
      return { dose: this.paraEntidade(linhas[0]), idPaciente: Number(linhas[0].id_paciente) };
    } finally {
      conexao.release();
    }
  }

  async confirmar(dose: Dose): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "UPDATE doses SET status = ?, horario_confirmado = ? WHERE id = ?",
        [dose.getStatus(), dose.getHorarioConfirmado(), dose.getId()]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // "previstas" e o total da janela, seja qual for o status. SUM(condicao) conta as linhas em que ela e verdadeira.
  // O percentual que estava no rascunho ficou de fora: essa conta e do service.
  async contarPorPeriodo(idPaciente: number, inicio: Date, fim: Date): Promise<ContagemDoses> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<ContagemLinha[]>(
        `SELECT COUNT(*) AS previstas,
                SUM(d.status = 'tomada') AS tomadas,
                SUM(d.status = 'perdida') AS perdidas
           FROM doses d
           JOIN medicamentos m ON m.id = d.id_medicamento
          WHERE m.id_paciente = ?
            AND d.horario_previsto >= ?
            AND d.horario_previsto <= ?`,
        [idPaciente, inicio, fim]
      );
      return {
        previstas: Number(linhas[0].previstas),
        tomadas: Number(linhas[0].tomadas ?? 0),
        perdidas: Number(linhas[0].perdidas ?? 0),
      };
    } finally {
      conexao.release();
    }
  }

  private paraEntidade(linha: DoseLinha): Dose {
    return new Dose(
      Number(linha.id_medicamento),
      linha.horario_previsto,
      Number(linha.id),
      linha.status,
      linha.horario_confirmado
    );
  }
}

const doseInfrastructure = new DoseInfrastructure();
export default doseInfrastructure;
