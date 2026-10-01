// O que chega quando a pessoa aperta "tomei": id da dose e a hora real da confirmacao.
// O id da dose vem na URL (POST /api/doses/:id/confirmar), entao o corpo so traz a hora, em ISO.

export interface ConfirmarDoseDTO {
    horarioConfirmado: string;
}
