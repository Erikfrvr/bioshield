// Rotas da agenda de doses e da confirmacao de que a dose foi tomada.
// GET /doses/hoje | POST /doses/:id/confirmar | GET /doses/adesao
import { Router } from "express";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /doses exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/doses", autenticar);

export default router;
