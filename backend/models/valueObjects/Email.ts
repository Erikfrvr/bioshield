// Value object Email: valida o formato no construtor e guarda sempre em minusculo e sem espaco.
// Se o email for invalido eu jogo erro ali mesmo, assim nunca entra email quebrado no banco.

export class Email {
  // O limite bate com a coluna email VARCHAR(120) da tabela usuarios
  private static readonly TAMANHO_MAXIMO = 120;

  // Formato basico: algo antes do @, um dominio, um ponto e pelo menos duas letras no final
  // Nao tento cobrir todos os casos da norma, so barrar o que claramente nao e email
  private static readonly FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  private readonly valor: string;

  constructor(email: string) {
    if (typeof email !== "string" || email.trim() === "") {
      throw new Error("O email é obrigatório.");
    }

    const normalizado = email.trim().toLowerCase();

    if (normalizado.length > Email.TAMANHO_MAXIMO) {
      throw new Error(`O email pode ter no máximo ${Email.TAMANHO_MAXIMO} caracteres.`);
    }

    if (!Email.FORMATO.test(normalizado)) {
      throw new Error("O email informado não é válido.");
    }

    this.valor = normalizado;
  }

  public getValor(): string {
    return this.valor;
  }

  // Compara pelo valor, porque dois objetos Email com o mesmo texto sao o mesmo email.
  public igualA(outro: Email): boolean {
    return this.valor === outro.getValor();
  }

  public toString(): string {
    return this.valor;
  }
}

export default Email;
