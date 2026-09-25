// O que eu devolvo do usuario pro front: id, nome e email.
// Senha e hash nunca saem daqui, nem por engano.
export interface UsuarioResponseDTO {
    id: number;
    nome: string;
    email: string;
}