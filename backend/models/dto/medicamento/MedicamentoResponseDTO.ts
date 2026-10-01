// O remedio como o front exibe na lista, ja com a proxima dose calculada.
// Campo por campo, igual ao GET /api/medicamentos do CONTRATO_API.md.
// proximaDose e a primeira dose prevista com horario no futuro, em ISO, ou null se nao houver.
import { Unidade } from "../../valueObjects/Dosagem";

export interface MedicamentoResponseDTO {
    id: number;
    idPaciente: number;
    nome: string;
    dosagem: number;
    unidade: Unidade;
    frequenciaHoras: number;
    horarioInicial: string;
    dataInicio: string;
    dataFim: string | null;
    ativo: boolean;
    proximaDose: string | null;
}
