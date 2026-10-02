// Controller do modo cuidador.
// Cria o vinculo entre cuidador e paciente e devolve o painel de quem ele acompanha.
// O service e quem checa se o paciente autorizou esse vinculo.
// Atencao: o corpo do vincular traz o codigo de autorizacao, entao nunca logo o corpo inteiro no console aqui.
import { Request, Response } from "express";
import cuidadorService, { ErroCuidador, TipoErroCuidador } from "../services/CuidadorService";
import { ErroAcesso } from "../services/AutorizacaoService";

const STATUS_POR_TIPO: Record<TipoErroCuidador, number> = {
  validacao: 400,
  nao_encontrado: 404,
};

function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroCuidador) {
    res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
    return;
  }

  // Logado, mas pedindo a lista de outro cuidador ou desfazendo um vinculo que nao e dele
  if (erro instanceof ErroAcesso) {
    res.status(403).json({ mensagem: erro.message });
    return;
  }

  // So o codigo ou o nome do erro. Nada de req.body e nada de erro.message:
  // a mensagem do MySQL as vezes repete o valor que deu problema.
  const e = erro as { code?: string; name?: string };
  console.error("Erro inesperado no cuidadorController:", e?.code ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// POST /api/cuidadores/vincular
// O cuidador e quem esta logado (req.idUsuario). O idCuidador do corpo e ignorado pelo service.
export async function vincular(req: Request, res: Response): Promise<void> {
  try {
    const vinculo = await cuidadorService.vincular(req.body, req.idUsuario);
    res.status(201).json(vinculo);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// GET /api/cuidadores/:id/pacientes
export async function listarPacientes(req: Request, res: Response): Promise<void> {
  try {
    const pacientes = await cuidadorService.listarPacientes(Number(req.params.id), req.idUsuario);
    res.status(200).json(pacientes);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// DELETE /api/cuidadores/vinculo/:id
// 204 sem corpo, igual ao DELETE de medicamento. O api.js do front aceita resposta vazia.
export async function desvincular(req: Request, res: Response): Promise<void> {
  try {
    await cuidadorService.desvincular(Number(req.params.id), req.idUsuario);
    res.status(204).end();
  } catch (erro) {
    responderErro(res, erro);
  }
}
