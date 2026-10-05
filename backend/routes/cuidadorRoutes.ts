// Rotas do modo cuidador: vincular um familiar a um paciente e listar quem ele acompanha.
// POST /cuidadores/vincular | GET /cuidadores/:id/pacientes | GET /cuidadores/:id/alertas
// DELETE /cuidadores/vinculo/:id
import { Router } from "express";
import * as cuidadorController from "../controllers/cuidadorController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /cuidadores exige login. Caminho escrito de proposito, ver pacienteRoutes.
router.use("/cuidadores", autenticar);

router.post("/cuidadores/vincular", cuidadorController.vincular);
// :id aqui e o usuario cuidador, e precisa ser o de quem esta logado
router.get("/cuidadores/:id/pacientes", cuidadorController.listarPacientes);
// Doses perdidas de quem o cuidador acompanha, para o aviso no celular dele
router.get("/cuidadores/:id/alertas", cuidadorController.listarAlertas);
// :id aqui e o vinculo (cuidador_paciente.id)
router.delete("/cuidadores/vinculo/:id", cuidadorController.desvincular);

export default router;
