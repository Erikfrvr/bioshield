// Testes do value object TokenQR.
// Quem tem o token ve a ficha de emergencia sem login, entao confiro o formato do token gerado,
// que dois tokens nunca saem iguais e que texto qualquer na URL e barrado antes de ir pro banco.
import { describe, expect, test } from '@jest/globals';
import TokenQR from '../../models/valueObjects/TokenQR';

describe('TokenQR', () => {
  test('gerar() devolve 32 caracteres hexadecimais', () => {
    const token = TokenQR.gerar();
    expect(token.getValor()).toMatch(/^[0-9a-f]{32}$/);
  });

  test('dois tokens gerados são diferentes', () => {
    const token1 = TokenQR.gerar();
    const token2 = TokenQR.gerar();
    expect(token1.getValor()).not.toBe(token2.getValor());
  });

  test('aPartirDoValor aceita token válido e guarda em minúsculo e sem espaço', () => {
    const token = TokenQR.aPartirDoValor(' 0123456789ABCDEF0123456789ABCDEF ');
    expect(token.getValor()).toBe('0123456789abcdef0123456789abcdef');
  });

  test('aPartirDoValor rejeita texto que não é token', () => {
    expect(() => TokenQR.aPartirDoValor('abc')).toThrow('O código do QR é inválido.');
  });

  test('aPartirDoValor rejeita token com letra fora do hexadecimal', () => {
    expect(() => TokenQR.aPartirDoValor('z123456789abcdef0123456789abcdef')).toThrow(
      'O código do QR é inválido.'
    );
  });
});
