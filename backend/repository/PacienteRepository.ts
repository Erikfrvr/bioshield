// Contrato do banco pra ficha medica: criar, buscar por id, buscar por token do QR, atualizar e apagar.
// Por enquanto so a parte do QR. O resto entra junto com a ficha na Fase 5.
import TokenQR from "../models/valueObjects/TokenQR";

export interface PacienteRepository {
    // Troca o token, grava token_gerado_em e deixa o QR ativo de novo.
    // Devolve false quando a ficha nao existe.
    trocarTokenQR(idPaciente: number, token: TokenQR): Promise<boolean>;
    // Marca qr_ativo = FALSE e grava qr_cancelado_em, sem tocar no token.
    // Devolve false quando o QR ja estava cancelado.
    cancelarQR(idPaciente: number, canceladoEm: Date): Promise<boolean>;
}
