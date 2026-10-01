// Regra de negocio da conta.
// Aqui eu verifico se o email ja existe, crio os value objects Email e Senha pra validar,
// gero o hash da senha antes de mandar pro banco e monto o DTO de resposta sem a senha.
// No login eu comparo a senha digitada com o hash do banco e gero o token JWT da sessao.
import usuarioInfrastructure from "../infrastructure/usuarioInfrastructure";
import passwordHasherPadrao, { PasswordHasher } from "../infrastructure/security/PasswordHasher";
import jwtServicePadrao, { JwtService } from "../infrastructure/security/JwtService";
import Usuario from "../models/entidade/Usuario";
import Email from "../models/valueObjects/Email";
import Senha from "../models/valueObjects/Senha";
import { CadastrarUsuarioDTO } from "../models/dto/usuario/CadastrarUsuarioDTO";
import { LoginUsuarioDTO } from "../models/dto/usuario/LoginUsuarioDTO";
import { UsuarioResponseDTO } from "../models/dto/usuario/UsuarioResponseDTO";
import { LoginResponseDTO } from "../models/dto/usuario/LoginResponseDTO";
import { UsuarioRepository } from "../repository/UsuarioRepository";
import autorizacaoService from "./AutorizacaoService";

// Mensagem unica para email que nao existe e senha errada. Se eu falasse "email nao cadastrado",
// qualquer um descobriria quem tem conta no app so testando emails.
const MENSAGEM_LOGIN_INVALIDO = "Email ou senha não conferem.";

// Tipos de erro que o service conhece. O controller le esse tipo e escolhe o status code,
// assim o service nunca precisa saber nada de HTTP.
export type TipoErroUsuario = "validacao" | "conflito" | "nao_encontrado" | "nao_autorizado";

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

  // Hash e JWT moram em infrastructure/security. O service so chama, nao conhece bcrypt nem jsonwebtoken.
  private passwordHasher: PasswordHasher;
  private jwtService: JwtService;

  // Hash de uma senha que ninguem usa. Quando o email nao existe eu comparo com ele mesmo assim,
  // pra resposta demorar o mesmo tempo nos dois casos e o tempo nao entregar se o email tem conta.
  private hashFalso: Promise<string>;

  constructor(
    repositorio: UsuarioRepository = usuarioInfrastructure,
    passwordHasher: PasswordHasher = passwordHasherPadrao,
    jwtService: JwtService = jwtServicePadrao
  ) {
    this.repositorio = repositorio;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
    this.hashFalso = this.passwordHasher.hashPassword("senha_que_ninguem_usa_1");
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
    const hash = await this.passwordHasher.hashPassword(senhaDigitada.getValor());
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

  async entrar(dados: LoginUsuarioDTO): Promise<LoginResponseDTO> {
    const emailDigitado = dados?.email;
    const senhaDigitada = dados?.senha;

    // Campo faltando e erro de preenchimento, entao vira 400 com mensagem direta.
    if (typeof emailDigitado !== "string" || emailDigitado.trim() === "") {
      throw new ErroUsuario("validacao", "O email é obrigatório.");
    }
    if (typeof senhaDigitada !== "string" || senhaDigitada === "") {
      throw new ErroUsuario("validacao", "A senha é obrigatória.");
    }

    // No login a senha NAO passa pelo Senha.criar. As regras de forca valem para senha nova,
    // e uma conta antiga criada antes de uma regra mudar precisa continuar entrando.
    // O Email eu uso so para normalizar; se o formato for invalido, nao existe conta com ele.
    let email: Email | null = null;
    try {
      email = new Email(emailDigitado);
    } catch {
      email = null;
    }

    const usuario: Usuario | null = email ? await this.repositorio.buscarPorEmail(email.getValor()) : null;

    const hashGuardado = usuario ? usuario.getSenha().getValor() : await this.hashFalso;
    const senhaConfere = await this.passwordHasher.comparePasswords(senhaDigitada, hashGuardado);

    if (!usuario || !senhaConfere) {
      throw new ErroUsuario("nao_autorizado", MENSAGEM_LOGIN_INVALIDO);
    }

    const idUsuario = usuario.getId() as number;
    const idPaciente = await this.repositorio.buscarIdPaciente(idUsuario);

    return {
      token: this.jwtService.generateToken({ id: idUsuario }),
      usuario: this.paraResposta(usuario),
      idPaciente,
    };
  }

  // idLogado vem do token (req.idUsuario). Cada um so le a propria conta.
  async buscarPorId(id: number, idLogado: number | undefined): Promise<UsuarioResponseDTO> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroUsuario("validacao", "O id do usuário precisa ser um número inteiro positivo.");
    }

    autorizacaoService.garantirMesmoUsuario(idLogado, id);

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
