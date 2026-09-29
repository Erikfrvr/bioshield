// Interface do repositorio de autorizacao: as perguntas que eu faco ao banco antes de liberar dado de paciente.
// Nao tem entidade aqui, so "de quem e essa ficha" e "esse usuario tem vinculo ativo com ela".
export interface AutorizacaoRepository {
    // Devolve o id do usuario dono da ficha, ou null se a ficha nao existe
    buscarDonoDoPaciente(idPaciente: number): Promise<number | null>;
    // True quando existe linha em cuidador_paciente com ativo = TRUE para essa dupla
    temVinculoAtivo(idCuidador: number, idPaciente: number): Promise<boolean>;
}
