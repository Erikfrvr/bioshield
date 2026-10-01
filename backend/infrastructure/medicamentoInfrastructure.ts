// Implementacao MySQL do MedicamentoRepository.
// SQL dos remedios do paciente.
// As consultas vieram do database/rascunho_medicamentos_doses.sql, com cada @variavel trocada por ?.
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import Medicamento from "../models/entidade/Medicamento";
import Dosagem from "../models/valueObjects/Dosagem";
import HorarioDose from "../models/valueObjects/HorarioDose";
import { MedicamentoComProximaDose, MedicamentoRepository } from "../repository/MedicamentoRepository";

// Linha de medicamentos com a proxima dose que vem da subconsulta em doses
interface MedicamentoLinha extends RowDataPacket {
  id: number;
  id_paciente: number;
  nome: string;
  // O mysql2 devolve DECIMAL como texto, "50.00". O value object Dosagem converte.
  dosagem: string;
  unidade: string;
  frequencia_horas: number;
  horario_inicial: string;
  data_inicio: Date;
  data_fim: Date | null;
  ativo: number;
  criado_em: Date;
  proxima_dose: Date | null;
}

// proxima_dose: a primeira dose 'prevista' com horario no futuro. Vem NULL quando nao tem.
// TIME_FORMAT corta os segundos: o banco devolve "08:00:00" e o contrato quer "08:00".
const SELECT_MEDICAMENTO = `
  SELECT m.id, m.id_paciente, m.nome, m.dosagem, m.unidade, m.frequencia_horas,
         TIME_FORMAT(m.horario_inicial, '%H:%i') AS horario_inicial,
         m.data_inicio, m.data_fim, m.ativo, m.criado_em,
         (SELECT MIN(d.horario_previsto)
            FROM doses d
           WHERE d.id_medicamento = m.id
             AND d.status = 'prevista'
             AND d.horario_previsto > NOW()) AS proxima_dose
    FROM medicamentos m`;

export class MedicamentoInfrastructure implements MedicamentoRepository {
  // ativo e criado_em ficam com o DEFAULT do banco. O id gerado volta pra dentro da entidade.
  async cadastrar(medicamento: Medicamento): Promise<void> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO medicamentos
           (id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          medicamento.getIdPaciente(),
          medicamento.getNome(),
          medicamento.getDosagem().getValor(),
          medicamento.getDosagem().getUnidade(),
          medicamento.getHorarioDose().getFrequenciaHoras(),
          medicamento.getHorarioDose().getHorarioInicial(),
          medicamento.getDataInicio(),
          medicamento.getDataFim(),
        ]
      );
      medicamento.setId(resultado.insertId);
    } finally {
      conexao.release();
    }
  }

  // Ativos primeiro, depois por nome, para o remedio encerrado nao ficar no topo da tela.
  async listarPorPaciente(idPaciente: number): Promise<MedicamentoComProximaDose[]> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<MedicamentoLinha[]>(
        `${SELECT_MEDICAMENTO}
          WHERE m.id_paciente = ?
          ORDER BY m.ativo DESC, m.nome`,
        [idPaciente]
      );
      return linhas.map((linha) => this.paraResultado(linha));
    } finally {
      conexao.release();
    }
  }

  async buscarPorId(id: number): Promise<MedicamentoComProximaDose | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<MedicamentoLinha[]>(
        `${SELECT_MEDICAMENTO}
          WHERE m.id = ?`,
        [id]
      );
      return linhas.length === 0 ? null : this.paraResultado(linhas[0]);
    } finally {
      conexao.release();
    }
  }

  // id_paciente fica fora do SET: remedio nao troca de dono.
  // Busco a linha antes do UPDATE porque affectedRows vem 0 tanto pra "nao existe"
  // quanto pra "nada mudou", e o service precisa separar os dois pra devolver 404 so no primeiro.
  async atualizar(medicamento: Medicamento): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<RowDataPacket[]>(
        "SELECT id FROM medicamentos WHERE id = ?",
        [medicamento.getId()]
      );
      if (linhas.length === 0) {
        return false;
      }

      await conexao.query<ResultSetHeader>(
        `UPDATE medicamentos
            SET nome = ?, dosagem = ?, unidade = ?, frequencia_horas = ?, horario_inicial = ?,
                data_inicio = ?, data_fim = ?, ativo = ?
          WHERE id = ?`,
        [
          medicamento.getNome(),
          medicamento.getDosagem().getValor(),
          medicamento.getDosagem().getUnidade(),
          medicamento.getHorarioDose().getFrequenciaHoras(),
          medicamento.getHorarioDose().getHorarioInicial(),
          medicamento.getDataInicio(),
          medicamento.getDataFim(),
          medicamento.estaAtivo(),
          medicamento.getId(),
        ]
      );
      return true;
    } finally {
      conexao.release();
    }
  }

  // O ON DELETE CASCADE de doses leva a agenda e o historico junto.
  async apagar(id: number): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "DELETE FROM medicamentos WHERE id = ?",
        [id]
      );
      return resultado.affectedRows > 0;
    } finally {
      conexao.release();
    }
  }

  // Dado do banco ja foi validado na entrada, mas passo pelos value objects mesmo assim:
  // assim a entidade e sempre a mesma, venha do front ou do banco.
  private paraResultado(linha: MedicamentoLinha): MedicamentoComProximaDose {
    const medicamento = new Medicamento(
      Number(linha.id_paciente),
      linha.nome,
      new Dosagem(linha.dosagem, linha.unidade),
      new HorarioDose(linha.horario_inicial, linha.frequencia_horas),
      linha.data_inicio,
      linha.data_fim,
      Number(linha.id),
      Boolean(linha.ativo),
      linha.criado_em
    );
    return { medicamento, proximaDose: linha.proxima_dose };
  }
}

const medicamentoInfrastructure = new MedicamentoInfrastructure();
export default medicamentoInfrastructure;
