// Controller de usuario: recebe a requisicao, entrega pro service e devolve a resposta.
// Aqui eu so trato req e res e os status code, nada de regra de negocio e nada de SQL.
// Cada funcao vai num try catch devolvendo 500 com mensagem clara quando der ruim.
import { Request, Response } from "express";
import usuarioService, { ErroUsuario } from "../services/UsuarioService";

// Traduz o erro que subiu do service para o status code certo.
// Erro que o service nao conhece vira 500, e a mensagem interna nao vai pro front.
function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroUsuario) {
    const status = erro.tipo === "validacao" ? 400 : erro.tipo === "conflito" ? 409 : 404;
    res.status(status).json({ mensagem: erro.message });
    return;
  }

  // Logo so a mensagem do erro, nunca o corpo da requisicao, porque ele pode ter a senha
  console.error("Erro inesperado no usuarioController:", (erro as Error)?.message);
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// POST /api/usuarios
export async function cadastrar(req: Request, res: Response): Promise<void> {
  try {
    const usuario = await usuarioService.cadastrar(req.body);
    res.status(201).json(usuario);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// GET /api/usuarios/:id
export async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const usuario = await usuarioService.buscarPorId(Number(req.params.id));
    res.status(200).json(usuario);
  } catch (erro) {
    responderErro(res, erro);
  }
}
