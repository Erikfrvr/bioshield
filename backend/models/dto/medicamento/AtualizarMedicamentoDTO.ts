// Campos opcionais pra editar um remedio ja cadastrado.
// Campo que nao veio fica como esta. dataFim null volta o tratamento pra continuo.
// idPaciente nao entra aqui: remedio nao troca de dono.
// ativo false suspende o remedio e ativo true reativa (duvida 6 do docs/DUVIDAS_CONTRATO.md).

export interface AtualizarMedicamentoDTO {
    nome?: string;
    dosagem?: number;
    unidade?: string;
    frequenciaHoras?: number;
    horarioInicial?: string;
    dataInicio?: string;
    dataFim?: string | null;
    ativo?: boolean;
}
