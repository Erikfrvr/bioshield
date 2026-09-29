// Entidade ContatoEmergencia: quem ligar quando a pessoa nao consegue falar.
// Nome, telefone e parentesco. Aparece na ficha do QR com botao de ligar direto.

import Telefone from "../valueObjects/Telefone";

export class ContatoEmergencia {
  // Limites das colunas nome VARCHAR(80) e parentesco VARCHAR(40)
  private static readonly NOME_TAMANHO_MAXIMO = 80;
  private static readonly PARENTESCO_TAMANHO_MAXIMO = 40;
  // prioridade e TINYINT com CHECK (prioridade > 0)
  private static readonly PRIORIDADE_MAXIMA = 127;

  private id: number | null;
  private nome: string;
  private telefone: Telefone;
  private parentesco: string | null;
  private prioridade: number;

  // Prioridade 1 e o primeiro a ser chamado. O front manda na ordem da tela: 1, 2, 3...
  constructor(
    nome: string,
    telefone: Telefone,
    parentesco: string | null = null,
    prioridade: number = 1,
    id: number | null = null
  ) {
    this.id = id;
    this.nome = ContatoEmergencia.validarNome(nome);
    this.telefone = telefone;
    this.parentesco = ContatoEmergencia.validarParentesco(parentesco);
    this.prioridade = ContatoEmergencia.validarPrioridade(prioridade);
  }

  private static validarNome(nome: string): string {
    if (typeof nome !== "string" || nome.trim() === "") {
      throw new Error("Informe o nome do contato de emergência.");
    }

    const normalizado = nome.trim();

    if (normalizado.length > ContatoEmergencia.NOME_TAMANHO_MAXIMO) {
      throw new Error(`O nome do contato pode ter no máximo ${ContatoEmergencia.NOME_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizado;
  }

  private static validarParentesco(parentesco: string | null): string | null {
    if (parentesco === null || parentesco === undefined) {
      return null;
    }

    if (typeof parentesco !== "string") {
      throw new Error("O parentesco precisa ser um texto.");
    }

    const normalizado = parentesco.trim();

    if (normalizado.length > ContatoEmergencia.PARENTESCO_TAMANHO_MAXIMO) {
      throw new Error(`O parentesco pode ter no máximo ${ContatoEmergencia.PARENTESCO_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizado === "" ? null : normalizado;
  }

  private static validarPrioridade(prioridade: number): number {
    if (!Number.isInteger(prioridade) || prioridade < 1 || prioridade > ContatoEmergencia.PRIORIDADE_MAXIMA) {
      throw new Error("A prioridade do contato precisa ser um número inteiro a partir de 1.");
    }

    return prioridade;
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

  public getTelefone(): Telefone {
    return this.telefone;
  }

  public getParentesco(): string | null {
    return this.parentesco;
  }

  public getPrioridade(): number {
    return this.prioridade;
  }
}

export default ContatoEmergencia;
