// Rotas do modo cuidador: vincular um familiar a um paciente e listar quem ele acompanha.
// POST /cuidadores/vincular | GET /cuidadores/:id/pacientes | DELETE /cuidadores/vinculo/:id
import { Router } from "express";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /cuidadores exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/cuidadores", autenticar);

export default router;
