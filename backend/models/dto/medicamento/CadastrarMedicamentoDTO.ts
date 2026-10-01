// O que chega do front pra cadastrar remedio: nome, dosagem, frequencia, horario inicial e duracao.
// Campo por campo, igual ao POST /api/medicamentos do CONTRATO_API.md.
// idPaciente vem no corpo, mas o service confere com garantirDono antes de gravar.
// unidade vazia vira "mg" e dataFim null e tratamento continuo.

export interface CadastrarMedicamentoDTO {
    idPaciente: number;
    nome: string;
    dosagem: number;
    unidade?: string;
    frequenciaHoras: number;
    horarioInicial: string;
    dataInicio: string;
    dataFim?: string | null;
}
