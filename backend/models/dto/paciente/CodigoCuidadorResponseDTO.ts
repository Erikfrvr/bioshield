// O que eu devolvo quando o paciente gera o codigo de autorizacao do cuidador.
// So esses dois campos, como no contrato. validoAte vai em ISO.
export interface CodigoCuidadorResponseDTO {
    codigo: string;
    validoAte: string;
}
