// Middleware de autenticacao.
// Le o header "Authorization: Bearer <token>", confere a assinatura do JWT e libera ou barra.
// Se o token for valido, o id do usuario fica em req.idUsuario para o controller usar.
// Qualquer problema com o token vira 401, sem dizer o motivo exato para quem esta tentando entrar.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Ensina o TypeScript que o Request do Express agora carrega o id do usuario logado.
declare global {
  namespace Express {
    interface Request {
      idUsuario?: number;
    }
  }
}

const MENSAGEM_SEM_TOKEN = "Você precisa estar logado para acessar isso.";
const MENSAGEM_TOKEN_INVALIDO = "Sua sessão expirou ou é inválida. Entre de novo.";

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    res.status(401).json({ mensagem: MENSAGEM_SEM_TOKEN });
    return;
  }

  const token = cabecalho.slice("Bearer ".length).trim();

  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    // Erro de configuracao do servidor, nao culpa de quem chamou.
    console.error("JWT_SECRET não está definido no .env.");
    res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
    return;
  }

  try {
    // O verify confere a assinatura e a validade. Token vencido ou adulterado cai no catch.
    const conteudo = jwt.verify(token, segredo);
    const id = typeof conteudo === "object" ? Number(conteudo.id) : NaN;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(401).json({ mensagem: MENSAGEM_TOKEN_INVALIDO });
      return;
    }

    req.idUsuario = id;
    next();
  } catch {
    res.status(401).json({ mensagem: MENSAGEM_TOKEN_INVALIDO });
  }
}
