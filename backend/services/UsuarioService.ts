// Regra de negocio da conta.
// Aqui eu verifico se o email ja existe, crio os value objects Email e Senha pra validar,
// gero o hash da senha antes de mandar pro banco e monto o DTO de resposta sem a senha.
import bcrypt from "bcryptjs";
import usuarioInfrastructure from "../infrastructure/usuarioInfrastructure";
import Usuario from "../models/entidade/Usuario";
import Email from "../models/valueObjects/Email";
import Senha from "../models/valueObjects/Senha";
import { CadastrarUsuarioDTO } from "../models/dto/usuario/CadastrarUsuarioDTO";
import { LoginUsuarioDTO } from "../models/dto/usuario/LoginUsuarioDTO";
import { UsuarioResponseDTO } from "../models/dto/usuario/UsuarioResponseDTO";
import { UsuarioRepository } from "../repository/UsuarioRepository";

const RODADAS_HASH = 10;

// Tipos de erro que o service conhece. O controller le esse tipo e escolhe o status code,
// assim o service nunca precisa saber nada de HTTP.
export type TipoErroUsuario = "validacao" | "conflito" | "nao_encontrado";

export class ErroUsuario extends Error {
  public readonly tipo: TipoErroUsuario;

  constructor(tipo: TipoErroUsuario, mensagem: string) {
    super(mensagem);
    this.name = "ErroUsuario";
    this.tipo = tipo;
  }
}

export class UsuarioService {
  // O service conhece so a interface. A implementacao MySQL entra pelo construtor.
  private repositorio: UsuarioRepository;

  constructor(repositorio: UsuarioRepository = usuarioInfrastructure) {
    this.repositorio = repositorio;
  }

  async cadastrar(dados: CadastrarUsuarioDTO): Promise<UsuarioResponseDTO> {
    // Primeiro valido tudo com os value objects e a entidade.
    // Qualquer erro aqui e culpa do dado que chegou, entao vira erro de validacao.
    let email: Email;
    let senhaDigitada: Senha;
    try {
      email = new Email(dados?.email);
      senhaDigitada = Senha.criar(dados?.senha);
      // Crio a entidade so para validar o nome antes de gastar tempo com o hash
      new Usuario(dados?.nome, email, senhaDigitada);
    } catch (erro) {
      throw new ErroUsuario("validacao", (erro as Error).message);
    }

    // Email ja cadastrado nao pode entrar de novo
    const existente = await this.repositorio.buscarPorEmail(email.getValor());
    if (existente) {
      throw new ErroUsuario("conflito", "Já existe uma conta com esse email.");
    }

    // A senha so vai pro banco como hash. A senha digitada nao sai deste metodo.
    const hash = await bcrypt.hash(senhaDigitada.getValor(), RODADAS_HASH);
    const usuario = new Usuario(dados.nome, email, Senha.aPartirDoHash(hash));

    try {
      await this.repositorio.cadastrar(usuario);
    } catch (erro) {
      // Se duas pessoas cadastrarem o mesmo email ao mesmo tempo, as duas passam pela checagem de cima,
      // mas o indice unico do banco barra a segunda. Traduzo isso para o mesmo erro de conflito.
      if ((erro as { code?: string })?.code === "ER_DUP_ENTRY") {
        throw new ErroUsuario("conflito", "Já existe uma conta com esse email.");
      }
      throw erro;
    }

    return this.paraResposta(usuario);
  }

  async buscarPorId(id: number): Promise<UsuarioResponseDTO> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroUsuario("validacao", "O id do usuário precisa ser um número inteiro positivo.");
    }

    const usuario = await this.repositorio.buscarPorId(id);
    if (!usuario) {
      throw new ErroUsuario("nao_encontrado", "Usuário não encontrado.");
    }

    return this.paraResposta(usuario);
  }

  // Monta o que sai para o front. Escrevo campo por campo de proposito:
  // se a senha nao esta listada aqui, ela nao tem como vazar.
  private paraResposta(usuario: Usuario): UsuarioResponseDTO {
    return {
      id: usuario.getId() as number,
      nome: usuario.getNome(),
      email: usuario.getEmail().getValor(),
    };
  }
}

const usuarioService = new UsuarioService();
export default usuarioService;
