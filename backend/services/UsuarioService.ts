import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { UsuarioRepository } from '../repository/UsuarioRepository';
import { Usuario } from '../models/entidade/Usuario';
import { Email } from '../models/valueObjects/Email';
import { Senha } from '../models/valueObjects/Senha';
import { UsuarioDTO } from '../models/dto/usuario/UsuarioDTO';
import { ErroDeDominio } from '../shared/ErroDeDominio';

// Regra de negocio da conta.
// Aqui eu verifico se o email ja existe, crio os value objects Email e Senha pra validar,
// gero o hash da senha antes de mandar pro banco e monto o DTO de resposta sem a senha.
export class UsuarioService {
    private usuarioRepository: UsuarioRepository;

    constructor(usuarioRepository: UsuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    async criarUsuario(dados: { nome: string; email: string; senha: string }): Promise<UsuarioDTO> {
        // Cria os value objects Email e Senha para validação
        const emailVO = new Email(dados.email);
        const senhaVO = Senha.criar(dados.senha);

        // Verifica se o email já existe
        const emailExistente = await this.usuarioRepository.buscarPorEmail(emailVO);

        if (emailExistente) {
            throw new ErroDeDominio('Email já cadastrado.', 409);
        }

        // Gera o hash da senha
        const senhaHash = await hash(senhaVO.getValor(), 10);

        // Monta a entidade já com a senha criptografada
        const usuario = new Usuario(
            randomUUID(),
            dados.nome,
            emailVO,
            Senha.restaurarDoHash(senhaHash)
        );

        // Cria o usuário no banco
        await this.usuarioRepository.salvar(usuario);

        // Monta o DTO de resposta sem a senha
        return new UsuarioDTO(usuario.id, usuario.nome, usuario.email.getValue());
    }
}