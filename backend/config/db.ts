// Conexao com o MySQL.
// Crio o pool aqui lendo as variaveis do .env e testo a conexao assim que o servidor sobe,
// pra eu descobrir na hora se o banco nao respondeu em vez de quebrar na primeira query.
// Todo mundo que precisa do banco importa esse pool, ninguem abre conexao por conta propria.

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { FUSO_DESLOCAMENTO } from "./fuso";

dotenv.config();

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
    console.error("Nao foi possivel conectar ao banco MySQL:", erro);
  }
}

testarConexao();

export default pool;
