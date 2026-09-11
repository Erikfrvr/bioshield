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

