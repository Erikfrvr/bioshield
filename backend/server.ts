// Ponto de entrada da API.
// Aqui eu subo o Express, carrego o .env, ligo o cors e o parse de json,
// e registro todas as rotas embaixo do prefixo /api.
// Regra minha: server.ts nao tem regra de negocio, so liga as pecas.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./config/db";
import usuarioRoutes from "./routes/usuarioRoutes";
import pacienteRoutes from "./routes/pacienteRoutes";
import emergenciaRoutes from "./routes/emergenciaRoutes";
import medicamentoRoutes from "./routes/medicamentoRoutes";
import doseRoutes from "./routes/doseRoutes";
import cuidadorRoutes from "./routes/cuidadorRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json({ status: "ok" });
});

// Todos os routers ficam registrados aqui de uma vez, mesmo os que ainda estao vazios.
// Cada router ja escreve o caminho completo (/usuarios, /pacientes...), entao o prefixo e so /api.
// Quem for criar rota nova mexe so no arquivo de rotas dele, nao precisa abrir o server.ts.
app.use("/api", usuarioRoutes);
app.use("/api", pacienteRoutes);
app.use("/api", emergenciaRoutes);
app.use("/api", medicamentoRoutes);
app.use("/api", doseRoutes);
app.use("/api", cuidadorRoutes);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
