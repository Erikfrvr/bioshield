-- Rascunho das consultas de medicamentos e doses (Tempo 1 da Daiane).
-- Tudo aqui foi testado no banco local (MariaDB 10.4 do XAMPP) antes de ir para o infrastructure.
--
-- Pode rodar o arquivo inteiro sem medo: ele abre uma transacao e termina com ROLLBACK,
-- entao o remedio de teste e as doses geradas somem no final.
--
-- No Workbench eu uso variavel (@id_paciente). No infrastructure cada @variavel vira um ?
-- e o valor vai no array da query, igual ao usuarioInfrastructure.ts.
--
-- Regras que ainda dependem de decisao com o Erik estao marcadas com "DUVIDA n",
-- o numero e o item do docs/DUVIDAS_CONTRATO.md.

USE bioshield;

START TRANSACTION;

SET @id_paciente = 1;


-- =====================================================================
-- 1. Listar os medicamentos de um paciente
--    GET /api/medicamentos?idPaciente=1
-- =====================================================================
-- proxima_dose: a primeira dose 'prevista' com horario no futuro. Vem NULL quando nao tem.
-- TIME_FORMAT corta os segundos: o banco devolve "08:00:00" e o contrato quer "08:00".
-- Ativos primeiro, depois por nome, para o remedio encerrado nao ficar no topo da tela.

SELECT
    m.id,
    m.id_paciente,
    m.nome,
    m.dosagem,
    m.unidade,
    m.frequencia_horas,
    TIME_FORMAT(m.horario_inicial, '%H:%i') AS horario_inicial,
    m.data_inicio,
    m.data_fim,
    m.ativo,
    (SELECT MIN(d.horario_previsto)
       FROM doses d
      WHERE d.id_medicamento = m.id
        AND d.status = 'prevista'
        AND d.horario_previsto > NOW()) AS proxima_dose
FROM medicamentos m
WHERE m.id_paciente = @id_paciente
ORDER BY m.ativo DESC, m.nome;

-- Lembrete para o DTO: o mysql2 devolve dosagem (DECIMAL) como texto, "50.00".
-- Converter com Number() antes de responder.


-- =====================================================================
-- 2. Inserir medicamento
--    POST /api/medicamentos
-- =====================================================================
-- ativo e criado_em ficam com o DEFAULT do banco.
-- No TypeScript o id novo vem em resultado.insertId. Aqui no Workbench eu pego com LAST_INSERT_ID().

INSERT INTO medicamentos
    (id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim)
VALUES
    (@id_paciente, 'Remedio de teste', 50, 'mg', 6, '08:00', CURDATE(), NULL);

SET @id_medicamento = LAST_INSERT_ID();


-- 2b. Gerar a agenda de doses do remedio que acabou de entrar.
--     O contrato manda o POST ja criar a agenda (Fase 8).
-- DUVIDA 3: quantos dias gerar. Aqui estou usando 7 dias a partir de agora, ou ate a data_fim.
-- So gera dose do agora para frente: se data_inicio for no passado, as doses antigas
-- entrariam como 'prevista' e depois virariam 'perdida', derrubando a adesao sem motivo.
-- A recursao anda de frequencia_horas em frequencia_horas a partir de data_inicio + horario_inicial.
-- No service da para fazer esse mesmo laco em TypeScript e mandar um INSERT com varias linhas.
-- O SQL aqui serve para conferir no banco se o resultado bate.

INSERT INTO doses (id_medicamento, horario_previsto)
WITH RECURSIVE agenda (horario, limite, passo) AS (
    SELECT
        TIMESTAMP(m.data_inicio, m.horario_inicial),
        LEAST(NOW() + INTERVAL 7 DAY,
              COALESCE(TIMESTAMP(m.data_fim + INTERVAL 1 DAY), NOW() + INTERVAL 7 DAY)),
        m.frequencia_horas
    FROM medicamentos m
    WHERE m.id = @id_medicamento
    UNION ALL
    SELECT horario + INTERVAL passo HOUR, limite, passo
    FROM agenda
    WHERE horario + INTERVAL passo HOUR < limite
)
SELECT @id_medicamento, horario
FROM agenda
WHERE horario >= NOW()
  AND horario < limite;

