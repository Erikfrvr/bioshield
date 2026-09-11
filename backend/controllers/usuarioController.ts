import { Request, Response } from 'express';
import usuarioService from '../services/usuarioService';

// Controller de usuario: recebe a requisicao, entrega pro service e devolve a resposta.
// Aqui eu so trato req e res e os status code, nada de regra de negocio e nada de SQL.
// Cada funcao vai num try catch devolvendo 500 com mensagem clara quando der ruim.

type ErroComStatus = Error & { statusCode?: number };

const tratarErro = (res: Response, error: unknown, mensagem: string): void => {
    console.error(mensagem, error);

    const erro = error as ErroComStatus;
    const statusCode = typeof erro?.statusCode === 'number' ? erro.statusCode : 500;

    res.status(statusCode).json({
        mensagem: statusCode === 500 ? mensagem : erro.message
    });
};

export const criarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            res.status(400).json({ mensagem: 'Informe nome, email e senha' });
            return;
        }

        const novoUsuario = await usuarioService.criarUsuario({ nome, email, senha });
        res.status(201).json(novoUsuario);
    } catch (error) {
        tratarErro(res, error, 'Erro ao criar usuário');
    }
};

export const listarUsuarios = async (_req: Request, res: Response): Promise<void> => {
    try {
        const usuarios = await usuarioService.listarUsuarios();
        res.status(200).json(usuarios);
    } catch (error) {
        tratarErro(res, error, 'Erro ao listar usuários');
    }
};

export const buscarUsuarioPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuario = await usuarioService.buscarUsuarioPorId(id);

        if (!usuario) {
            res.status(404).json({ mensagem: 'Usuário não encontrado' });
            return;
        }

        res.status(200).json(usuario);
    } catch (error) {
        tratarErro(res, error, 'Erro ao buscar usuário');
    }
};

export const atualizarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nome, email, senha } = req.body;

        const dados: { nome?: string; email?: string; senha?: string } = {};
        if (nome !== undefined) dados.nome = nome;
        if (email !== undefined) dados.email = email;
        if (senha !== undefined) dados.senha = senha;

        if (Object.keys(dados).length === 0) {
            res.status(400).json({ mensagem: 'Informe ao menos um campo para atualizar' });
            return;
        }

        const usuarioAtualizado = await usuarioService.atualizarUsuario(id, dados);

        if (!usuarioAtualizado) {
            res.status(404).json({ mensagem: 'Usuário não encontrado' });
            return;
        }

        res.status(200).json(usuarioAtualizado);
    } catch (error) {
        tratarErro(res, error, 'Erro ao atualizar usuário');
    }
};

export const deletarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const usuarioDeletado = await usuarioService.deletarUsuario(id);

        if (!usuarioDeletado) {
            res.status(404).json({ mensagem: 'Usuário não encontrado' });
            return;
        }

        res.status(200).json({ mensagem: 'Usuário deletado com sucesso' });
    } catch (error) {
        tratarErro(res, error, 'Erro ao deletar usuário');
    }
};