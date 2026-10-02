// Rotas da agenda de doses e da confirmacao de que a dose foi tomada.
// GET /doses/hoje | POST /doses/:id/confirmar | GET /doses/adesao
import { Router } from "express";
import * as doseController from "../controllers/doseController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /doses exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/doses", autenticar);

// Os dois GET recebem o paciente pela query: /doses/hoje?idPaciente=1
router.get("/doses/hoje", doseController.listarDeHoje);
router.get("/doses/adesao", doseController.adesao);
router.post("/doses/:id/confirmar", doseController.confirmar);

export default router;
