// Regra de negocio da conta.
// Aqui eu verifico se o email ja existe, crio os value objects Email e Senha pra validar,
// gero o hash da senha antes de mandar pro banco e monto o DTO de resposta sem a senha.
import bcrypt from "bcryptjs";
import usuarioInfrastructure from "../infrastructure/usuarioInfrastructure";
import Usuario from "../models/entidade/Usuario";
import Email from "../models/valueObjects/Email";
import Senha from "../models/valueObjects/Senha";
import { CadastrarUsuarioDTO } from "../models/dto/usuario/CadastrarUsuarioDTO";
import { LoginUsuarioDTO } from "../models/dto/usuario/LoginUsuarioDTO";
import { UsuarioResponseDTO } from "../models/dto/usuario/UsuarioResponseDTO";
import { UsuarioRepository } from "../repository/UsuarioRepository";

