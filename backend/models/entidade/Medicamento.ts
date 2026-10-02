// Entidade Medicamento: um remedio que o paciente usa.
// Nome, dosagem, frequencia, horario da primeira dose e data de inicio e fim do tratamento.

import Dosagem from "../valueObjects/Dosagem";
import HorarioDose from "../valueObjects/HorarioDose";

export class Medicamento {
	// O nome corresponde a medicamentos.nome, que aceita ate 100 caracteres.
	private static readonly NOME_TAMANHO_MAXIMO = 100;
	private static readonly MS_POR_HORA = 60 * 60 * 1000;

	private id: number | null;
	private idPaciente: number;
	private nome: string;
	private dosagem: Dosagem;
	private horarioDose: HorarioDose;
	private dataInicio: string;
	private dataFim: string | null;
	private ativo: boolean;
	private criadoEm: Date | null;

	// Monta o medicamento com dosagem e horario ja protegidos pelos value objects.
	constructor(
		idPaciente: number,
		nome: string,
		dosagem: Dosagem,
		horarioDose: HorarioDose,
		dataInicio: string | Date,
		dataFim: string | Date | null = null,
		id: number | null = null,
		ativo: boolean = true,
		criadoEm: Date | null = null
	) {
		if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
			throw new Error("O id do paciente dono do medicamento é inválido.");
		}

		this.id = id;
		this.idPaciente = idPaciente;
		this.nome = Medicamento.validarNome(nome);
		this.dosagem = dosagem;
		this.horarioDose = horarioDose;

