// Value object TokenQR: o codigo aleatorio que vai dentro do QR Code.
// Tem que ser grande e imprevisivel, porque quem tiver o token ve a ficha de emergencia sem login.
// Guardo tambem a data de criacao pra eu poder invalidar e gerar outro quando o usuario pedir.
import { randomBytes } from "crypto";

export class TokenQR {
  // 16 bytes aleatorios viram 32 caracteres hexadecimais, o tamanho exato de pacientes.token_qr CHAR(32).
  // Sao 128 bits: ninguem acha a ficha de outra pessoa chutando token.
  private static readonly BYTES = 16;
  private static readonly FORMATO = /^[0-9a-f]{32}$/;

  private readonly valor: string;
  private readonly geradoEm: Date;

  private constructor(valor: string, geradoEm: Date) {
    this.valor = valor;
    this.geradoEm = geradoEm;
  }

  // Token novo, na criacao da ficha e na rotacao do QR.
  // Uso o crypto do Node e nao Math.random, que e previsivel e nao serve pra segredo.
  public static gerar(): TokenQR {
    return new TokenQR(randomBytes(TokenQR.BYTES).toString("hex"), new Date());
  }

  // Token que ja existe: veio do banco ou chegou na URL da emergencia.
  // Valido o formato antes de ir pro banco, assim lixo na URL nem vira consulta.
  public static aPartirDoValor(valor: string, geradoEm: Date = new Date()): TokenQR {
    if (typeof valor !== "string" || !TokenQR.FORMATO.test(valor.trim().toLowerCase())) {
      throw new Error("O código do QR é inválido.");
    }

    return new TokenQR(valor.trim().toLowerCase(), geradoEm);
  }

  public getValor(): string {
    return this.valor;
  }

  public getGeradoEm(): Date {
    return this.geradoEm;
  }
}

export default TokenQR;
