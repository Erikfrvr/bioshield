// Value object Telefone: limpa a mascara, checa o DDD e o tamanho.
// Uso no contato de emergencia, porque numero errado ali significa ninguem sendo avisado.

export class Telefone {
  // DDD de dois digitos, nenhum deles zero (11 a 99). Nao existe DDD 01, 20, 30...
  private static readonly DDD = /^[1-9][1-9]$/;

  private readonly valor: string;

  // Aceita "(11) 98765-4321", "11 98765 4321" ou "11987654321". Guarda so os digitos,
  // que e o que cabe em contatos_emergencia.telefone VARCHAR(11). Quem formata e a tela.
  constructor(telefone: string) {
    if (typeof telefone !== "string" || telefone.trim() === "") {
      throw new Error("O telefone do contato é obrigatório.");
    }

    const digitos = telefone.replace(/\D/g, "");

    // 10 digitos e fixo (DDD + 8), 11 e celular (DDD + 9 + 8)
    if (digitos.length !== 10 && digitos.length !== 11) {
      throw new Error("O telefone precisa ter DDD e número, com 10 ou 11 dígitos.");
    }

    if (!Telefone.DDD.test(digitos.slice(0, 2))) {
      throw new Error("O DDD do telefone não é válido.");
    }

    // Todo celular brasileiro comeca com 9 depois do DDD
    if (digitos.length === 11 && digitos[2] !== "9") {
      throw new Error("Celular com 11 dígitos precisa começar com 9 depois do DDD.");
    }

    this.valor = digitos;
  }

  public getValor(): string {
    return this.valor;
  }

  public igualA(outro: Telefone): boolean {
    return this.valor === outro.getValor();
  }

  public toString(): string {
    return this.valor;
  }
}

export default Telefone;
