// Rotas da ficha medica do usuario (tipo sanguineo, alergias, condicoes, contato de emergencia).
// GET /pacientes/:id | POST /pacientes | PUT /pacientes/:id | PATCH /pacientes/:id
import { Router } from "express";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /pacientes exige login. O caminho vai escrito de proposito: todos os routers
// estao montados em /api, e um router.use(autenticar) sem caminho barraria as rotas publicas dos outros.
router.use("/pacientes", autenticar);

export default router;
