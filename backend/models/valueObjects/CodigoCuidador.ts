// Value object CodigoCuidador: o codigo de autorizacao que o paciente entrega ao cuidador.
// Sao 7 caracteres, do tamanho de pacientes.codigo_cuidador CHAR(7), e ele vale por um tempo curto.
// E esse codigo que prova que o paciente autorizou o vinculo, entao sorteio com o crypto do Node.
import { randomInt } from "crypto";

export class CodigoCuidador {
  private static readonly TAMANHO = 7;
  // Sem 0, O, 1, I e L: o codigo e ditado por telefone ou copiado a mao, e esses se confundem.
  private static readonly ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  // Na entrada aceito qualquer letra ou numero, porque o banco pode ter codigo antigo fora do alfabeto de cima.
  private static readonly FORMATO = /^[A-Z0-9]{7}$/;
  // Um dia: da tempo de passar o codigo pro familiar e nao deixa ele valendo pra sempre.
  private static readonly VALIDADE_HORAS = 24;

  private readonly valor: string;
  private readonly validoAte: Date;

  private constructor(valor: string, validoAte: Date) {
    this.valor = valor;
    this.validoAte = validoAte;
  }

  // Codigo novo, quando o paciente pede. randomInt e nao Math.random, que e previsivel.
  public static gerar(agora: Date = new Date()): CodigoCuidador {
    let valor = "";
    for (let i = 0; i < CodigoCuidador.TAMANHO; i++) {
      valor += CodigoCuidador.ALFABETO[randomInt(CodigoCuidador.ALFABETO.length)];
    }

    const validoAte = new Date(agora.getTime() + CodigoCuidador.VALIDADE_HORAS * 60 * 60 * 1000);
    return new CodigoCuidador(valor, validoAte);
  }

  // Codigo que ja existe: veio do banco ou foi digitado pelo cuidador.
  // Aceita minusculo e espaco em volta, que e como a pessoa costuma digitar.
  public static aPartirDoValor(valor: string, validoAte: Date): CodigoCuidador {
    if (typeof valor !== "string" || !CodigoCuidador.FORMATO.test(valor.trim().toUpperCase())) {
      throw new Error("O código do cuidador é inválido. Ele tem 7 letras e números.");
    }
    if (!(validoAte instanceof Date) || Number.isNaN(validoAte.getTime())) {
      throw new Error("A validade do código do cuidador é inválida.");
    }

    return new CodigoCuidador(valor.trim().toUpperCase(), validoAte);
  }

  public estaVencido(agora: Date = new Date()): boolean {
    return agora.getTime() > this.validoAte.getTime();
  }

  public getValor(): string {
    return this.valor;
  }

  public getValidoAte(): Date {
    return this.validoAte;
  }
}

export default CodigoCuidador;
