-- Script do banco do BioShield.
-- Aqui eu escrevo o CREATE DATABASE, as tabelas e as chaves estrangeiras.
-- Ordem que eu pretendo seguir: usuarios, pacientes, alergias, contatos_emergencia,
-- medicamentos, doses e cuidador_paciente.
-- Regra: o token do QR fica com indice unico, porque a busca da emergencia passa por ele.

CREATE DATABASE IF NOT EXISTS bioshield
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_general_ci;

USE bioshield;

CREATE TABLE usuarios (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_usuarios_email UNIQUE (email)
);

CREATE TABLE pacientes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    tipo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
    condicoes TEXT NULL,
    observacoes TEXT NULL,
    token_qr CHAR(32) NOT NULL,
    token_gerado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_pacientes_usuario UNIQUE (id_usuario),
    CONSTRAINT uk_pacientes_token UNIQUE (token_qr),
    CONSTRAINT fk_pacientes_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
);

CREATE TABLE alergias (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_paciente BIGINT NOT NULL,
    substancia VARCHAR(100) NOT NULL,
    gravidade ENUM('leve', 'moderada', 'grave') NOT NULL DEFAULT 'moderada',
    observacao VARCHAR(200) NULL,

    CONSTRAINT fk_alergias_paciente FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id)
        ON DELETE CASCADE,
    INDEX idx_alergias_paciente (id_paciente)
);

CREATE TABLE contatos_emergencia (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_paciente BIGINT NOT NULL,
    nome VARCHAR(80) NOT NULL,
    telefone VARCHAR(11) NOT NULL,
    parentesco VARCHAR(40) NULL,
    prioridade TINYINT NOT NULL DEFAULT 1,

    CONSTRAINT fk_contatos_paciente FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_contatos_prioridade CHECK (prioridade > 0),
    INDEX idx_contatos_paciente (id_paciente)
);

CREATE TABLE medicamentos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_paciente BIGINT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    dosagem DECIMAL(10,2) NOT NULL,
    unidade ENUM('mg', 'ml', 'g', 'gota', 'comprimido', 'unidade') NOT NULL DEFAULT 'mg',
    frequencia_horas SMALLINT NOT NULL,
    horario_inicial TIME NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_medicamentos_paciente FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_medicamentos_dosagem CHECK (dosagem > 0),
    CONSTRAINT ck_medicamentos_frequencia CHECK (frequencia_horas BETWEEN 1 AND 168),
    INDEX idx_medicamentos_paciente (id_paciente)
);

CREATE TABLE doses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_medicamento BIGINT NOT NULL,
    horario_previsto DATETIME NOT NULL,
    horario_confirmado DATETIME NULL,
    status ENUM('prevista', 'tomada', 'perdida') NOT NULL DEFAULT 'prevista',

    CONSTRAINT fk_doses_medicamento FOREIGN KEY (id_medicamento)
        REFERENCES medicamentos (id)
        ON DELETE CASCADE,
    INDEX idx_doses_agenda (id_medicamento, horario_previsto)
);

CREATE TABLE cuidador_paciente (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_cuidador BIGINT NOT NULL,
    id_paciente BIGINT NOT NULL,
    autorizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_cuidador_paciente UNIQUE (id_cuidador, id_paciente),
    CONSTRAINT fk_vinculo_cuidador FOREIGN KEY (id_cuidador)
        REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_paciente FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id)
        ON DELETE CASCADE
);

CREATE TABLE acessos_qr (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_paciente BIGINT NOT NULL,
    acessado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,

    CONSTRAINT fk_acessos_paciente FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id)
        ON DELETE CASCADE,
    INDEX idx_acessos_paciente (id_paciente, acessado_em)
);
