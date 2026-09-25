// Implementacao MySQL do UsuarioRepository.
// Aqui e o unico lugar do projeto onde eu escrevo SQL de usuario.
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import Usuario from "../models/entidade/Usuario";
import Email from "../models/valueObjects/Email";
import Senha from "../models/valueObjects/Senha";
import { UsuarioRepository } from "../repository/UsuarioRepository";

// Formato de uma linha da tabela usuarios, com os nomes das colunas do banco
interface UsuarioLinha extends RowDataPacket {
  id: number;
  nome: string;
  email: string;
  senha: string;
  criado_em: Date;
}

export class UsuarioInfrastructure implements UsuarioRepository {
  async cadastrar(usuario: Usuario): Promise<void> {
    const conexao = await pool.getConnection();
    try {
      const [resultado] = await conexao.query<ResultSetHeader>(
        "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
        [usuario.getNome(), usuario.getEmail().getValor(), usuario.getSenha().getValor()]
      );
      // Devolvo o id gerado pelo banco para dentro da entidade, assim o service ja monta a resposta com ele
      usuario.setId(resultado.insertId);
    } finally {
      conexao.release();
    }
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<UsuarioLinha[]>(
        "SELECT id, nome, email, senha, criado_em FROM usuarios WHERE email = ?",
        [email]
      );
      return linhas.length === 0 ? null : this.paraEntidade(linhas[0]);
    } finally {
      conexao.release();
    }
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const conexao = await pool.getConnection();
    try {
      const [linhas] = await conexao.query<UsuarioLinha[]>(
        "SELECT id, nome, email, senha, criado_em FROM usuarios WHERE id = ?",
        [id]
      );
      return linhas.length === 0 ? null : this.paraEntidade(linhas[0]);
    } finally {
      conexao.release();
    }
  }

  // Transforma a linha do banco na entidade. A senha do banco ja e hash, entao entra pelo aPartirDoHash
  private paraEntidade(linha: UsuarioLinha): Usuario {
    return new Usuario(
      linha.nome,
      new Email(linha.email),
      Senha.aPartirDoHash(linha.senha),
      linha.id,
      linha.criado_em
    );
  }
}

const usuarioInfrastructure = new UsuarioInfrastructure();
export default usuarioInfrastructure;
