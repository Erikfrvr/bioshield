// Value object HorarioDose: o horario da tomada e o intervalo entre uma dose e outra.
// Uso ele pra gerar a agenda de doses a partir da primeira tomada.

export class HorarioDose {
	// Aceita horas de 00 a 23 e minutos de 00 a 59, sempre no formato HH:mm.
	private static readonly FORMATO_HORARIO = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

	private readonly horarioInicial: string;
	private readonly frequenciaHoras: number;

	// Valida e guarda o horario da primeira dose e o intervalo entre as doses.
	constructor(horarioInicial: string, frequenciaHoras: number) {
		this.horarioInicial = HorarioDose.validarHorario(horarioInicial);
		this.frequenciaHoras = HorarioDose.validarFrequencia(frequenciaHoras);
	}

	// Remove espacos externos e rejeita horarios fora do formato de 24 horas.
	private static validarHorario(horario: string): string {
		if (typeof horario !== "string" || !HorarioDose.FORMATO_HORARIO.test(horario.trim())) {
			throw new Error("O horário inicial deve estar no formato HH:mm.");
		}

		return horario.trim();
	}

	// A frequencia deve ser um numero inteiro dentro do limite aceito pelo banco.
	private static validarFrequencia(frequenciaHoras: number): number {
		if (!Number.isInteger(frequenciaHoras) || frequenciaHoras < 1 || frequenciaHoras > 168) {
			throw new Error("A frequência deve ser um número inteiro entre 1 e 168 horas.");
		}

		return frequenciaHoras;
	}

	// Devolve o horario inicial ja validado.
	public getHorarioInicial(): string {
		return this.horarioInicial;
	}

	// Devolve o intervalo validado entre as doses, em horas.
	public getFrequenciaHoras(): number {
		return this.frequenciaHoras;
	}

	// Compara horario e frequencia para verificar se os value objects sao iguais.
	public igualA(outra: HorarioDose): boolean {
		return this.horarioInicial === outra.getHorarioInicial()
			&& this.frequenciaHoras === outra.getFrequenciaHoras();
	}

	// Apresenta os dados em uma frase legivel, ajustando hora/horas.
	public toString(): string {
		return `${this.horarioInicial} a cada ${this.frequenciaHoras} ${this.frequenciaHoras === 1 ? "hora" : "horas"}`;
	}
}

export default HorarioDose;
