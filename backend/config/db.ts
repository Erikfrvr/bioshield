// Conexao com o MySQL.
// Crio o pool aqui lendo as variaveis do .env e testo a conexao assim que o servidor sobe,
// pra eu descobrir na hora se o banco nao respondeu em vez de quebrar na primeira query.
// Todo mundo que precisa do banco importa esse pool, ninguem abre conexao por conta propria.

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { FUSO_DESLOCAMENTO } from "./fuso";

// quiet: sem isso o dotenv escreve uma propaganda no terminal a cada vez que carrega o .env
dotenv.config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Como o mysql2 converte o Date do JavaScript para DATETIME e TIMESTAMP, e de volta.
  // Fixo em Brasilia para nao depender do fuso da maquina onde o backend roda.
  timezone: FUSO_DESLOCAMENTO,
});

// O relogio do proprio MySQL: NOW(), CURDATE(), CURRENT_TIMESTAMP e a leitura das colunas TIMESTAMP.
// Roda uma vez em cada conexao nova do pool, antes de qualquer consulta dela.
// pool.pool e o pool de baixo do mysql2, que e quem avisa quando uma conexao nasce.
pool.pool.on("connection", (conexao) => {
  conexao.query("SET time_zone = ?", [FUSO_DESLOCAMENTO], (erro) => {
    if (erro) {
      console.error("Nao foi possivel acertar o fuso da conexao com o MySQL:", erro.code ?? erro.name);
    }
  });
});

async function testarConexao(): Promise<void> {
  try {
    const conexao = await pool.getConnection();
    console.log("Conexao com o banco MySQL estabelecida com sucesso.");
    conexao.release();
  } catch (erro) {
    // So o codigo do erro e uma dica do que conferir. O erro inteiro enchia o terminal sem ajudar.
    const codigo = (erro as { code?: string })?.code ?? "desconhecido";
    console.error(`Nao foi possivel conectar ao banco MySQL (${codigo}).`);
    if (codigo === "ECONNREFUSED") {
      console.error("  O MySQL nao esta ligado. No XAMPP, clique em Start na linha do MySQL.");
      if (process.env.DB_HOST === "localhost") {
        console.error("  Se ele ja estiver ligado, troque DB_HOST=localhost por DB_HOST=127.0.0.1 no .env.");
      }
    } else if (codigo === "ER_ACCESS_DENIED_ERROR") {
      console.error("  Usuario ou senha do banco errados. Confira DB_USER e DB_PASSWORD no .env.");
    } else if (codigo === "ER_BAD_DB_ERROR") {
      console.error("  O banco nao existe. Rode o database/bioshield.sql e depois o database/dados_ficticios.sql.");
    }
  }
}

// Usado pelo /api/status: o servidor pode estar de pe com o banco desligado, e ai nada carrega.
// ping nao e consulta de dado, so pergunta ao MySQL se ele esta ouvindo.
// Tem limite de tempo porque o front espera o /api/status por pouco tempo: banco travado
// nao pode fazer o servidor inteiro parecer desligado.
const LIMITE_PING_MS = 1500;

export async function bancoRespondendo(): Promise<boolean> {
  const ping = (async () => {
    const conexao = await pool.getConnection();
    try {
      await conexao.ping();
      return true;
    } finally {
      conexao.release();
    }
  })().catch(() => false);

  let relogio: NodeJS.Timeout | undefined;
  const limite = new Promise<boolean>((resolver) => {
    relogio = setTimeout(() => resolver(false), LIMITE_PING_MS);
  });

  try {
    return await Promise.race([ping, limite]);
  } finally {
    clearTimeout(relogio);
  }
}

testarConexao();

export default pool;
