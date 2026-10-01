// Controller da ficha medica.
// Pega o corpo da requisicao, monta o DTO e chama o PacienteService.
// Atencao: dado de saude e sensivel, entao nunca logo o corpo inteiro no console aqui.
import { Request, Response } from "express";
import pacienteService, { ErroPaciente, TipoErroPaciente } from "../services/PacienteService";
import { ErroAcesso } from "../services/AutorizacaoService";

const STATUS_POR_TIPO: Record<TipoErroPaciente, number> = {
  validacao: 400,
  nao_encontrado: 404,
  conflito: 409,
};

function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroPaciente) {
    res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
    return;
  }

  // Logado, mas mexendo em ficha que nao e dele
  if (erro instanceof ErroAcesso) {
    res.status(403).json({ mensagem: erro.message });
    return;
  }

  // So o codigo ou o nome do erro. Nada de req.body e nada de erro.message:
  // a mensagem do MySQL as vezes repete o valor que deu problema, e aqui o valor e dado de saude.
  const e = erro as { code?: string; name?: string };
  console.error("Erro inesperado no pacienteController:", e?.code ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// GET /api/pacientes/:id
export async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const ficha = await pacienteService.buscarPorId(Number(req.params.id), req.idUsuario);
    res.status(200).json(ficha);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// POST /api/pacientes
export async function criar(req: Request, res: Response): Promise<void> {
  try {
    const ficha = await pacienteService.criar(req.body, req.idUsuario);
    res.status(201).json(ficha);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// PUT /api/pacientes/:id
export async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    const ficha = await pacienteService.atualizar(Number(req.params.id), req.body, req.idUsuario);
    res.status(200).json(ficha);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// POST /api/pacientes/:id/qr/rotacionar
export async function rotacionarQR(req: Request, res: Response): Promise<void> {
  try {
    const qr = await pacienteService.rotacionarQR(Number(req.params.id), req.idUsuario);
    res.status(200).json(qr);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// DELETE /api/pacientes/:id/qr
export async function cancelarQR(req: Request, res: Response): Promise<void> {
  try {
    const qr = await pacienteService.cancelarQR(Number(req.params.id), req.idUsuario);
    res.status(200).json(qr);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// POST /api/pacientes/:id/qr/reativar
export async function reativarQR(req: Request, res: Response): Promise<void> {
  try {
    const qr = await pacienteService.reativarQR(Number(req.params.id), req.idUsuario);
    res.status(200).json(qr);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// GET /api/pacientes/:id/acessos
export async function listarAcessos(req: Request, res: Response): Promise<void> {
  try {
    const acessos = await pacienteService.listarAcessos(Number(req.params.id), req.idUsuario);
    res.status(200).json(acessos);
  } catch (erro) {
    responderErro(res, erro);
  }
}
