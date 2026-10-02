// Controller das doses.
// Responde a agenda do dia, recebe a confirmacao de dose tomada e devolve o percentual de adesao.
// Atencao: dose tambem e dado de saude, entao nunca logo o corpo inteiro no console aqui.
import { Request, Response } from "express";
import doseService, { ErroDose, TipoErroDose } from "../services/DoseService";
import { ErroAcesso } from "../services/AutorizacaoService";

const STATUS_POR_TIPO: Record<TipoErroDose, number> = {
  validacao: 400,
  nao_encontrado: 404,
};

function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroDose) {
    res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
    return;
  }

  // Logado, mas pedindo dose de paciente que nao e dele nem acompanha
  if (erro instanceof ErroAcesso) {
    res.status(403).json({ mensagem: erro.message });
    return;
  }

  // So o codigo ou o nome do erro. Nada de req.body e nada de erro.message:
  // a mensagem do MySQL as vezes repete o valor que deu problema, e aqui o valor e dado de saude.
  const e = erro as { code?: string; name?: string };
  console.error("Erro inesperado no doseController:", e?.code ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// GET /api/doses/hoje?idPaciente=1
// Sem idPaciente (ou com texto no lugar) o Number() da NaN e o service responde 400.
export async function listarDeHoje(req: Request, res: Response): Promise<void> {
  try {
    const doses = await doseService.listarDeHoje(Number(req.query.idPaciente), req.idUsuario);
    res.status(200).json(doses);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// POST /api/doses/:id/confirmar
export async function confirmar(req: Request, res: Response): Promise<void> {
  try {
    const dose = await doseService.confirmar(Number(req.params.id), req.body, req.idUsuario);
    res.status(200).json(dose);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// GET /api/doses/adesao?idPaciente=1
export async function adesao(req: Request, res: Response): Promise<void> {
  try {
    const resumo = await doseService.calcularAdesao(Number(req.query.idPaciente), req.idUsuario);
    res.status(200).json(resumo);
  } catch (erro) {
    responderErro(res, erro);
  }
}
