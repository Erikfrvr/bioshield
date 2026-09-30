// Contrato do banco pra ficha medica: criar, buscar por id, atualizar e a parte do QR.
// Quem implementa e o pacienteInfrastructure. O service so conhece esta interface.
import Paciente from "../models/entidade/Paciente";
import TokenQR from "../models/valueObjects/TokenQR";

// A entidade Paciente nao guarda o nome: ele mora em usuarios.
// O GET da ficha precisa dele, entao a busca devolve os dois juntos.
export interface PacienteComNome {
    paciente: Paciente;
    nome: string;
}

// Quais listas o PUT mandou e portanto precisam ser regravadas
export interface ListasAlteradas {
    alergias: boolean;
    contatos: boolean;
}

export interface PacienteRepository {
    // Grava a ficha com as alergias e os contatos numa transacao so e devolve o id gerado dentro da entidade.
    criar(paciente: Paciente): Promise<void>;
    // Ficha completa, ja com alergias, contatos e o nome do dono. null quando nao existe.
    buscarPorId(idPaciente: number): Promise<PacienteComNome | null>;
    // Id da ficha desse usuario, ou null se ele ainda nao criou. Cada usuario tem no maximo uma.
    buscarIdPorUsuario(idUsuario: number): Promise<number | null>;
    // Grava os campos da ficha e substitui inteiras as listas marcadas, numa transacao.
    // Lista que nao veio no PUT fica intocada, com os mesmos ids. Devolve false quando a ficha nao existe.
    atualizar(paciente: Paciente, listas: ListasAlteradas): Promise<boolean>;
    // Troca o token, grava token_gerado_em e deixa o QR ativo de novo.
    // Devolve false quando a ficha nao existe.
    trocarTokenQR(idPaciente: number, token: TokenQR): Promise<boolean>;
    // Marca qr_ativo = FALSE e grava qr_cancelado_em, sem tocar no token.
    // Devolve false quando o QR ja estava cancelado.
    cancelarQR(idPaciente: number, canceladoEm: Date): Promise<boolean>;
}
