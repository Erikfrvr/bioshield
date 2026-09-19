// Ponto de entrada da API.
// Aqui eu subo o Express, carrego o .env, ligo o cors e o parse de json,
// e registro todas as rotas embaixo do prefixo /api.
// Regra minha: server.ts nao tem regra de negocio, so liga as pecas.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./config/db";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