		const periodo = Medicamento.validarPeriodo(dataInicio, dataFim);
		this.dataInicio = periodo.dataInicio;
		this.dataFim = periodo.dataFim;
		this.ativo = ativo;
		this.criadoEm = criadoEm;
	}

	// Remove espacos externos e impede nome vazio ou maior que a coluna do banco.
	private static validarNome(nome: string): string {
		if (typeof nome !== "string" || nome.trim() === "") {
			throw new Error("Informe o nome do medicamento.");
		}

		const normalizado = nome.trim();

		if (normalizado.length > Medicamento.NOME_TAMANHO_MAXIMO) {
			throw new Error(`O nome do medicamento pode ter no máximo ${Medicamento.NOME_TAMANHO_MAXIMO} caracteres.`);
		}

		return normalizado;
	}

	// Normaliza datas do banco ou da API para YYYY-MM-DD sem aplicar conversao de fuso.
	private static validarData(data: string | Date, campo: string): string {
		if (data instanceof Date) {
			if (Number.isNaN(data.getTime())) {
				throw new Error(`A ${campo} do tratamento é inválida.`);
			}

			const ano = data.getFullYear().toString().padStart(4, "0");
			const mes = (data.getMonth() + 1).toString().padStart(2, "0");
			const dia = data.getDate().toString().padStart(2, "0");
			return `${ano}-${mes}-${dia}`;
		}

		if (typeof data !== "string") {
			throw new Error(`Informe a ${campo} do tratamento no formato YYYY-MM-DD.`);
		}

		const normalizada = data.trim();
		const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizada);

		if (!partes) {
			throw new Error(`A ${campo} do tratamento deve estar no formato YYYY-MM-DD.`);
		}

		const [ano, mes, dia] = partes.slice(1).map(Number);
		const dataVerificada = new Date(0);
		dataVerificada.setUTCHours(0, 0, 0, 0);
		dataVerificada.setUTCFullYear(ano, mes - 1, dia);

		if (
			dataVerificada.getUTCFullYear() !== ano
			|| dataVerificada.getUTCMonth() !== mes - 1
			|| dataVerificada.getUTCDate() !== dia
		) {
			throw new Error(`A ${campo} do tratamento não é uma data válida.`);
		}

		return normalizada;
	}

	// Garante que o fim do tratamento nao seja anterior ao inicio.
	private static validarPeriodo(
		dataInicio: string | Date,
		dataFim: string | Date | null
	): { dataInicio: string; dataFim: string | null } {
		const inicio = Medicamento.validarData(dataInicio, "data de início");
		const fim = dataFim === null ? null : Medicamento.validarData(dataFim, "data de fim");

		if (fim !== null && fim < inicio) {
			throw new Error("A data de fim não pode ser anterior à data de início do tratamento.");
		}

		return { dataInicio: inicio, dataFim: fim };
	}

	public getId(): number | null {
		return this.id;
	}

	public setId(id: number): void {
		this.id = id;
	}

	public getIdPaciente(): number {
		return this.idPaciente;
	}

	public getNome(): string {
		return this.nome;
	}

	public setNome(nome: string): void {
		this.nome = Medicamento.validarNome(nome);
	}

	public getDosagem(): Dosagem {
		return this.dosagem;
	}

	public setDosagem(dosagem: Dosagem): void {
		this.dosagem = dosagem;
	}

	public getHorarioDose(): HorarioDose {
		return this.horarioDose;
	}

	public setHorarioDose(horarioDose: HorarioDose): void {
		this.horarioDose = horarioDose;
	}

	public getDataInicio(): string {
		return this.dataInicio;
	}

	// Atualiza o inicio somente se ele continuar compativel com a data de fim atual.
	public setDataInicio(dataInicio: string | Date): void {
		const inicio = Medicamento.validarData(dataInicio, "data de início");

		if (this.dataFim !== null && this.dataFim < inicio) {
			throw new Error("A data de início não pode ser posterior à data de fim do tratamento.");
		}

		this.dataInicio = inicio;
	}

	public getDataFim(): string | null {
		return this.dataFim;
	}

	// Fim nulo representa tratamento contínuo; se informado, deve ser após o inicio.
	public setDataFim(dataFim: string | Date | null): void {
		const fim = dataFim === null ? null : Medicamento.validarData(dataFim, "data de fim");

		if (fim !== null && fim < this.dataInicio) {
			throw new Error("A data de fim não pode ser anterior à data de início do tratamento.");
		}

		this.dataFim = fim;
	}

	public estaAtivo(): boolean {
		return this.ativo;
	}

	// Suspender preserva o medicamento e o historico de doses no banco.
	public suspender(): void {
		this.ativo = false;
	}

	public reativar(): void {
		this.ativo = true;
	}

	public getCriadoEm(): Date | null {
		return this.criadoEm;
	}

	// Verdadeiro quando o tratamento tinha data pra acabar e ela ja passou (duvida 6).
	// E diferente de suspenso: aqui ninguem mandou parar, foi o calendario.
	// O dia do fim ainda conta como dia de tratamento.
	public tratamentoEncerradoEm(agora: Date): boolean {
		return this.dataFim !== null && this.dataFim < Medicamento.validarData(agora, "data de hoje");
	}

	// Horarios das doses de agora ate `dias` a frente, ou ate o ultimo dia do tratamento, o que vier antes.
	// So gera do agora pra frente: dose antiga entraria como prevista, viraria perdida
	// e derrubaria a adesao sem motivo.
	public gerarHorariosDaAgenda(agora: Date, dias: number): Date[] {
		return this.gerarHorariosEntre(agora, new Date(agora.getTime() + dias * 24 * Medicamento.MS_POR_HORA));
	}

	// Horarios das doses de `inicio` (inclusive) ate `fim` (exclusive), ou ate o ultimo dia do tratamento.
	// Anda de frequencia em frequencia a partir de dataInicio + horarioInicial, na hora de Brasilia (config/fuso.ts).
	// A grade e sempre a mesma, entao gerar duas vezes o mesmo trecho da os mesmos horarios.
	// O DoseService usa este pra completar a agenda a partir da ultima dose que ja existe (duvida 3).
	public gerarHorariosEntre(inicio: Date, fim: Date): Date[] {
		if (!this.ativo) {
			return [];
		}

		const [ano, mes, dia] = this.dataInicio.split("-").map(Number);
		const [hora, minuto] = this.horarioDose.getHorarioInicial().split(":").map(Number);
		const primeira = new Date(ano, mes - 1, dia, hora, minuto).getTime();
		const passo = this.horarioDose.getFrequenciaHoras() * Medicamento.MS_POR_HORA;

		let limite = fim.getTime();
		if (this.dataFim !== null) {
			// O dia do fim ainda tem dose: o limite e a meia-noite do dia seguinte.
			const [anoFim, mesFim, diaFim] = this.dataFim.split("-").map(Number);
			limite = Math.min(limite, new Date(anoFim, mesFim - 1, diaFim + 1).getTime());
		}

		// Pula direto pra primeira dose que cai do inicio em diante, sem andar desde o comeco do tratamento.
		const pulos = Math.max(0, Math.ceil((inicio.getTime() - primeira) / passo));
		const horarios: Date[] = [];
		for (let horario = primeira + pulos * passo; horario < limite; horario += passo) {
			horarios.push(new Date(horario));
		}

		return horarios;
	}
}

export default Medicamento;
