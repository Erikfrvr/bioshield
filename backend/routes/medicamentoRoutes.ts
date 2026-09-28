// Rotas dos remedios que a pessoa toma.
// GET /medicamentos | POST /medicamentos | PUT /medicamentos/:id | DELETE /medicamentos/:id
import { Router } from "express";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /medicamentos exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/medicamentos", autenticar);

export default router;
