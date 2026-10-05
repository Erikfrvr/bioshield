// Rotas da agenda de doses e da confirmacao de que a dose foi tomada.
// GET /doses/hoje | GET /doses/proximas | POST /doses/:id/confirmar | GET /doses/adesao
import { Router } from "express";
import * as doseController from "../controllers/doseController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /doses exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/doses", autenticar);

// Os GET recebem o paciente pela query: /doses/hoje?idPaciente=1
router.get("/doses/hoje", doseController.listarDeHoje);
// Agenda dos proximos dias, que o app usa pra agendar o alarme dos remedios no celular
router.get("/doses/proximas", doseController.listarProximas);
router.get("/doses/adesao", doseController.calcularAdesao);
router.post("/doses/:id/confirmar", doseController.confirmar);

export default router;
