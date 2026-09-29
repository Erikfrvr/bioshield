// Os campos opcionais da ficha na hora de editar, pra eu conseguir fazer atualizacao parcial.
// Campo que nao veio fica como esta. Campo que veio null e apagado.
// alergias e contatos, quando vem, sao o estado final: substituem a lista inteira (contrato do PUT).
import { AlergiaDTO, ContatoEmergenciaDTO } from "./CriarPacienteDTO";

export interface AtualizarPacienteDTO {
    tipoSanguineo?: string | null;
    condicoes?: string | null;
    observacoes?: string | null;
    alergias?: AlergiaDTO[];
    contatos?: ContatoEmergenciaDTO[];
}
