// O que eu devolvo quando o QR muda de estado (rotacionar, cancelar, reativar).
// Rotacionar e reativar devolvem tudo. Cancelar devolve so qrAtivo e qrCanceladoEm, como no contrato:
// o token nao muda no cancelamento, e nao tem por que mandar ele de novo.
export interface QrResponseDTO {
    tokenQr?: string;
    tokenGeradoEm?: string;
    qrAtivo: boolean;
    qrCanceladoEm: string | null;
}
