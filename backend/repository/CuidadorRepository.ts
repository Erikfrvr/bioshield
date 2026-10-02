// Contrato do banco pro vinculo cuidador e paciente: vincular, listar pacientes do cuidador e desvincular.
// Quem implementa e o cuidadorInfrastructure. O service so conhece esta interface.
// Como no DoseRepository, todo horario entra por parametro: o banco nao usa NOW() por conta propria.
import Cuidador from "../models/entidade/Cuidador";
import CodigoCuidador from "../models/valueObjects/CodigoCuidador";

// A ficha que um codigo de autorizacao aponta. O codigo ja vem com a validade,
// e quem decide se ele venceu e o service, com o estaVencido do value object.
export interface PacienteDoCodigo {
    idPaciente: number;
    codigo: CodigoCuidador;
}

// O vinculo com o nome de quem e acompanhado. A entidade Cuidador so guarda os ids,
// e o nome mora em usuarios (o dono da ficha), entao a listagem devolve os dois juntos.
export interface VinculoComPaciente {
    vinculo: Cuidador;
    nomePaciente: string;
}

// So o que o painel mostra da proxima dose. O cuidador nao recebe a dose inteira.
export interface ProximaDose {
    nomeMedicamento: string;
    horarioPrevisto: Date;
}

export interface CuidadorRepository {
    // A ficha dona desse codigo, ou null quando o codigo nao bate com ninguem.
    // Devolve mesmo se o codigo estiver vencido: o service confere a validade.
    buscarPacientePorCodigo(codigo: string): Promise<PacienteDoCodigo | null>;
    // O vinculo dessa dupla, ativo ou nao, ou null se nunca existiu.
    // O banco tem UNIQUE (id_cuidador, id_paciente), entao vincular de novo reaproveita a linha antiga.
    buscarVinculo(idCuidador: number, idPaciente: number): Promise<Cuidador | null>;
    // null quando o vinculo nao existe. O service usa os ids da entidade pra conferir quem pode desfazer.
    buscarVinculoPorId(id: number): Promise<Cuidador | null>;
    // Insere o vinculo novo e devolve o id gerado dentro da entidade.
    vincular(vinculo: Cuidador): Promise<void>;
    // Grava o ativo e o autorizado_em que estao na entidade. Serve pro desvincular e pro reativar.
    // Nunca apaga a linha: quem teve acesso a dado de saude fica registrado. Devolve false quando o vinculo nao existe.
    atualizar(vinculo: Cuidador): Promise<boolean>;
    // Os vinculos com ativo = TRUE desse cuidador. Lista vazia quando ele nao acompanha ninguem.
    listarPacientes(idCuidador: number): Promise<VinculoComPaciente[]>;
    // A primeira dose 'prevista' do paciente com horario depois de agora, ou null se nao houver.
    buscarProximaDose(idPaciente: number, agora: Date): Promise<ProximaDose | null>;
}
