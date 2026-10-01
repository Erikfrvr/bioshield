// Rotas dos remedios que a pessoa toma.
// GET /medicamentos | POST /medicamentos | PUT /medicamentos/:id | DELETE /medicamentos/:id
import { Router } from "express";
import * as medicamentoController from "../controllers/medicamentoController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /medicamentos exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/medicamentos", autenticar);

// O GET recebe o paciente pela query: /medicamentos?idPaciente=1
router.get("/medicamentos", medicamentoController.listar);
router.post("/medicamentos", medicamentoController.cadastrar);
router.put("/medicamentos/:id", medicamentoController.atualizar);
router.delete("/medicamentos/:id", medicamentoController.apagar);

export default router;
