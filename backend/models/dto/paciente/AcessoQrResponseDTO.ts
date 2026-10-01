// Uma linha do historico da LGPD: quando alguem abriu a ficha pelo QR e de onde.
// ip e userAgent podem vir null, porque o registro do acesso nao barra o socorro quando eles faltam.
export interface AcessoQrResponseDTO {
    id: number;
    acessadoEm: string;
    ip: string | null;
    userAgent: string | null;
}
