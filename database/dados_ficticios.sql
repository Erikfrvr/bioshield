-- Dados ficticios do BioShield, para teste e para a apresentacao.
-- Rode depois do bioshield.sql. Pode rodar de novo quando quiser: ele apaga e recria so as contas ficticias,
-- pela lista exata dos emails delas. Contas criadas pelo app, como as fichas reais da equipe, ficam como estao.
-- Os QR Codes das contas ficticias tem codigo fixo aqui, entao rodar de novo nao estraga papel ja impresso.
--
-- Senha de todas as contas: @Senac_empreenda2026
--
-- | Conta                          | Para mostrar                                                        |
-- |--------------------------------|---------------------------------------------------------------------|
-- | maria@bioshield.com            | Paciente principal: ficha completa, remedio em uso, suspenso e encerrado, |
-- |                                | uma semana de doses quase toda em dia e acessos ao QR no historico  |
-- | patricia@bioshield.com         | Cuidadora da Maria (em dia) e do Lucas (com doses perdidas)         |
-- | joana@bioshield.com            | Alergia grave em destaque na ficha de emergencia                    |
-- | lucas@bioshield.com            | Tratamento com data para acabar e adesao baixa                      |
-- | roberto@bioshield.com          | QR Code cancelado: mostra a tela de aviso de codigo cancelado       |
-- | davi@bioshield.com             | Autista que pode se perder: como agir e quem chamar. Conta da mae   |
-- | diego@bioshield.com            | Motoboy: sangue O negativo, alergias e o aviso de nao tirar o capacete |
-- | renata@bioshield.com           | Ciclista com diabetes tipo 1: o que fazer na glicose baixa          |
--
-- As doses sao montadas em volta da hora em que o script roda:
-- os ultimos 6 dias inteiros e o que ja passou de hoje entram como historico.
-- O resto de hoje e os proximos dias o proprio backend gera na primeira vez que a tela de doses abre.

USE bioshield;

SET NAMES utf8mb4;
-- Mesmo fuso do backend (config/fuso.ts). Sem isso CURDATE() e NOW() seguem o fuso do MySQL.
SET time_zone = '-03:00';

-- Apaga so as contas ficticias. Todas as chaves estrangeiras do bioshield.sql sao ON DELETE CASCADE,
-- entao junto com a conta saem a ficha, as alergias, os contatos, os remedios, as doses, os vinculos
-- de cuidador e o historico de leituras dela.
-- As contas ficticias usam o mesmo @bioshield.com das contas reais da equipe (erik@ e daiane@), entao o filtro
-- e a lista exata dos oito emails, nunca o final do email. As contas criadas pelo app ficam.
-- O LIKE '%@exemplo.com' limpa as contas ficticias de antes de 07/10, que usavam esse final de email.
-- Os ids abaixo sao fixos: 1 a 5 sao os ficticios de sempre e os novos comecam em 101,
-- longe dos ids que o app da para as contas criadas por ele.
DELETE FROM usuarios
WHERE email IN ('maria@bioshield.com', 'joana@bioshield.com', 'lucas@bioshield.com', 'patricia@bioshield.com',
                'roberto@bioshield.com', 'davi@bioshield.com', 'diego@bioshield.com', 'renata@bioshield.com')
   OR email LIKE '%@exemplo.com';

