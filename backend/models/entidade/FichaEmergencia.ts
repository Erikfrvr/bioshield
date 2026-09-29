// Entidade FichaEmergencia: a versao publica e reduzida do paciente, a que o QR Code mostra.
// Monto ela a partir do Paciente filtrando so o que ajuda a socorrer: alergias, remedios em uso,
// tipo sanguineo, condicoes criticas e contato. Nada de email, senha ou historico completo.
//
// As regras de ordem e de filtro do contrato ficam aqui dentro, e nao so no SQL:
// quem socorre le de cima pra baixo, e a entidade garante a ordem venha o dado de onde vier.
// Os tipos abaixo sao so os campos publicos. Id, email, senha, idUsuario e token nem existem aqui.

import { Gravidade } from "./Alergia";

export interface AlergiaEmergencia {
  substancia: string;
  gravidade: Gravidade;
  observacao: string | null;
}

export interface MedicamentoEmergencia {
  nome: string;
  dosagem: number;
  unidade: string;
  frequenciaHoras: number;
  ativo: boolean;
}

export interface ContatoEmergenciaPublico {
  nome: string;
  telefone: string;
  parentesco: string | null;
  prioridade: number;
}

// Grave primeiro. Numero menor aparece antes.
const PESO_GRAVIDADE: Record<Gravidade, number> = {
  grave: 0,
  moderada: 1,
  leve: 2,
};

export class FichaEmergencia {
  private readonly nome: string;
  private readonly tipoSanguineo: string | null;
  private readonly condicoes: string | null;
  private readonly observacoes: string | null;
  private readonly atualizadoEm: Date;
  private readonly alergias: AlergiaEmergencia[];
  private readonly medicamentos: MedicamentoEmergencia[];
  private readonly contatos: ContatoEmergenciaPublico[];

  constructor(
    nome: string,
    tipoSanguineo: string | null,
    condicoes: string | null,
    observacoes: string | null,
    atualizadoEm: Date,
    alergias: AlergiaEmergencia[] = [],
    medicamentos: MedicamentoEmergencia[] = [],
    contatos: ContatoEmergenciaPublico[] = []
  ) {
    if (typeof nome !== "string" || nome.trim() === "") {
      throw new Error("A ficha de emergência precisa do nome do titular.");
    }

    this.nome = nome.trim();
    this.tipoSanguineo = tipoSanguineo;
    this.condicoes = condicoes;
    this.observacoes = observacoes;
    this.atualizadoEm = atualizadoEm;

    // Copio antes de ordenar pra nao mexer no array de quem chamou
    this.alergias = [...alergias].sort(
      (a, b) => PESO_GRAVIDADE[a.gravidade] - PESO_GRAVIDADE[b.gravidade]
    );
    // Remedio encerrado no meio da lista atrapalha quem esta socorrendo
    this.medicamentos = medicamentos.filter((m) => m.ativo);
    this.contatos = [...contatos].sort((a, b) => a.prioridade - b.prioridade);
  }

  public getNome(): string {
    return this.nome;
  }

  public getTipoSanguineo(): string | null {
    return this.tipoSanguineo;
  }

  public getCondicoes(): string | null {
    return this.condicoes;
  }

  public getObservacoes(): string | null {
    return this.observacoes;
  }

  public getAtualizadoEm(): Date {
    return this.atualizadoEm;
  }

  public getAlergias(): AlergiaEmergencia[] {
    return [...this.alergias];
  }

  public getMedicamentos(): MedicamentoEmergencia[] {
    return [...this.medicamentos];
  }

  public getContatos(): ContatoEmergenciaPublico[] {
    return [...this.contatos];
  }

  // Tem alergia grave? A tela pode usar isso pra pintar o aviso de vermelho logo no topo.
  public temAlergiaGrave(): boolean {
    return this.alergias.some((a) => a.gravidade === "grave");
  }
}

export default FichaEmergencia;
