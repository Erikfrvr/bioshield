// Rotas da ficha medica do usuario (tipo sanguineo, alergias, condicoes, contato de emergencia).
// GET /pacientes/:id | POST /pacientes | PUT /pacientes/:id | PATCH /pacientes/:id
// POST /pacientes/:id/qr/rotacionar | DELETE /pacientes/:id/qr | POST /pacientes/:id/qr/reativar
// GET /pacientes/:id/acessos | POST /pacientes/:id/codigo
import { Router } from "express";
import * as pacienteController from "../controllers/pacienteController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Tudo em /pacientes exige login. O caminho vai escrito de proposito: todos os routers
// estao montados em /api, e um router.use(autenticar) sem caminho barraria as rotas publicas dos outros.
router.use("/pacientes", autenticar);

router.get("/pacientes/:id", pacienteController.buscarPorId);
router.post("/pacientes", pacienteController.criar);
router.put("/pacientes/:id", pacienteController.atualizar);

router.post("/pacientes/:id/qr/rotacionar", pacienteController.rotacionarQR);
router.delete("/pacientes/:id/qr", pacienteController.cancelarQR);
router.post("/pacientes/:id/qr/reativar", pacienteController.reativarQR);

// Historico da LGPD: quem abriu a ficha publica pelo QR
router.get("/pacientes/:id/acessos", pacienteController.listarAcessos);

// Codigo de autorizacao que o paciente entrega ao cuidador
router.post("/pacientes/:id/codigo", pacienteController.gerarCodigoCuidador);

export default router;
