// Rotas de conta: cadastro e login.
// So aponto o caminho pro controller, nenhuma logica mora aqui.
// POST /usuarios (cadastro) | POST /usuarios/login | GET /usuarios/:id
import { Router } from "express";
import * as usuarioController from "../controllers/usuarioController";

const router = Router();

router.post("/usuarios", usuarioController.cadastrar);
router.get("/usuarios/:id", usuarioController.buscarPorId);

export default router;
