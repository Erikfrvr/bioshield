// Controller de usuario: recebe a requisicao, entrega pro service e devolve a resposta.
// Aqui eu so trato req e res e os status code, nada de regra de negocio e nada de SQL.
// Cada funcao vai num try catch devolvendo 500 com mensagem clara quando der ruim.
import { Request, Response } from "express";
import usuarioService, { ErroUsuario, TipoErroUsuario } from "../services/UsuarioService";
import { ErroAcesso } from "../services/AutorizacaoService";

// Cada tipo de erro do service vira um status code. Ficou em tabela porque com quatro tipos
// o if encadeado ja estava dificil de ler.
const STATUS_POR_TIPO: Record<TipoErroUsuario, number> = {
  validacao: 400,
  nao_autorizado: 401,
  nao_encontrado: 404,
  conflito: 409,
};

// Traduz o erro que subiu do service para o status code certo.
// Erro que o service nao conhece vira 500, e a mensagem interna nao vai pro front.
function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroUsuario) {
    const status = STATUS_POR_TIPO[erro.tipo];
    res.status(status).json({ mensagem: erro.message });
    return;
  }

  // Logado, mas pedindo dado que nao e dele
  if (erro instanceof ErroAcesso) {
    res.status(403).json({ mensagem: erro.message });
    return;
  }

  // So o codigo ou o nome do erro. Nada de req.body, que pode ter a senha, e nada de erro.message:
  // a mensagem do MySQL as vezes repete o valor que deu problema, e aqui o valor pode ser o email de alguem.
  const e = erro as { code?: string; name?: string };
  console.error("Erro inesperado no usuarioController:", e?.code ?? e?.name ?? "desconhecido");
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

// POST /api/usuarios/login
export async function entrar(req: Request, res: Response): Promise<void> {
  try {
    const sessao = await usuarioService.entrar(req.body);
    res.status(200).json(sessao);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// GET /api/usuarios/:id
export async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const usuario = await usuarioService.buscarPorId(Number(req.params.id), req.idUsuario);
    res.status(200).json(usuario);
  } catch (erro) {
    responderErro(res, erro);
  }
}
