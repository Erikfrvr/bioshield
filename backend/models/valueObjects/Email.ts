import { ErroDeDominio } from '../../shared/ErroDeDominio';
// Value object Email: valida o formato no construtor e guarda sempre em minusculo e sem espaco.
// Se o email for invalido eu jogo erro ali mesmo, assim nunca entra email quebrado no banco.
export class Email {
    private static readonly TAMANHO_MAXIMO = 254;
    private static readonly FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    private readonly value: string;

    constructor(email: string) {
        const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (sanitizedEmail.length === 0) {
            throw new ErroDeDominio('O email é obrigatório');
        }

        if (sanitizedEmail.length > Email.TAMANHO_MAXIMO) {
            throw new ErroDeDominio('O email não pode passar de 254 caracteres');
        }

        if (!Email.FORMATO.test(sanitizedEmail)) {
            throw new ErroDeDominio('Formato de email inválido');
        }

        this.value = sanitizedEmail;
    }

    public getValue(): string {
        return this.value;
    }

    public equals(outro: Email): boolean {
        return outro instanceof Email && outro.getValue() === this.value;
    }

    public toString(): string {
        return this.value;
    }
}