// Rotas de conta: cadastro e login.
// So aponto o caminho pro controller, nenhuma logica mora aqui.
// POST /usuarios (cadastro) | POST /usuarios/login | GET /usuarios/:id
import { Router } from "express";
import * as usuarioController from "../controllers/usuarioController";
import { autenticar } from "../middleware/autenticacao";

const router = Router();

// Cadastro e login ficam abertos, senao ninguem consegue entrar pela primeira vez.
router.post("/usuarios", usuarioController.cadastrar);
router.post("/usuarios/login", usuarioController.entrar);
router.get("/usuarios/:id", autenticar, usuarioController.buscarPorId);

export default router;
