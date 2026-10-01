// Contrato do banco pros medicamentos: cadastrar, listar por paciente, buscar por id, atualizar e apagar.
// Quem implementa e o medicamentoInfrastructure. O service so conhece esta interface.
import Medicamento from "../models/entidade/Medicamento";

// A entidade Medicamento nao guarda a proxima dose: ela mora em doses.
// O GET precisa dela, entao a leitura devolve os dois juntos.
// proximaDose e a primeira dose prevista com horario no futuro, ou null se nao houver.
export interface MedicamentoComProximaDose {
    medicamento: Medicamento;
    proximaDose: Date | null;
}

export interface MedicamentoRepository {
    // Grava o remedio e devolve o id gerado dentro da entidade.
    cadastrar(medicamento: Medicamento): Promise<void>;
    // Todos os remedios da ficha, ativos ou nao. Lista vazia quando o paciente nao tem nenhum.
    listarPorPaciente(idPaciente: number): Promise<MedicamentoComProximaDose[]>;
    // null quando o remedio nao existe. O service usa o idPaciente da entidade pra chamar o garantirDono.
    buscarPorId(id: number): Promise<MedicamentoComProximaDose | null>;
    // Grava todos os campos editaveis da entidade. Devolve false quando o remedio nao existe.
    atualizar(medicamento: Medicamento): Promise<boolean>;
    // Apaga a linha, e o ON DELETE CASCADE leva as doses junto. Devolve false quando o remedio nao existe.
    apagar(id: number): Promise<boolean>;
}
