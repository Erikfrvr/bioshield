// Entidade Paciente: a ficha medica ligada a uma conta.
// Tipo sanguineo, condicoes de saude, observacoes, lista de alergias, contato de emergencia e o token do QR.
// E o coracao do app, entao toda validacao forte passa por aqui.

import Alergia from "./Alergia";
import ContatoEmergencia from "./ContatoEmergencia";
import TipoSanguineo from "../valueObjects/TipoSanguineo";
import TokenQR from "../valueObjects/TokenQR";

export class Paciente {
  // condicoes e observacoes sao TEXT no banco, mas a emergencia precisa ser lida em segundos.
  // Texto gigante ali atrapalha quem socorre, entao limito bem abaixo do que o banco aguenta.
  private static readonly TEXTO_TAMANHO_MAXIMO = 1000;
  // Limites de bom senso pra lista. Ninguem precisa de 50 contatos, e isso barra corpo abusivo.
  private static readonly MAXIMO_ALERGIAS = 30;
  private static readonly MAXIMO_CONTATOS = 5;

  private id: number | null;
  private idUsuario: number;
  private tipoSanguineo: TipoSanguineo | null;
  private condicoes: string | null;
  private observacoes: string | null;
  private tokenQr: TokenQR;
  private qrAtivo: boolean;
  private qrCanceladoEm: Date | null;
  private alergias: Alergia[];
  private contatos: ContatoEmergencia[];
  private criadoEm: Date | null;
  private atualizadoEm: Date | null;

  constructor(
    idUsuario: number,
    tipoSanguineo: TipoSanguineo | null,
    condicoes: string | null,
    observacoes: string | null,
    tokenQr: TokenQR,
    alergias: Alergia[] = [],
    contatos: ContatoEmergencia[] = [],
    id: number | null = null,
    qrAtivo: boolean = true,
    qrCanceladoEm: Date | null = null,
    criadoEm: Date | null = null,
    atualizadoEm: Date | null = null
  ) {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      throw new Error("O id do usuário dono da ficha é inválido.");
    }

    this.id = id;
    this.idUsuario = idUsuario;
    this.tipoSanguineo = tipoSanguineo;
    this.condicoes = Paciente.validarTexto(condicoes, "condições de saúde");
    this.observacoes = Paciente.validarTexto(observacoes, "observações");
    this.tokenQr = tokenQr;
    this.qrAtivo = qrAtivo;
    this.qrCanceladoEm = qrCanceladoEm;
    this.alergias = Paciente.validarAlergias(alergias);
    this.contatos = Paciente.validarContatos(contatos);
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }

  private static validarTexto(texto: string | null, campo: string): string | null {
    if (texto === null || texto === undefined) {
      return null;
    }

    if (typeof texto !== "string") {
      throw new Error(`O campo ${campo} precisa ser um texto.`);
    }

    const normalizado = texto.trim();

    if (normalizado.length > Paciente.TEXTO_TAMANHO_MAXIMO) {
      throw new Error(`O campo ${campo} pode ter no máximo ${Paciente.TEXTO_TAMANHO_MAXIMO} caracteres.`);
    }

    return normalizado === "" ? null : normalizado;
  }

  private static validarAlergias(alergias: Alergia[]): Alergia[] {
    if (alergias.length > Paciente.MAXIMO_ALERGIAS) {
      throw new Error(`A ficha aceita no máximo ${Paciente.MAXIMO_ALERGIAS} alergias.`);
    }

    // A mesma substancia duas vezes confunde quem socorre: qual das duas gravidades vale?
    const vistas = new Set<string>();
    for (const alergia of alergias) {
      const chave = alergia.getSubstancia().toLowerCase();
      if (vistas.has(chave)) {
        throw new Error(`A alergia a "${alergia.getSubstancia()}" foi informada mais de uma vez.`);
      }
      vistas.add(chave);
    }

    return [...alergias];
  }

  private static validarContatos(contatos: ContatoEmergencia[]): ContatoEmergencia[] {
    if (contatos.length > Paciente.MAXIMO_CONTATOS) {
      throw new Error(`A ficha aceita no máximo ${Paciente.MAXIMO_CONTATOS} contatos de emergência.`);
    }

    // Dois contatos com a mesma prioridade deixam a ordem de ligacao ambigua
    const prioridades = new Set<number>();
    for (const contato of contatos) {
      if (prioridades.has(contato.getPrioridade())) {
        throw new Error("Dois contatos de emergência estão com a mesma prioridade.");
      }
      prioridades.add(contato.getPrioridade());
    }

    // Guardo ja em ordem de prioridade, que e a ordem de ligar
    return [...contatos].sort((a, b) => a.getPrioridade() - b.getPrioridade());
  }

  // O PUT manda o estado final das listas, entao atualizar e substituir tudo, nao somar.
  public substituirAlergias(alergias: Alergia[]): void {
    this.alergias = Paciente.validarAlergias(alergias);
  }

  public substituirContatos(contatos: ContatoEmergencia[]): void {
    this.contatos = Paciente.validarContatos(contatos);
  }

  public getId(): number | null {
    return this.id;
  }

  public setId(id: number): void {
    this.id = id;
  }

  public getIdUsuario(): number {
    return this.idUsuario;
  }

  public getTipoSanguineo(): TipoSanguineo | null {
    return this.tipoSanguineo;
  }

  public setTipoSanguineo(tipoSanguineo: TipoSanguineo | null): void {
    this.tipoSanguineo = tipoSanguineo;
  }

  public getCondicoes(): string | null {
    return this.condicoes;
  }

  public setCondicoes(condicoes: string | null): void {
    this.condicoes = Paciente.validarTexto(condicoes, "condições de saúde");
  }

  public getObservacoes(): string | null {
    return this.observacoes;
  }

  public setObservacoes(observacoes: string | null): void {
    this.observacoes = Paciente.validarTexto(observacoes, "observações");
  }

  public getTokenQr(): TokenQR {
    return this.tokenQr;
  }

  public estaComQrAtivo(): boolean {
    return this.qrAtivo;
  }

  public getQrCanceladoEm(): Date | null {
    return this.qrCanceladoEm;
  }

  public getAlergias(): Alergia[] {
    return [...this.alergias];
  }

  public getContatos(): ContatoEmergencia[] {
    return [...this.contatos];
  }

  public getCriadoEm(): Date | null {
    return this.criadoEm;
  }

  public getAtualizadoEm(): Date | null {
    return this.atualizadoEm;
  }
}

export default Paciente;
