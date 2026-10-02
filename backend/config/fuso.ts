// Fuso horario do BioShield (duvida 4 do docs/DUVIDAS_CONTRATO.md).
// O app inteiro trabalha no horario de Brasilia: "08:00" no cadastro do remedio e 8h em Brasilia,
// e "hoje" e o dia de Brasilia. Para isso tres relogios precisam concordar: o do Node, o do mysql2 e o do MySQL.
// Aqui eu acerto o do Node. Os outros dois ficam no config/db.ts, que usa as constantes daqui.
// Tem que ser o primeiro import do server.ts, antes de qualquer arquivo que monte data.

// Nome do fuso, para o Node. new Date(ano, mes, dia, hora) passa a ser hora de Brasilia em qualquer servidor.
export const FUSO_NOME = "America/Sao_Paulo";

// O mesmo fuso como deslocamento, para o mysql2 e para o MySQL, que nao aceitam o nome.
// O Brasil nao tem horario de verao desde 2019, entao -03:00 e sempre Brasilia.
export const FUSO_DESLOCAMENTO = "-03:00";

process.env.TZ = FUSO_NOME;
