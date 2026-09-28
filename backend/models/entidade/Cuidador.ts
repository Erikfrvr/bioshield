// Entidade Cuidador: o familiar ou responsavel que acompanha um paciente.
// Guarda o vinculo e o que ele pode ver. Cuidador e uma conta comum com um vinculo autorizado, nao um tipo de conta separado.
// Cada objeto e uma linha de cuidador_paciente: idCuidador e o id do usuario, idPaciente e o id da ficha.

export class Cuidador {
  private id: number | null;
  private idCuidador: number;
  private idPaciente: number;
  private autorizadoEm: Date | null;
  private ativo: boolean;

  constructor(
    idCuidador: number,
    idPaciente: number,
    id: number | null = null,
    autorizadoEm: Date | null = null,
    ativo: boolean = true
  ) {
    this.id = id;
    this.idCuidador = Cuidador.validarId(idCuidador, "cuidador");
    this.idPaciente = Cuidador.validarId(idPaciente, "paciente");
    this.autorizadoEm = autorizadoEm;
    this.ativo = ativo;
  }

  private static validarId(valor: number, campo: string): number {
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new Error(`O id do ${campo} é inválido.`);
    }

    return valor;
  }

  // Desvincular nao apaga a linha: quem teve acesso a dado de saude precisa ficar registrado
  public desvincular(): void {
    if (!this.ativo) {
      throw new Error("Esse vínculo já foi desfeito.");
    }

    this.ativo = false;
  }

  // O banco tem UNIQUE (id_cuidador, id_paciente), entao vincular de novo a mesma dupla
  // reaproveita a linha antiga em vez de criar outra. A data da autorizacao passa a ser a nova.
  public reativar(autorizadoEm: Date): void {
    if (this.ativo) {
      throw new Error("Esse vínculo já está ativo.");
    }

    this.ativo = true;
    this.autorizadoEm = autorizadoEm;
  }

  public getId(): number | null {
    return this.id;
  }

  public setId(id: number): void {
    this.id = id;
  }

  public getIdCuidador(): number {
    return this.idCuidador;
  }

  public getIdPaciente(): number {
    return this.idPaciente;
  }

  public getAutorizadoEm(): Date | null {
    return this.autorizadoEm;
  }

  public setAutorizadoEm(autorizadoEm: Date): void {
    this.autorizadoEm = autorizadoEm;
  }

  public estaAtivo(): boolean {
    return this.ativo;
  }
}

export default Cuidador;
