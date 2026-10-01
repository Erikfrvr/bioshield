// Rota publica que o QR Code abre.
// Essa aqui e a unica que nao pede login, porque quem escaneia e um estranho socorrendo a pessoa.
// GET /emergencia/:token
import { Router } from "express";
import * as emergenciaController from "../controllers/emergenciaController";

const router = Router();

// Sem o middleware autenticar, de proposito. Nao coloque router.use(autenticar) neste arquivo.
router.get("/emergencia/:token", emergenciaController.buscarPorToken);

export default router;
