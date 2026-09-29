// Entidade Alergia: uma alergia do paciente, com a substancia e o grau de gravidade.
// Fica separada porque um paciente pode ter varias e elas aparecem em destaque na ficha de emergencia.

// Mesma lista do ENUM de alergias.gravidade
export const GRAVIDADES = ["leve", "moderada", "grave"] as const;
export type Gravidade = (typeof GRAVIDADES)[number];

export class Alergia {
  // Limites das colunas substancia VARCHAR(100) e observacao VARCHAR(200)
  private static readonly SUBSTANCIA_TAMANHO_MAXIMO = 100;
  private static readonly OBSERVACAO_TAMANHO_MAXIMO = 200;

  private id: number | null;
  private substancia: string;
  private gravidade: Gravidade;
  private observacao: string | null;

  // Gravidade vazia vira "moderada", o mesmo DEFAULT do banco.
  constructor(
    substancia: string,
    gravidade: string = "moderada",
    observacao: string | null = null,
    id: number | null = null
  ) {
    this.id = id;
    this.substancia = Alergia.validarSubstancia(substancia);
    this.gravidade = Alergia.validarGravidade(gravidade);
    this.observacao = Alergia.validarObservacao(observacao);
  }

  private static validarSubstancia(substancia: string): string {
    if (typeof substancia !== "string" || substancia.trim() === "") {
      throw new Error("Informe a substância da alergia.");
    }

    const normalizada = substancia.trim();

    if (normalizada.length > Alergia.SUBSTANCIA_TAMANHO_MAXIMO) {
      throw new Error(`A substância pode ter no máximo ${Alergia.SUBSTANCIA_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizada;
  }

  private static validarGravidade(gravidade: string): Gravidade {
    if (gravidade === null || gravidade === undefined || gravidade === "") {
      return "moderada";
    }

    const normalizada = typeof gravidade === "string" ? gravidade.trim().toLowerCase() : "";

    if (!(GRAVIDADES as readonly string[]).includes(normalizada)) {
      throw new Error("A gravidade da alergia precisa ser leve, moderada ou grave.");
    }

    return normalizada as Gravidade;
  }

  // Observacao e opcional: vazio vira null pra nao gravar string vazia no banco
  private static validarObservacao(observacao: string | null): string | null {
    if (observacao === null || observacao === undefined) {
      return null;
    }

    if (typeof observacao !== "string") {
      throw new Error("A observação da alergia precisa ser um texto.");
    }

    const normalizada = observacao.trim();

    if (normalizada.length > Alergia.OBSERVACAO_TAMANHO_MAXIMO) {
      throw new Error(`A observação da alergia pode ter no máximo ${Alergia.OBSERVACAO_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizada === "" ? null : normalizada;
  }

  public getId(): number | null {
    return this.id;
  }

  public setId(id: number): void {
    this.id = id;
  }

  public getSubstancia(): string {
    return this.substancia;
  }

  public getGravidade(): Gravidade {
    return this.gravidade;
  }

  public getObservacao(): string | null {
    return this.observacao;
  }

  public ehGrave(): boolean {
    return this.gravidade === "grave";
  }
}

export default Alergia;
