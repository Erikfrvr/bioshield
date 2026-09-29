// Value object Dosagem: valor e unidade (mg, ml, gota, comprimido).
// Valido que o valor e positivo e que a unidade esta na lista que eu aceito.

// Mesma lista do ENUM de medicamentos.unidade
export const UNIDADES = ["mg", "ml", "g", "gota", "comprimido", "unidade"] as const;
export type Unidade = (typeof UNIDADES)[number];

export class Dosagem {
  // dosagem e DECIMAL(10,2): ate oito digitos antes da virgula e dois depois
  private static readonly VALOR_MAXIMO = 99999999.99;
  private static readonly CASAS_DECIMAIS = 2;

  private readonly valor: number;
  private readonly unidade: Unidade;

  // Valor aceita numero ou texto: o mysql2 devolve DECIMAL como string ("50.00"),
  // e o formulario pode mandar "2,5". Unidade vazia vira "mg", o mesmo DEFAULT do banco.
  constructor(valor: number | string, unidade: string = "mg") {
    this.valor = Dosagem.validarValor(valor);
    this.unidade = Dosagem.validarUnidade(unidade);
  }

  private static validarValor(valor: number | string): number {
    let numero: number;

    if (typeof valor === "number") {
      numero = valor;
    } else if (typeof valor === "string" && valor.trim() !== "") {
      numero = Number(valor.trim().replace(",", "."));
    } else {
      throw new Error("Informe a dosagem do medicamento.");
    }

    if (!Number.isFinite(numero) || numero <= 0) {
      throw new Error("A dosagem precisa ser um número maior que zero.");
    }

    if (numero > Dosagem.VALOR_MAXIMO) {
      throw new Error("A dosagem informada é grande demais.");
    }

    // 0.125 viraria 0.13 no banco sem avisar ninguem. Dose de remedio nao se arredonda escondido.
    if (Number(numero.toFixed(Dosagem.CASAS_DECIMAIS)) !== numero) {
      throw new Error(`A dosagem pode ter no máximo ${Dosagem.CASAS_DECIMAIS} casas decimais.`);
    }

    return numero;
  }

  private static validarUnidade(unidade: string): Unidade {
    if (unidade === null || unidade === undefined || unidade === "") {
      return "mg";
    }

    const normalizada = typeof unidade === "string" ? unidade.trim().toLowerCase() : "";

    if (!(UNIDADES as readonly string[]).includes(normalizada)) {
      throw new Error("Unidade inválida. Use mg, ml, g, gota, comprimido ou unidade.");
    }

    return normalizada as Unidade;
  }

  public getValor(): number {
    return this.valor;
  }

  public getUnidade(): Unidade {
    return this.unidade;
  }

  public igualA(outra: Dosagem): boolean {
    return this.valor === outra.getValor() && this.unidade === outra.getUnidade();
  }

  // "50 mg", "2.5 ml", "1 comprimido". Plural e formatacao bonita ficam com a tela.
  public toString(): string {
    return `${this.valor} ${this.unidade}`;
  }
}

export default Dosagem;
