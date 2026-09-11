import { ErroDeDominio } from '../../shared/ErroDeDominio';

// Value object Senha: define o mínimo de caracteres e as regras de força.
// A senha só vira hash na camada de service, aqui eu cuido só da validação.

export class Senha {
    private static readonly TAMANHO_MINIMO = 8;
    private static readonly TAMANHO_MAXIMO = 72;

    private readonly valor: string;
    private readonly criptografada: boolean;

    private constructor(valor: string, criptografada: boolean) {
        this.valor = valor;
        this.criptografada = criptografada;
    }

    public static criar(valor: string): Senha {
        const problemas = Senha.problemas(valor);

        if (problemas.length > 0) {
            throw new ErroDeDominio(`Senha inválida: ${problemas.join('; ')}.`);
        }

        return new Senha(valor, false);
    }

    public static restaurarDoHash(hash: string): Senha {
        if (typeof hash !== 'string' || hash.trim().length === 0) {
            throw new ErroDeDominio('Hash de senha inválido');
        }

        return new Senha(hash, true);
    }

    public static valida(valor: string): boolean {
        return Senha.problemas(valor).length === 0;
    }

    public static problemas(valor: string): string[] {
        if (typeof valor !== 'string' || valor.length === 0) {
            return ['a senha é obrigatória'];
        }

        const lista: string[] = [];

        if (valor.length < Senha.TAMANHO_MINIMO) {
            lista.push(`precisa de ao menos ${Senha.TAMANHO_MINIMO} caracteres`);
        }

        if (valor.length > Senha.TAMANHO_MAXIMO) {
            lista.push(`não pode passar de ${Senha.TAMANHO_MAXIMO} caracteres`);
        }

        if (!/[A-Z]/.test(valor)) {
            lista.push('precisa de ao menos uma letra maiúscula');
        }

        if (!/[a-z]/.test(valor)) {
            lista.push('precisa de ao menos uma letra minúscula');
        }

        if (!/\d/.test(valor)) {
            lista.push('precisa de ao menos um número');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(valor)) {
            lista.push('precisa de ao menos um caractere especial');
        }

        return lista;
    }

    public estaCriptografada(): boolean {
        return this.criptografada;
    }

    public getValor(): string {
        return this.valor;
    }

    public toString(): string {
        return '********';
    }

    public toJSON(): string {
        return '********';
    }
}