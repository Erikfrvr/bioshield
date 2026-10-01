// Entidade Dose: uma tomada especifica de um medicamento.
// Guarda o horario previsto, o horario em que foi confirmada e o status (prevista, tomada ou perdida).
// A adesao do app inteiro sai da soma dessas doses.

// Mesma lista do ENUM de doses.status
export const STATUS_DOSE = ["prevista", "tomada", "perdida"] as const;
export type StatusDose = (typeof STATUS_DOSE)[number];

export class Dose {
	private id: number | null;
	private idMedicamento: number;
	private horarioPrevisto: Date;
	private horarioConfirmado: Date | null;
	private status: StatusDose;

	// Dose nova nasce "prevista" e sem horario confirmado, o mesmo DEFAULT do banco.
	constructor(
		idMedicamento: number,
		horarioPrevisto: Date,
		id: number | null = null,
		status: string = "prevista",
		horarioConfirmado: Date | null = null
	) {
		if (!Number.isInteger(idMedicamento) || idMedicamento <= 0) {
			throw new Error("O id do medicamento da dose é inválido.");
		}

		this.id = id;
		this.idMedicamento = idMedicamento;
		this.horarioPrevisto = Dose.validarHorario(horarioPrevisto, "horário previsto");
		this.status = Dose.validarStatus(status);
		this.horarioConfirmado = horarioConfirmado === null
			? null
			: Dose.validarHorario(horarioConfirmado, "horário confirmado");

		// Dose tomada sem a hora em que foi tomada nao serve pra nada no historico.
		if (this.status === "tomada" && this.horarioConfirmado === null) {
			throw new Error("Dose tomada precisa ter o horário confirmado.");
		}
	}

	// Rejeita o que nao e Date e tambem o Date invalido, que nasce de new Date("texto qualquer").
	private static validarHorario(horario: Date, campo: string): Date {
		if (!(horario instanceof Date) || Number.isNaN(horario.getTime())) {
			throw new Error(`O ${campo} da dose é inválido.`);
		}

		return horario;
	}

	private static validarStatus(status: string): StatusDose {
		if (status === null || status === undefined || status === "") {
			return "prevista";
		}

		const normalizado = typeof status === "string" ? status.trim().toLowerCase() : "";

		if (!(STATUS_DOSE as readonly string[]).includes(normalizado)) {
			throw new Error("O status da dose precisa ser prevista, tomada ou perdida.");
		}

		return normalizado as StatusDose;
	}

	public getId(): number | null {
		return this.id;
	}

	public setId(id: number): void {
		this.id = id;
	}

	public getIdMedicamento(): number {
		return this.idMedicamento;
	}

	public getHorarioPrevisto(): Date {
		return this.horarioPrevisto;
	}

	public getHorarioConfirmado(): Date | null {
		return this.horarioConfirmado;
	}

	public getStatus(): StatusDose {
		return this.status;
	}

	public estaPrevista(): boolean {
		return this.status === "prevista";
	}

	public foiTomada(): boolean {
		return this.status === "tomada";
	}

	public foiPerdida(): boolean {
		return this.status === "perdida";
	}

	// Vale pra dose prevista e pra perdida tambem: o front tem o botao "Tomei mesmo assim".
	// So nao deixo confirmar duas vezes, senao a segunda apagaria a hora real da primeira.
	public confirmar(horarioConfirmado: Date): void {
		if (this.status === "tomada") {
			throw new Error("Essa dose já foi confirmada.");
		}

		this.horarioConfirmado = Dose.validarHorario(horarioConfirmado, "horário confirmado");
		this.status = "tomada";
	}

	// So dose prevista vira perdida. Dose tomada e historico e nao volta atras.
	// Quem decide se ja passou da tolerancia e o service.
	public marcarComoPerdida(): void {
		if (this.status !== "prevista") {
			throw new Error("Só uma dose prevista pode ser marcada como perdida.");
		}

		this.status = "perdida";
	}
}

export default Dose;
