// Controller dos medicamentos cadastrados pelo usuario.
// Listar, cadastrar, editar e apagar remedio. Quem valida dosagem e horario e o service.
// Atencao: remedio tambem e dado de saude, entao nunca logo o corpo inteiro no console aqui.
import { Request, Response } from "express";
import medicamentoService, { ErroMedicamento, TipoErroMedicamento } from "../services/MedicamentoService";
import { ErroAcesso } from "../services/AutorizacaoService";

const STATUS_POR_TIPO: Record<TipoErroMedicamento, number> = {
  validacao: 400,
  nao_encontrado: 404,
};

function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroMedicamento) {
    res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
    return;
  }

  // Logado, mas mexendo em remedio de ficha que nao e dele
  if (erro instanceof ErroAcesso) {
    res.status(403).json({ mensagem: erro.message });
    return;
  }

  // So o codigo ou o nome do erro. Nada de req.body e nada de erro.message:
  // a mensagem do MySQL as vezes repete o valor que deu problema, e aqui o valor e dado de saude.
  const e = erro as { code?: string; name?: string };
  console.error("Erro inesperado no medicamentoController:", e?.code ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// GET /api/medicamentos?idPaciente=1
// Sem idPaciente (ou com texto no lugar) o Number() da NaN e o service responde 400.
export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const medicamentos = await medicamentoService.listarPorPaciente(Number(req.query.idPaciente), req.idUsuario);
    res.status(200).json(medicamentos);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// POST /api/medicamentos
export async function cadastrar(req: Request, res: Response): Promise<void> {
  try {
    const medicamento = await medicamentoService.cadastrar(req.body, req.idUsuario);
    res.status(201).json(medicamento);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// PUT /api/medicamentos/:id
export async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    const medicamento = await medicamentoService.atualizar(Number(req.params.id), req.body, req.idUsuario);
    res.status(200).json(medicamento);
  } catch (erro) {
    responderErro(res, erro);
  }
}

// DELETE /api/medicamentos/:id
// 204 sem corpo: o remedio sumiu e nao tem o que devolver. O api.js do front aceita resposta vazia.
export async function apagar(req: Request, res: Response): Promise<void> {
  try {
    await medicamentoService.apagar(Number(req.params.id), req.idUsuario);
    res.status(204).end();
  } catch (erro) {
    responderErro(res, erro);
  }
}
