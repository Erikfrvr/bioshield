// Middleware de autenticacao.
// Le o header "Authorization: Bearer <token>", confere a assinatura do JWT e libera ou barra.
// Se o token for valido, o id do usuario fica em req.idUsuario para o controller usar.
// Qualquer problema com o token vira 401, sem dizer o motivo exato para quem esta tentando entrar.
import { Request, Response, NextFunction } from "express";
import jwtService from "../infrastructure/security/JwtService";

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

  let conteudo;
  try {
    // O verifyToken confere a assinatura e a validade. Token vencido ou adulterado volta null.
    conteudo = jwtService.verifyToken(token);
  } catch (erro) {
    // So cai aqui quando falta o JWT_SECRET. Erro de configuracao do servidor, nao culpa de quem chamou.
    console.error((erro as Error)?.message);
    res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
    return;
  }

  if (!conteudo) {
    res.status(401).json({ mensagem: MENSAGEM_TOKEN_INVALIDO });
    return;
  }

  req.idUsuario = conteudo.id;
  next();
}