-- Conferencia: tem que sair uma dose a cada 6 horas, a primeira no futuro, nenhuma alem de 7 dias.
SELECT COUNT(*) AS doses_geradas, MIN(horario_previsto) AS primeira, MAX(horario_previsto) AS ultima
FROM doses
WHERE id_medicamento = @id_medicamento;


-- =====================================================================
-- 3. Doses de hoje, com o nome do remedio
--    GET /api/doses/hoje?idPaciente=1
-- =====================================================================
-- DUVIDA 2: antes de listar, marca como 'perdida' a dose que passou da tolerancia (60 min).
-- Sem isso nada no sistema vira 'perdida' sozinho.

UPDATE doses d
JOIN medicamentos m ON m.id = d.id_medicamento
SET d.status = 'perdida'
WHERE m.id_paciente = @id_paciente
  AND d.status = 'prevista'
  AND d.horario_previsto < NOW() - INTERVAL 60 MINUTE;

-- "Hoje" e de CURDATE() 00:00 ate antes de amanha 00:00.
-- Uso intervalo em vez de DATE(d.horario_previsto) = CURDATE() porque funcao em cima da coluna
-- impede o banco de usar o indice idx_doses_agenda.
-- DUVIDA 4: CURDATE() e o dia no fuso do MySQL (aqui America/Sao_Paulo).

SELECT
    d.id,
    d.id_medicamento,
    m.nome AS nome_medicamento,
    m.dosagem,
    m.unidade,
    d.horario_previsto,
    d.horario_confirmado,
    d.status
FROM doses d
JOIN medicamentos m ON m.id = d.id_medicamento
WHERE m.id_paciente = @id_paciente
  AND d.horario_previsto >= CURDATE()
  AND d.horario_previsto <  CURDATE() + INTERVAL 1 DAY
ORDER BY d.horario_previsto;


-- =====================================================================
-- 4. Adesao: hoje e ultimos 7 dias
--    GET /api/doses/adesao?idPaciente=1
-- =====================================================================
-- DUVIDA 1: so conta dose com horario ate agora. Dose do futuro fica fora,
-- senao o dia comeca em 0% e assusta o usuario.
-- "semana" sao os ultimos 7 dias corridos ate agora, nao a semana do calendario.
-- Uma consulta so traz as duas janelas: o WHERE pega a semana e o SUM(condicao) separa o hoje.
-- COALESCE porque SUM de zero linhas da NULL, e o front espera 0.
-- percentual: o comentario do doseInfrastructure.ts diz que a conta fica no service.
-- Deixei aqui so para conferir de olho: no infrastructure trazer so previstas, tomadas e perdidas.

SELECT
    COALESCE(SUM(d.horario_previsto >= CURDATE()), 0)                              AS hoje_previstas,
    COALESCE(SUM(d.horario_previsto >= CURDATE() AND d.status = 'tomada'), 0)      AS hoje_tomadas,
    COALESCE(SUM(d.horario_previsto >= CURDATE() AND d.status = 'perdida'), 0)     AS hoje_perdidas,
    COUNT(*)                                                                       AS semana_previstas,
    COALESCE(SUM(d.status = 'tomada'), 0)                                          AS semana_tomadas,
    COALESCE(SUM(d.status = 'perdida'), 0)                                         AS semana_perdidas,
    COALESCE(ROUND(100 * SUM(d.status = 'tomada') / COUNT(*)), 0)                  AS semana_percentual
FROM doses d
JOIN medicamentos m ON m.id = d.id_medicamento
WHERE m.id_paciente = @id_paciente
  AND d.horario_previsto >= NOW() - INTERVAL 7 DAY
  AND d.horario_previsto <= NOW();


ROLLBACK;
