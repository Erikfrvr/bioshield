// Campos opcionais pra editar um remedio ja cadastrado.
// Campo que nao veio fica como esta. dataFim null volta o tratamento pra continuo.
// idPaciente nao entra aqui: remedio nao troca de dono.

export interface AtualizarMedicamentoDTO {
    nome?: string;
    dosagem?: number;
    unidade?: string;
    frequenciaHoras?: number;
    horarioInicial?: string;
    dataInicio?: string;
    dataFim?: string | null;
}
