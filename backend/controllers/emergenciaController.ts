// Controller da ficha de emergencia (rota publica do QR Code).
// Recebe so o token da URL e devolve a ficha reduzida: alergias, remedios em uso, tipo sanguineo e contato.
// Nunca devolvo email, senha, historico completo nem nada que nao ajude a salvar a pessoa naquele momento.
import { Request, Response } from "express";
import emergenciaService, { ErroEmergencia, TipoErroEmergencia } from "../services/EmergenciaService";

// O front tem uma tela diferente para cada caso: 404 e "codigo nao encontrado", 410 e "codigo cancelado".
const STATUS_POR_TIPO: Record<TipoErroEmergencia, number> = {
  nao_encontrado: 404,
  cancelado: 410,
};

// GET /api/emergencia/:token
export async function buscarPorToken(req: Request, res: Response): Promise<void> {
  // Ficha de saude nao pode ficar guardada no cache do navegador nem de servidor intermediario
  res.set("Cache-Control", "no-store");

  try {
    // ip e user agent vao so para o log da LGPD. Os dois podem faltar, e isso nao barra o socorro.
    // Pelo Tailscale Funnel o acesso chega de dentro do proprio computador. O "trust proxy" do server.ts
    // faz o req.ip mostrar o ip de quem escaneou, e nao o 127.0.0.1 do Funnel.
    const ficha = await emergenciaService.buscarPorToken(
      String(req.params.token),
      req.ip ?? null,
      req.get("user-agent") ?? null
    );
    res.status(200).json(ficha);
  } catch (erro) {
    if (erro instanceof ErroEmergencia) {
      res.status(STATUS_POR_TIPO[erro.tipo]).json({ mensagem: erro.message });
      return;
    }

    // So o codigo ou o nome do erro. A mensagem do banco pode repetir dado de saude, e aqui e LGPD.
    const e = erro as { code?: string; name?: string };
    console.error("Erro inesperado no emergenciaController:", e?.code ?? e?.name ?? "desconhecido");
    res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
  }
}
