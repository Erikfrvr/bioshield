// Controller da ficha de emergencia (rota publica do QR Code).
// Recebe so o token da URL e devolve a ficha reduzida: alergias, remedios em uso, tipo sanguineo e contato.
// Nunca devolvo email, senha, historico completo nem nada que nao ajude a salvar a pessoa naquele momento.
import { Request, Response } from "express";
import emergenciaService, { ErroEmergencia, TipoErroEmergencia } from "../services/EmergenciaService";

// O front tem uma tela diferente para cada um: 404 e "QR nao existe", 410 e "QR cancelado pelo titular".
const STATUS_POR_TIPO: Record<TipoErroEmergencia, number> = {
  nao_encontrado: 404,
  cancelado: 410,
};

function responderErro(res: Response, erro: unknown): void {
  if (erro instanceof ErroEmergencia) {
    res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
    return;
  }

  // So a mensagem do erro. Nada de token nem de ficha no console: o token abre dado de saude
  console.error("Erro inesperado no emergenciaController:", (erro as Error)?.message);
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
}

// GET /api/emergencia/:token
export async function buscarPorToken(req: Request, res: Response): Promise<void> {
  try {
    // ip e user agent vao so para o log de acesso da LGPD. Se faltarem, o service grava null.
    const ficha = await emergenciaService.buscarPorToken(
      String(req.params.token),
      req.ip ?? null,
      req.get("user-agent") ?? null
    );
    res.status(200).json(ficha);
  } catch (erro) {
    responderErro(res, erro);
  }
}
