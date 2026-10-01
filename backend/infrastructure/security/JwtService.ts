// Geracao e conferencia do token JWT da sessao.
// E o unico lugar do projeto que conhece o jsonwebtoken. O service usa o generateToken no login
// e o middleware de autenticacao usa o verifyToken em cada requisicao protegida.
import jwt from "jsonwebtoken";

// O que vai dentro do token. So o id do usuario. Nada de email, nome ou dado de saude:
// o JWT e assinado, mas nao e criptografado, qualquer um consegue ler o conteudo dele.
export interface ConteudoToken {
  id: number;
}

export class JwtService {
  private validade: jwt.SignOptions["expiresIn"];

  // Quanto tempo o login vale antes de pedir senha de novo.
  // Sete dias porque o publico e idoso: pedir senha todo dia faz a pessoa desistir do app.
  constructor(validade: jwt.SignOptions["expiresIn"] = "7d") {
    this.validade = validade;
  }

  generateToken(conteudo: ConteudoToken): string {
    return jwt.sign({ id: conteudo.id }, this.segredo(), { expiresIn: this.validade });
  }

  // Confere a assinatura e a validade. Devolve o conteudo quando o token e bom
  // e null quando esta vencido, adulterado ou sem id valido.
  // So joga erro quando falta o JWT_SECRET, que e problema de configuracao do servidor.
  verifyToken(token: string): ConteudoToken | null {
    const segredo = this.segredo();

    try {
      const conteudo = jwt.verify(token, segredo);
      const id = typeof conteudo === "object" ? Number(conteudo.id) : NaN;

      if (!Number.isInteger(id) || id <= 0) {
        return null;
      }
      return { id };
    } catch {
      return null;
    }
  }

  // Leio o segredo na hora do uso, e nao no topo do arquivo, porque o dotenv pode carregar depois do import
  private segredo(): string {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw new Error("JWT_SECRET não está definido no .env.");
    }
    return segredo;
  }
}

const jwtService = new JwtService();
export default jwtService;
