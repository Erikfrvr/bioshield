// A ficha completa como o dono da conta ve dentro do app, ja com as alergias e o contato montados.
// Campo por campo, igual ao GET /pacientes/:id do CONTRATO_API.md. Nada de email nem senha:
// o nome vem de usuarios por join, e so ele.

export interface AlergiaResponseDTO {
    id: number;
    substancia: string;
    gravidade: "leve" | "moderada" | "grave";
    observacao: string | null;
}

export interface ContatoEmergenciaResponseDTO {
    id: number;
    nome: string;
    telefone: string;
    parentesco: string | null;
    prioridade: number;
}

export interface PacienteResponseDTO {
    id: number;
    idUsuario: number;
    nome: string;
    tipoSanguineo: string | null;
    condicoes: string | null;
    observacoes: string | null;
    tokenQr: string;
    qrAtivo: boolean;
    tokenGeradoEm: string;
    qrCanceladoEm: string | null;
    atualizadoEm: string | null;
    alergias: AlergiaResponseDTO[];
    contatos: ContatoEmergenciaResponseDTO[];
}
