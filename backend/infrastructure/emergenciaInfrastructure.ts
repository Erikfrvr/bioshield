// Implementacao MySQL do EmergenciaRepository.
// SQL da busca pelo token do QR e do log de acesso a ficha.
// Sempre pego a conexao do pool, uso query com ? nos parametros e solto a conexao no finally.
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import FichaEmergencia, {
  AlergiaEmergencia,
  ContatoEmergenciaPublico,
  MedicamentoEmergencia,
} from "../models/entidade/FichaEmergencia";
import { Gravidade } from "../models/entidade/Alergia";
import TokenQR from "../models/valueObjects/TokenQR";
import { EmergenciaRepository, ResultadoBuscaEmergencia } from "../repository/EmergenciaRepository";

// Linha de pacientes com o nome que vem de usuarios pelo join
interface PacienteLinha extends RowDataPacket {
  id: number;
  nome: string;
  tipo_sanguineo: string | null;
  condicoes: string | null;
  observacoes: string | null;
  qr_ativo: number;
  atualizado_em: Date;
}

interface AlergiaLinha extends RowDataPacket {
  substancia: string;
  gravidade: Gravidade;
  observacao: string | null;
}

// O mysql2 devolve DECIMAL como texto ("50.00"), por isso dosagem chega como string
interface MedicamentoLinha extends RowDataPacket {
  nome: string;
  dosagem: string;
  unidade: string;
  frequencia_horas: number;
  ativo: number;
}

interface ContatoLinha extends RowDataPacket {
  nome: string;
  telefone: string;
  parentesco: string | null;
  prioridade: number;
}

export class EmergenciaInfrastructure implements EmergenciaRepository {
  // Quatro consultas na mesma conexao, e nao um join so com as tres listas:
  // juntar alergias, remedios e contatos na mesma linha multiplica o resultado.
  async buscarPorToken(token: TokenQR): Promise<ResultadoBuscaEmergencia | null> {
    const conexao = await pool.getConnection();
    try {
      // Do usuario so sai o nome. Email e senha ficam fora do SELECT de proposito.
      const [linhas] = await conexao.query<PacienteLinha[]>(
        `SELECT p.id, u.nome, p.tipo_sanguineo, p.condicoes, p.observacoes, p.qr_ativo, p.atualizado_em
           FROM pacientes p
           JOIN usuarios u ON u.id = p.id_usuario
          WHERE p.token_qr = ?`,
        [token.getValor()]
      );
      if (linhas.length === 0) {
        return null;
      }

      const paciente = linhas[0];
      const idPaciente = Number(paciente.id);

      // QR cancelado: paro aqui. Nao leio dado de saude que nao vai sair.
      if (!paciente.qr_ativo) {
        return { situacao: "cancelado", idPaciente };
      }

      // Grave primeiro. O FIELD devolve a posicao na lista, entao grave vira 1, moderada 2 e leve 3.
      const [alergias] = await conexao.query<AlergiaLinha[]>(
        `SELECT substancia, gravidade, observacao
           FROM alergias
          WHERE id_paciente = ?
          ORDER BY FIELD(gravidade, 'grave', 'moderada', 'leve'), id`,
        [idPaciente]
      );

      // So remedio em uso. Remedio encerrado no meio da lista atrapalha quem esta socorrendo.
      const [medicamentos] = await conexao.query<MedicamentoLinha[]>(
        `SELECT nome, dosagem, unidade, frequencia_horas, ativo
           FROM medicamentos
          WHERE id_paciente = ? AND ativo = TRUE
          ORDER BY nome`,
        [idPaciente]
      );

      // Prioridade 1 e o primeiro a ser chamado
      const [contatos] = await conexao.query<ContatoLinha[]>(
        `SELECT nome, telefone, parentesco, prioridade
           FROM contatos_emergencia
          WHERE id_paciente = ?
          ORDER BY prioridade, id`,
        [idPaciente]
      );

      return {
        situacao: "ativo",
        idPaciente,
        ficha: this.paraEntidade(paciente, alergias, medicamentos, contatos),
      };
    } finally {
      conexao.release();
    }
  }

  // acessado_em fica com o DEFAULT do banco, que e a hora em que a linha entrou
  async registrarAcesso(idPaciente: number, ip: string | null, userAgent: string | null): Promise<void> {
    const conexao = await pool.getConnection();
    try {
      await conexao.query(
        "INSERT INTO acessos_qr (id_paciente, ip, user_agent) VALUES (?, ?, ?)",
        [idPaciente, ip, userAgent]
      );
    } finally {
      conexao.release();
    }
  }

  // A entidade ordena e filtra de novo. O SQL ja entrega certo, mas a regra mora na FichaEmergencia:
  // se alguem mexer no ORDER BY sem querer, a ficha continua saindo na ordem do contrato.
  private paraEntidade(
    paciente: PacienteLinha,
    alergias: AlergiaLinha[],
    medicamentos: MedicamentoLinha[],
    contatos: ContatoLinha[]
  ): FichaEmergencia {
    const alergiasDaFicha: AlergiaEmergencia[] = alergias.map((a) => ({
      substancia: a.substancia,
      gravidade: a.gravidade,
      observacao: a.observacao,
    }));

    const medicamentosDaFicha: MedicamentoEmergencia[] = medicamentos.map((m) => ({
      nome: m.nome,
      dosagem: Number(m.dosagem),
      unidade: m.unidade,
      frequenciaHoras: Number(m.frequencia_horas),
      ativo: Boolean(m.ativo),
    }));

    const contatosDaFicha: ContatoEmergenciaPublico[] = contatos.map((c) => ({
      nome: c.nome,
      telefone: c.telefone,
      parentesco: c.parentesco,
      prioridade: Number(c.prioridade),
    }));

    return new FichaEmergencia(
      paciente.nome,
      paciente.tipo_sanguineo,
      paciente.condicoes,
      paciente.observacoes,
      paciente.atualizado_em,
      alergiasDaFicha,
      medicamentosDaFicha,
      contatosDaFicha
    );
  }
}

const emergenciaInfrastructure = new EmergenciaInfrastructure();
export default emergenciaInfrastructure;
