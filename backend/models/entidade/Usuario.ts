// Entidade Usuario: a conta de quem usa o app.
// Guarda nome, email e senha com atributos privados e getters e setters.
// Email e Senha entram como value objects, entao conta invalida nem chega a existir.

import Email from "../valueObjects/Email";
import Senha from "../valueObjects/Senha";

export class Usuario {
  private static readonly NOME_TAMANHO_MAXIMO = 80;

  private id: number | null;
  private nome: string;
  private email: Email;
  private senha: Senha;
  private criadoEm: Date | null;

  constructor(
    nome: string,
    email: Email,
    senha: Senha,
    id: number | null = null,
    criadoEm: Date | null = null
  ) {
    this.id = id;
    this.nome = Usuario.validarNome(nome);
    this.email = email;
    this.senha = senha;
    this.criadoEm = criadoEm;
  }

  private static validarNome(nome: string): string {
    if (typeof nome !== "string" || nome.trim() === "") {
      throw new Error("O nome é obrigatório.");
    }

    const normalizado = nome.trim();

    if (normalizado.length > Usuario.NOME_TAMANHO_MAXIMO) {
      throw new Error(`O nome pode ter no máximo ${Usuario.NOME_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizado;
  }

  public getId(): number | null {
    return this.id;
  }

  public setId(id: number): void {
    this.id = id;
  }

  public getNome(): string {
    return this.nome;
  }

  public setNome(nome: string): void {
    this.nome = Usuario.validarNome(nome);
  }

  public getEmail(): Email {
    return this.email;
  }

  public setEmail(email: Email): void {
    this.email = email;
  }

  public getSenha(): Senha {
    return this.senha;
  }

  public setSenha(senha: Senha): void {
    this.senha = senha;
  }

  public getCriadoEm(): Date | null {
    return this.criadoEm;
  }

  public setCriadoEm(criadoEm: Date): void {
    this.criadoEm = criadoEm;
  }
}

export default Usuario;
