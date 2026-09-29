// Exatamente o que aparece pra quem escaneia o QR Code.
// Esse DTO e o meu filtro de privacidade: se um campo nao esta escrito aqui, ele nao vaza.
// Campo por campo, igual ao GET /api/emergencia/:token do CONTRATO_API.md.
// Nada de id, email, senha, idUsuario ou tokenQr, nem nas listas.

export interface AlergiaEmergenciaDTO {
    substancia: string;
    gravidade: "leve" | "moderada" | "grave";
    observacao: string | null;
}

// Sem "ativo": a lista so tem remedio ativo, entao o campo seria sempre true
export interface MedicamentoEmergenciaDTO {
    nome: string;
    dosagem: number;
    unidade: string;
    frequenciaHoras: number;
}

// Sem "prioridade": a ordem da lista ja e a ordem de ligar
export interface ContatoEmergenciaDTO {
    nome: string;
    telefone: string;
    parentesco: string | null;
}

export interface FichaEmergenciaResponseDTO {
    nome: string;
    tipoSanguineo: string | null;
    condicoes: string | null;
    observacoes: string | null;
    atualizadoEm: string;
    alergias: AlergiaEmergenciaDTO[];
    medicamentos: MedicamentoEmergenciaDTO[];
    contatos: ContatoEmergenciaDTO[];
}

// Corpo do 410, quando o titular cancelou o QR. Enxuto de proposito: nem o nome sai.
export interface FichaEmergenciaCanceladaDTO {
    mensagem: string;
}
