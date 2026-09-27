// O que eu devolvo pro front quando o login da certo: o token, os dados publicos da conta
// e o id da ficha medica. O idPaciente vem null quando a pessoa ainda nao preencheu a ficha,
// e e isso que faz o front mandar ela pra tela de criar ficha sem precisar de outra rota.
import { UsuarioResponseDTO } from "./UsuarioResponseDTO";

export interface LoginResponseDTO {
    token: string;
    usuario: UsuarioResponseDTO;
    idPaciente: number | null;
}
