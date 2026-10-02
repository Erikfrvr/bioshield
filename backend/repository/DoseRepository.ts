// Contrato do banco pras doses: gerar agenda, listar doses do dia, confirmar dose e contar doses do periodo.
// Quem implementa e o doseInfrastructure. O service so conhece esta interface.
// Todo horario entra por parametro: quem sabe que horas sao e o service, o banco nao usa NOW() por conta propria.
// Assim a agenda gerada no cadastro e as consultas daqui olham pro mesmo relogio.
import Dose from "../models/entidade/Dose";
import Dosagem from "../models/valueObjects/Dosagem";
import { RegistrarDoseDTO } from "../models/dto/dose/RegistrarDoseDTO";

// A entidade Dose nao guarda o nome nem a dosagem do remedio: eles moram em medicamentos.
// A tela do dia precisa deles, entao a listagem devolve tudo junto.
export interface DoseComMedicamento {
    dose: Dose;
    nomeMedicamento: string;
    dosagem: Dosagem;
}

// A dose com o paciente dono do remedio. A rota de confirmar so recebe o id da dose,
// e o service precisa do paciente pra chamar o garantirAcompanhamento.
export interface DoseComPaciente {
    dose: Dose;
    idPaciente: number;
}

// Os numeros crus de uma janela da adesao. O percentual e conta do service.
export interface ContagemDoses {
    previstas: number;
    tomadas: number;
    perdidas: number;
}

export interface DoseRepository {
    // Insere as doses da agenda, todas como 'prevista'. Lista vazia nao faz nada.
    // Dose que ja existe no mesmo remedio e horario e pulada, nao da erro.
    registrar(doses: RegistrarDoseDTO[]): Promise<void>;
    // Horario da ultima dose gerada de cada remedio do paciente, seja qual for o status.
    // A chave e o id do remedio. Remedio sem dose nenhuma nao aparece no mapa.
    // O service usa pra saber de onde continuar a agenda.
    ultimoHorarioPorMedicamento(idPaciente: number): Promise<Map<number, Date>>;
    // Passa pra 'perdida' as doses 'prevista' do paciente com horario anterior ao limite (agora menos a tolerancia).
    // Sem isso nada no sistema vira 'perdida' sozinho. O service chama antes de listar e de contar.
    marcarPerdidas(idPaciente: number, limite: Date): Promise<void>;
    // Doses do paciente com horario previsto de inicio (inclusive) ate fim (exclusive), ordenadas por horario.
    listarPorPeriodo(idPaciente: number, inicio: Date, fim: Date): Promise<DoseComMedicamento[]>;
    // null quando a dose nao existe.
    buscarPorId(id: number): Promise<DoseComPaciente | null>;
    // Grava o status e o horario confirmado que estao na entidade. Devolve false quando a dose nao existe.
    confirmar(dose: Dose): Promise<boolean>;
    // Conta as doses do paciente com horario previsto de inicio (inclusive) ate fim (inclusive).
    // "previstas" e o total da janela, seja qual for o status. Janela sem dose devolve tudo zero.
    contarPorPeriodo(idPaciente: number, inicio: Date, fim: Date): Promise<ContagemDoses>;
}
