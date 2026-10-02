// Ponto de entrada da API.
// Aqui eu subo o Express, carrego o .env, ligo o cors e o parse de json,
// e registro todas as rotas embaixo do prefixo /api.
// Regra minha: server.ts nao tem regra de negocio, so liga as pecas.

// Primeiro import de todos: acerta o fuso do Node antes de qualquer arquivo montar data.
import "./config/fuso";
import express, { NextFunction, Request, Response } from "express";
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

// Tratador de erro geral. Tem que ficar depois das rotas e ter os quatro parametros, senao o Express nao reconhece.
// Sem ele, um JSON quebrado faz o Express escrever no console um pedaco do corpo da requisicao,
// que pode ser dado de saude, e devolver para o cliente os caminhos das pastas do servidor.
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = erro as { type?: string; name?: string };

  if (e?.type === "entity.parse.failed") {
    res.status(400).json({ mensagem: "O corpo da requisição não é um JSON válido." });
    return;
  }

  if (e?.type === "entity.too.large") {
    res.status(413).json({ mensagem: "O corpo da requisição é grande demais." });
    return;
  }

  // So o tipo ou o nome do erro, nunca a mensagem nem o corpo
  console.error("Erro nao tratado no servidor:", e?.type ?? e?.name ?? "desconhecido");
  res.status(500).json({ mensagem: "Erro interno ao processar a requisição. Tente novamente." });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
