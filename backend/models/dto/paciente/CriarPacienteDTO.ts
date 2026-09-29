// O que chega do front pra criar a ficha medica: tipo sanguineo, condicoes, alergias e contato de emergencia.
// O dono da ficha vem do token (req.idUsuario), nao do corpo. O front ainda manda idUsuario,
// mas o service ignora, senao daria pra criar ficha na conta de outra pessoa.

export interface AlergiaDTO {
    substancia: string;
    gravidade?: string;
    observacao?: string | null;
}

export interface ContatoEmergenciaDTO {
    nome: string;
    telefone: string;
    parentesco?: string | null;
    prioridade?: number;
}

export interface CriarPacienteDTO {
    idUsuario?: number;
    tipoSanguineo?: string | null;
    condicoes?: string | null;
    observacoes?: string | null;
    alergias?: AlergiaDTO[];
    contatos?: ContatoEmergenciaDTO[];
}
