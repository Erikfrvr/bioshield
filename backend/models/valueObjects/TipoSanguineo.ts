// Value object TipoSanguineo: so aceito os oito tipos validos, tipo A positivo ou O negativo.
// Se vier qualquer coisa fora da lista, jogo erro. Esse dado aparece na emergencia, nao pode estar errado.

// Mesma lista do ENUM de pacientes.tipo_sanguineo
export const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type ValorTipoSanguineo = (typeof TIPOS_SANGUINEOS)[number];

export class TipoSanguineo {
  private readonly valor: ValorTipoSanguineo;

  // Aceita "o+", " AB- " e afins. Nao aceita "0+" com zero: prefiro barrar a adivinhar.
  constructor(tipo: string) {
    if (typeof tipo !== "string" || tipo.trim() === "") {
      throw new Error("O tipo sanguíneo é obrigatório.");
    }

    const normalizado = tipo.trim().toUpperCase();

    if (!(TIPOS_SANGUINEOS as readonly string[]).includes(normalizado)) {
      throw new Error("Tipo sanguíneo inválido. Use A+, A-, B+, B-, AB+, AB-, O+ ou O-.");
    }

    this.valor = normalizado as ValorTipoSanguineo;
  }

  // Tipo sanguineo e opcional na ficha: muita gente nao sabe o proprio.
  // Vazio ou null vira null, qualquer outra coisa passa pela validacao.
  public static opcional(tipo: string | null | undefined): TipoSanguineo | null {
    if (tipo === null || tipo === undefined || (typeof tipo === "string" && tipo.trim() === "")) {
      return null;
    }
    return new TipoSanguineo(tipo);
  }

  public getValor(): ValorTipoSanguineo {
    return this.valor;
  }

  public igualA(outro: TipoSanguineo): boolean {
    return this.valor === outro.getValor();
  }

  public toString(): string {
    return this.valor;
  }
}

export default TipoSanguineo;
