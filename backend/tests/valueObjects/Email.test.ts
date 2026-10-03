// Testes do value object Email.
// Confiro que o email e guardado limpo e em minusculo, que formato quebrado e barrado
// e que dois emails com o mesmo texto sao considerados iguais.
import { describe, expect, test } from '@jest/globals';
import Email from '../../models/valueObjects/Email';

describe('Email', () => {
  test('aceita email válido e guarda em minúsculo e sem espaço', () => {
    const email = new Email(' Maria@Exemplo.COM ');
    expect(email.getValor()).toBe('maria@exemplo.com');
  });

  test('aceita outros formatos válidos', () => {
    expect(new Email('joao.silva@empresa.com.br').getValor()).toBe('joao.silva@empresa.com.br');
    expect(new Email('ana+remedios@gmail.com').getValor()).toBe('ana+remedios@gmail.com');
  });

  test('rejeita email sem arroba', () => {
    expect(() => new Email('semarroba')).toThrow('O email informado não é válido.');
  });

  test('rejeita email com final de uma letra só', () => {
    expect(() => new Email('a@b.c')).toThrow('O email informado não é válido.');
  });

  test('rejeita email com espaço no meio', () => {
    expect(() => new Email('maria teste@exemplo.com')).toThrow('O email informado não é válido.');
  });

  test('rejeita email vazio', () => {
    expect(() => new Email('   ')).toThrow('O email é obrigatório.');
  });

  test('igualA compara pelo valor', () => {
    const email1 = new Email('maria@exemplo.com');
    const email2 = new Email(' MARIA@exemplo.com ');
    const email3 = new Email('joao@exemplo.com');

    expect(email1.igualA(email2)).toBe(true);
    expect(email1.igualA(email3)).toBe(false);
  });
});
