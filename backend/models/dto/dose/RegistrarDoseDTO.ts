// O que eu uso pra criar a dose na agenda: id do medicamento e horario previsto.
// Nao vem do front: e o service que monta, uma linha pra cada horario gerado.
// status e horarioConfirmado ficam com o DEFAULT do banco ('prevista' e NULL).

export interface RegistrarDoseDTO {
    idMedicamento: number;
    horarioPrevisto: Date;
}
