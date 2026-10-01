// Rota publica que o QR Code abre.
// Essa aqui e a unica que nao pede login, porque quem escaneia e um estranho socorrendo a pessoa.
// GET /emergencia/:token
import { Router } from "express";
import * as emergenciaController from "../controllers/emergenciaController";

const router = Router();

// Sem o autenticar de proposito: quem escaneia nao tem conta.
router.get("/emergencia/:token", emergenciaController.buscarPorToken);

export default router;
