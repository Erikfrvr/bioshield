import { Email } from '../valueObjects/Email';
import { Senha } from '../valueObjects/Senha';
import { ErroDeDominio } from '../../shared/ErroDeDominio';

// Entidade Usuario: a conta de quem usa o app.
// Guarda nome, email e senha com atributos privados e getters e setters.
// Email e Senha entram como value objects, entao conta invalida nem chega a existir.

export class Usuario {
    private readonly _id: string;
    private _nome: string;
    private _email: Email;
    private _senha: Senha;

    constructor(id: string, nome: string, email: Email, senha: Senha) {
        this._id = Usuario.validarId(id);
        this._nome = Usuario.validarNome(nome);
        this._email = email;
        this._senha = senha;
    }

    get id(): string {
        return this._id;
    }

    get nome(): string {
        return this._nome;
    }

    set nome(nome: string) {
        this._nome = Usuario.validarNome(nome);
    }

    get email(): Email {
        return this._email;
    }

    set email(email: Email) {
        this._email = email;
    }

    get senha(): Senha {
        return this._senha;
    }

    set senha(senha: Senha) {
        this._senha = senha;
    }

    ehOMesmoQue(outro: Usuario): boolean {
        return outro instanceof Usuario && outro.id === this._id;
    }

    private static validarId(id: string): string {
        const limpo = id ? id.trim() : '';

        if (limpo.length === 0) {
            throw new ErroDeDominio('O id do usuário é obrigatório');
        }

        return limpo;
    }

    private static validarNome(nome: string): string {
        const limpo = nome ? nome.trim() : '';

        if (limpo.length < 3) {
            throw new ErroDeDominio('O nome precisa ter ao menos 3 caracteres');
        }

        if (limpo.length > 100) {
            throw new ErroDeDominio('O nome não pode passar de 100 caracteres');
        }

        return limpo;
    }
}