-- O hash e de "@Senac_empreenda2026", a senha padrao de todas as contas de demonstracao.
INSERT INTO usuarios (id, nome, email, senha) VALUES
(1, 'Maria Aparecida Souza', 'maria@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(2, 'Joana Beatriz Lima', 'joana@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(3, 'Lucas Andrade Ferraz', 'lucas@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(4, 'Patrícia Souza Martins', 'patricia@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(5, 'Roberto Carlos Nunes', 'roberto@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(101, 'Davi Oliveira Santos', 'davi@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(102, 'Diego Ferreira Rocha', 'diego@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu'),
(103, 'Renata Alves Moreira', 'renata@bioshield.com', '$2b$10$oYaJWr9aN.oWxtrO.HwWZuDatO/xvGrQj2D1NGKu662aC1NrClMxu');

-- A Patricia (4) nao tem ficha: ela entra so como cuidadora.
INSERT INTO pacientes (id, id_usuario, tipo_sanguineo, condicoes, observacoes, token_qr, token_gerado_em, qr_ativo, qr_cancelado_em) VALUES
(1, 1, 'O+', 'Hipertensão e diabetes tipo 2.', 'Usa aparelho auditivo no ouvido direito. Mora sozinha. Fala devagar quando a glicose está baixa.', 'a3f81c2d94be47a0b6e15d7c0f29b834', DATE_SUB(NOW(), INTERVAL 30 DAY), TRUE, NULL),
(2, 2, 'A-', 'Asma leve.', 'Carrega caneta de adrenalina na bolsa, no bolso da frente.', '7d2e9b4a16cf43d8a95e0c73b18f26ad', DATE_SUB(NOW(), INTERVAL 60 DAY), TRUE, NULL),
(3, 3, 'AB+', 'Transtorno do espectro autista, nível 2 de suporte.', 'Não verbal em situação de estresse. Pode se afastar sozinho. Fale baixo e evite tocar sem avisar.', 'c51a70e8d3b94f26a8017ce4b9d3628f', DATE_SUB(NOW(), INTERVAL 10 DAY), TRUE, NULL),
(4, 5, 'B+', 'Epilepsia.', 'Em crise, deite de lado e não coloque nada na boca.', 'e94b27c0a1d846f3b5c08d2e7a61f93c', DATE_SUB(NOW(), INTERVAL 40 DAY), FALSE, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(101, 101, 'A+', 'Transtorno do espectro autista, nível 3 de suporte. Não fala.', 'Pode sair andando sem avisar e se perder. Não responde quando chamado pelo nome e se assusta com barulho alto e com toque. Fale baixo e devagar, e não segure pelo braço. Ele se acalma com o fone abafador que carrega na mochila. Ligue para a mãe.', '07b94e9b13b9185cca241a9cfe021248', DATE_SUB(NOW(), INTERVAL 15 DAY), TRUE, NULL),
(102, 102, 'O-', 'Nenhuma doença crônica.', 'Motoboy de entregas. Em caso de acidente, não tire o capacete nem mexa no pescoço dele: espere o SAMU (192). Usa lentes de contato.', 'b52baf6fff61bf1bf7074d6a13120748', DATE_SUB(NOW(), INTERVAL 45 DAY), TRUE, NULL),
(103, 103, 'B-', 'Diabetes tipo 1.', 'Ciclista, pedala longas distâncias. Se estiver confusa, tremendo ou suando frio, pode ser glicose baixa: se ela conseguir engolir, ofereça algo doce. Usa sensor de glicose no braço esquerdo.', '0ff92863f327ecc1757776b6eb9077ee', DATE_SUB(NOW(), INTERVAL 90 DAY), TRUE, NULL);

INSERT INTO alergias (id_paciente, substancia, gravidade, observacao) VALUES
(1, 'Dipirona', 'grave', 'Inchaço no rosto e falta de ar'),
(1, 'Penicilina', 'moderada', 'Manchas vermelhas pelo corpo'),
(2, 'Ibuprofeno', 'grave', 'Risco de choque anafilático'),
(2, 'Camarão', 'grave', 'Fecha a garganta em poucos minutos'),
(2, 'Poeira', 'leve', 'Espirros e coceira nos olhos'),
(3, 'Látex', 'leve', 'Vermelhidão no contato'),
(4, 'Carbamazepina', 'moderada', 'Manchas e febre'),
(101, 'Amendoim', 'grave', 'Inchaço na boca e falta de ar'),
(101, 'Corante amarelo tartrazina', 'moderada', 'Coceira e manchas na pele'),
(102, 'Diclofenaco', 'grave', 'Falta de ar e inchaço no rosto'),
(102, 'Lidocaína', 'moderada', 'Coceira e vermelhidão no local da aplicação'),
(103, 'Sulfa', 'moderada', 'Manchas vermelhas e febre');

INSERT INTO contatos_emergencia (id_paciente, nome, telefone, parentesco, prioridade) VALUES
(1, 'Patrícia Souza Martins', '11987654321', 'Filha', 1),
(1, 'Antônio Souza', '11976543210', 'Irmão', 2),
(2, 'Rodrigo Lima', '11965432109', 'Marido', 1),
(3, 'Sílvia Andrade', '11954321098', 'Mãe', 1),
(3, 'Marcos Ferraz', '11943210987', 'Pai', 2),
(4, 'Helena Nunes', '11932109876', 'Esposa', 1),
(101, 'Cláudia Oliveira Santos', '11921098765', 'Mãe', 1),
(101, 'Fernando Santos', '11910987654', 'Pai', 2),
(102, 'Juliana Rocha', '11998877665', 'Esposa', 1),
(102, 'Carlos Ferreira Rocha', '11987766554', 'Irmão', 2),
(103, 'Tiago Moreira', '11976655443', 'Marido', 1),
(103, 'Bruna Alves', '11965544332', 'Irmã', 2);

-- Maria tem os tres estados que a tela de remedios mostra:
-- em uso (1, 2 e 3), suspenso pelo medico (6) e encerrado porque o tratamento acabou (7).
-- So os em uso aparecem na ficha de emergencia.
INSERT INTO medicamentos (id, id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim, ativo) VALUES
(1, 1, 'Losartana', 50.00, 'mg', 12, '08:00:00', DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL, TRUE),
(2, 1, 'Metformina', 850.00, 'mg', 8, '07:00:00', DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL, TRUE),
(3, 1, 'Sinvastatina', 20.00, 'mg', 24, '21:00:00', DATE_SUB(CURDATE(), INTERVAL 15 DAY), NULL, TRUE),
(4, 2, 'Levotiroxina', 75.00, 'mg', 24, '06:30:00', DATE_SUB(CURDATE(), INTERVAL 60 DAY), NULL, TRUE),
(5, 3, 'Risperidona', 1.00, 'mg', 24, '20:00:00', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 80 DAY), TRUE),
(6, 1, 'AAS', 100.00, 'mg', 24, '12:00:00', DATE_SUB(CURDATE(), INTERVAL 60 DAY), NULL, FALSE),
(7, 1, 'Amoxicilina', 500.00, 'mg', 8, '09:00:00', DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_SUB(CURDATE(), INTERVAL 38 DAY), TRUE),
(8, 4, 'Ácido valproico', 500.00, 'mg', 12, '08:00:00', DATE_SUB(CURDATE(), INTERVAL 40 DAY), NULL, TRUE),
(101, 101, 'Aripiprazol', 5.00, 'mg', 24, '08:00:00', DATE_SUB(CURDATE(), INTERVAL 15 DAY), NULL, TRUE),
(102, 103, 'Insulina glargina', 20.00, 'unidade', 24, '22:00:00', DATE_SUB(CURDATE(), INTERVAL 90 DAY), NULL, TRUE);
-- O Diego (102) nao toma remedio nenhum: a ficha de emergencia dele mostra como fica sem remedio em uso.

-- Historico de doses dos remedios em uso: os ultimos 6 dias inteiros e o que ja passou de hoje.
-- dias: 6 = seis dias atras ... 0 = hoje. passos: a 1a, a 2a e a 3a dose do dia (cabe ate de 8 em 8 horas).
-- Dose que caiu ha menos de 30 minutos fica de fora: o backend gera ela como prevista e a tela mostra "Está na hora".
-- Perdidas escolhidas a dedo: a Maria esta em dia, o Lucas esqueceu duas vezes e a Joana uma.
-- A hora da confirmacao varia uns minutos pra nao ficar tudo cravado no horario.
INSERT INTO doses (id_medicamento, horario_previsto, horario_confirmado, status)
SELECT grade.id_medicamento,
       grade.horario,
       CASE WHEN grade.perdida THEN NULL
            ELSE grade.horario + INTERVAL MOD(grade.dia * 7 + grade.passo * 11 + grade.id_medicamento * 5, 25) MINUTE END,
       CASE WHEN grade.perdida THEN 'perdida' ELSE 'tomada' END
  FROM (
    SELECT m.id AS id_medicamento,
           d.dia,
           p.passo,
           TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.dia DAY), m.horario_inicial) + INTERVAL (p.passo * m.frequencia_horas) HOUR AS horario,
           (m.id = 5 AND d.dia IN (2, 4)) OR (m.id = 4 AND d.dia = 3) AS perdida
      FROM medicamentos m
      JOIN (SELECT 0 AS dia UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d
      JOIN (SELECT 0 AS passo UNION ALL SELECT 1 UNION ALL SELECT 2) p
     WHERE m.id IN (1, 2, 3, 4, 5, 8, 101, 102)
       AND p.passo * m.frequencia_horas < 24
  ) grade
 WHERE grade.horario <= NOW() - INTERVAL 30 MINUTE
 ORDER BY grade.horario, grade.id_medicamento;

-- Patricia acompanha a Maria (mae dela) e o Lucas. A Joana ninguem acompanha: da pra vincular ao vivo na apresentacao.
INSERT INTO cuidador_paciente (id_cuidador, id_paciente, autorizado_em, ativo) VALUES
(4, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), TRUE),
(4, 3, DATE_SUB(NOW(), INTERVAL 6 DAY), TRUE);

-- O historico da LGPD. O acesso ao QR cancelado do Roberto tambem fica registrado.
INSERT INTO acessos_qr (id_paciente, acessado_em, ip, user_agent) VALUES
(1, DATE_SUB(NOW(), INTERVAL 3 DAY), '189.45.12.80', 'Mozilla/5.0 (Linux; Android 13)'),
(1, DATE_SUB(NOW(), INTERVAL 2 HOUR), '200.147.35.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)'),
(2, DATE_SUB(NOW(), INTERVAL 8 DAY), '177.92.204.31', 'Mozilla/5.0 (Linux; Android 12)'),
(4, DATE_SUB(NOW(), INTERVAL 1 DAY), '191.183.40.7', 'Mozilla/5.0 (Linux; Android 14)'),
(101, DATE_SUB(NOW(), INTERVAL 4 DAY), '177.38.150.22', 'Mozilla/5.0 (Linux; Android 14)');
