// Conexao com o MySQL.
// Crio o pool aqui lendo as variaveis do .env e testo a conexao assim que o servidor sobe,
// pra eu descobrir na hora se o banco nao respondeu em vez de quebrar na primeira query.
// Todo mundo que precisa do banco importa esse pool, ninguem abre conexao por conta propria.

import mysql from "mysql2/promise";
import dotenv from "dotenv";

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
