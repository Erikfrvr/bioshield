// Contrato do banco pra ficha de emergencia: buscar pelo token e registrar quando o QR foi acessado.
import FichaEmergencia from "../models/entidade/FichaEmergencia";
import TokenQR from "../models/valueObjects/TokenQR";

// O service precisa separar 404 de 410, entao a busca diz em que estado o QR esta.
// Com QR cancelado nem monto a ficha: nao tem por que ler dado de saude que nao vai sair.
// O idPaciente e so pro log de acesso, ele nunca vai pra resposta.
export type ResultadoBuscaEmergencia =
    | { situacao: "ativo"; idPaciente: number; ficha: FichaEmergencia }
    | { situacao: "cancelado"; idPaciente: number };

export interface EmergenciaRepository {
    // Devolve null quando nenhuma ficha tem esse token
    buscarPorToken(token: TokenQR): Promise<ResultadoBuscaEmergencia | null>;
    // Grava uma linha em acessos_qr. acessado_em fica com o DEFAULT do banco.
    // ip e userAgent podem faltar (proxy, cliente estranho), e isso nao pode barrar o socorro.
    registrarAcesso(idPaciente: number, ip: string | null, userAgent: string | null): Promise<void>;
}
