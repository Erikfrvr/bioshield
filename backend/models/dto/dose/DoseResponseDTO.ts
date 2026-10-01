// A dose como aparece na tela: nome do remedio, dosagem, horario previsto e status.
// Campo por campo, igual a secao Doses do CONTRATO_API.md. Os horarios saem em ISO.
import { StatusDose } from "../../entidade/Dose";
import { Unidade } from "../../valueObjects/Dosagem";

// Uma linha do GET /api/doses/hoje. nomeMedicamento, dosagem e unidade vem de medicamentos por join.
export interface DoseResponseDTO {
    id: number;
    idMedicamento: number;
    nomeMedicamento: string;
    dosagem: number;
    unidade: Unidade;
    horarioPrevisto: string;
    horarioConfirmado: string | null;
    status: StatusDose;
}

// Resposta do POST /api/doses/:id/confirmar: so o que mudou na dose.
export interface DoseConfirmadaResponseDTO {
    id: number;
    status: StatusDose;
    horarioConfirmado: string;
}

// Uma janela da adesao. percentual e inteiro, ja arredondado, de 0 a 100.
export interface AdesaoPeriodoDTO {
    previstas: number;
    tomadas: number;
    perdidas: number;
    percentual: number;
}

// Resposta do GET /api/doses/adesao. "semana" sao os ultimos 7 dias ate agora.
export interface AdesaoResponseDTO {
    hoje: AdesaoPeriodoDTO;
    semana: AdesaoPeriodoDTO;
}
