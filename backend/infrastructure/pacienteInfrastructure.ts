// Implementacao MySQL do PacienteRepository.
// SQL da ficha medica, incluindo o join com alergias e com o contato de emergencia.
import { ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import TokenQR from "../models/valueObjects/TokenQR";
import { PacienteRepository } from "../repository/PacienteRepository";

export class PacienteInfrastructure implements PacienteRepository {
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
}

const pacienteInfrastructure = new PacienteInfrastructure();
export default pacienteInfrastructure;
