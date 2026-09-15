USE bioshield;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE acessos_qr;
TRUNCATE TABLE cuidador_paciente;
TRUNCATE TABLE doses;
TRUNCATE TABLE medicamentos;
TRUNCATE TABLE contatos_emergencia;
TRUNCATE TABLE alergias;
TRUNCATE TABLE pacientes;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO usuarios (id, nome, email, senha) VALUES
(1, 'Maria Aparecida Souza', 'maria.souza@exemplo.com', '$2b$10$PGmXy.0R8ZT7yyhxw3jDQOSgiuKj.eOk2Lhh0PORxJW/hgwWIs1w2'),
(2, 'Joana Beatriz Lima', 'joana.lima@exemplo.com', '$2b$10$PGmXy.0R8ZT7yyhxw3jDQOSgiuKj.eOk2Lhh0PORxJW/hgwWIs1w2'),
(3, 'Lucas Andrade Ferraz', 'lucas.andrade@exemplo.com', '$2b$10$PGmXy.0R8ZT7yyhxw3jDQOSgiuKj.eOk2Lhh0PORxJW/hgwWIs1w2'),
(4, 'Patricia Souza Martins', 'patricia.martins@exemplo.com', '$2b$10$PGmXy.0R8ZT7yyhxw3jDQOSgiuKj.eOk2Lhh0PORxJW/hgwWIs1w2');

INSERT INTO pacientes (id, id_usuario, tipo_sanguineo, condicoes, observacoes, token_qr) VALUES
(1, 1, 'O+', 'Hipertensao e diabetes tipo 2', 'Usa aparelho auditivo no ouvido direito. Mora sozinha.', 'a3f81c2d94be47a0b6e15d7c0f29b834'),
(2, 2, 'A-', 'Alergia severa a anti inflamatorios', 'Carrega caneta de adrenalina na bolsa.', '7d2e9b4a16cf43d8a95e0c73b18f26ad'),
(3, 3, 'AB+', 'Transtorno do espectro autista, nivel 2 de suporte', 'Nao verbal em situacao de estresse. Pode se afastar sozinho.', 'c51a70e8d3b94f26a8017ce4b9d3628f');

INSERT INTO alergias (id_paciente, substancia, gravidade, observacao) VALUES
(1, 'Dipirona', 'grave', 'Inchaco no rosto e falta de ar'),
(1, 'Penicilina', 'moderada', 'Manchas vermelhas pelo corpo'),
(2, 'Ibuprofeno', 'grave', 'Risco de choque anafilatico'),
(2, 'Camarao', 'moderada', 'Coceira e vomito'),
(3, 'Latex', 'leve', 'Vermelhidao no contato');

INSERT INTO contatos_emergencia (id_paciente, nome, telefone, parentesco, prioridade) VALUES
(1, 'Patricia Souza Martins', '11987654321', 'Filha', 1),
(1, 'Antonio Souza', '11976543210', 'Irmao', 2),
(2, 'Rodrigo Lima', '11965432109', 'Esposo', 1),
(3, 'Silvia Andrade', '11954321098', 'Mae', 1),
(3, 'Marcos Ferraz', '11943210987', 'Pai', 2);

INSERT INTO medicamentos (id, id_paciente, nome, dosagem, unidade, frequencia_horas, horario_inicial, data_inicio, data_fim, ativo) VALUES
(1, 1, 'Losartana', 50.00, 'mg', 12, '08:00:00', DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL, TRUE),
(2, 1, 'Metformina', 850.00, 'mg', 8, '07:00:00', DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL, TRUE),
(3, 1, 'Sinvastatina', 20.00, 'mg', 24, '21:00:00', DATE_SUB(CURDATE(), INTERVAL 15 DAY), NULL, TRUE),
(4, 2, 'Levotiroxina', 75.00, 'mg', 24, '06:30:00', DATE_SUB(CURDATE(), INTERVAL 60 DAY), NULL, TRUE),
(5, 3, 'Risperidona', 1.00, 'mg', 24, '20:00:00', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 80 DAY), TRUE),
(6, 1, 'Amoxicilina', 500.00, 'mg', 8, '09:00:00', DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_SUB(CURDATE(), INTERVAL 38 DAY), FALSE);

INSERT INTO doses (id_medicamento, horario_previsto, horario_confirmado, status) VALUES
(1, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:12:00'), 'tomada'),
(1, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '20:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '20:40:00'), 'tomada'),
(2, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:05:00'), 'tomada'),
(2, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '15:00:00'), NULL, 'perdida'),
(2, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '23:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '23:20:00'), 'tomada'),
(3, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '21:00:00'), NULL, 'perdida'),
(1, TIMESTAMP(CURDATE(), '08:00:00'), TIMESTAMP(CURDATE(), '08:03:00'), 'tomada'),
(1, TIMESTAMP(CURDATE(), '20:00:00'), NULL, 'prevista'),
(2, TIMESTAMP(CURDATE(), '07:00:00'), TIMESTAMP(CURDATE(), '07:18:00'), 'tomada'),
(2, TIMESTAMP(CURDATE(), '15:00:00'), NULL, 'prevista'),
(2, TIMESTAMP(CURDATE(), '23:00:00'), NULL, 'prevista'),
(3, TIMESTAMP(CURDATE(), '21:00:00'), NULL, 'prevista'),
(4, TIMESTAMP(CURDATE(), '06:30:00'), TIMESTAMP(CURDATE(), '06:35:00'), 'tomada'),
(5, TIMESTAMP(CURDATE(), '20:00:00'), NULL, 'prevista'),
(1, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00'), NULL, 'prevista'),
(2, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '07:00:00'), NULL, 'prevista'),
(4, TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '06:30:00'), NULL, 'prevista');

INSERT INTO cuidador_paciente (id_cuidador, id_paciente, ativo) VALUES
(4, 1, TRUE),
(4, 3, TRUE);

INSERT INTO acessos_qr (id_paciente, acessado_em, ip, user_agent) VALUES
(1, DATE_SUB(NOW(), INTERVAL 3 DAY), '189.45.12.80', 'Mozilla/5.0 (Linux; Android 13)'),
(1, DATE_SUB(NOW(), INTERVAL 2 HOUR), '200.147.35.12', 'Mozilla/5.0 (iPhone; iOS 17)'),
(2, DATE_SUB(NOW(), INTERVAL 8 DAY), '177.92.204.31', 'Mozilla/5.0 (Linux; Android 12)');
