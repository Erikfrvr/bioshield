// Implementacao MySQL do AutorizacaoRepository.
// Duas consultas pequenas que todo service chama antes de ler ou mexer em dado de paciente.
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import { AutorizacaoRepository } from "../repository/AutorizacaoRepository";

export class AutorizacaoInfrastructure implements AutorizacaoRepository {
  async buscarDonoDoPaciente(idPaciente: number): Promise<number | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<RowDataPacket[]>(
        "SELECT id_usuario FROM pacientes WHERE id = ?",
        [idPaciente]
      );
      return linhas.length === 0 ? null : Number(linhas[0].id_usuario);
    } finally {
      conexao.release();
    }
  }

  // Vinculo desfeito continua na tabela com ativo = FALSE, entao o filtro e obrigatorio
  async temVinculoAtivo(idCuidador: number, idPaciente: number): Promise<boolean> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<RowDataPacket[]>(
        "SELECT 1 FROM cuidador_paciente WHERE id_cuidador = ? AND id_paciente = ? AND ativo = TRUE",
        [idCuidador, idPaciente]
      );
      return linhas.length > 0;
    } finally {
      conexao.release();
    }
  }
}

const autorizacaoInfrastructure = new AutorizacaoInfrastructure();
export default autorizacaoInfrastructure;
