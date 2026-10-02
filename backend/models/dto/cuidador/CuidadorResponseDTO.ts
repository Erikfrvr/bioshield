// O painel do cuidador: paciente acompanhado, adesao da semana, proxima dose e doses perdidas.
// Campo por campo, igual a secao Cuidador do CONTRATO_API.md.
// Nada da ficha medica e nada do log de acessos sai por aqui: o cuidador so ve acompanhamento de dose.

// Resposta do POST /api/cuidadores/vincular.
export interface VinculoResponseDTO {
    idVinculo: number;
    idPaciente: number;
}

// So o que a tela mostra da proxima dose. O horario sai em ISO.
export interface ProximaDoseCuidadorDTO {
    nomeMedicamento: string;
    horarioPrevisto: string;
}

// Uma linha do GET /api/cuidadores/:id/pacientes.
export interface PacienteAcompanhadoResponseDTO {
    idVinculo: number;
    idPaciente: number;
    nome: string;
    // Percentual inteiro, de 0 a 100, dos ultimos 7 dias ate agora. A mesma conta do GET /doses/adesao.
    adesaoSemana: number;
    // Doses perdidas na mesma janela dos ultimos 7 dias.
    dosesPerdidas: number;
    // null quando o paciente nao tem dose programada.
    proximaDose: ProximaDoseCuidadorDTO | null;
}
