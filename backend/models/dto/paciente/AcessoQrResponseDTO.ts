// Uma linha do historico da LGPD: quando a ficha publica foi aberta e por qual aparelho.
// Campo por campo, igual ao GET /api/pacientes/:id/acessos do CONTRATO_API.md.
export interface AcessoQrResponseDTO {
    id: number;
    acessadoEm: string;
    ip: string | null;
    userAgent: string | null;
}
