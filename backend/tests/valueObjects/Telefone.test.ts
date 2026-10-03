// Testes do value object Telefone.
// Numero errado no contato de emergencia significa ninguem sendo avisado,
// entao confiro a limpeza da mascara, o tamanho, o DDD e o 9 do celular.
import { describe, expect, test } from '@jest/globals';
import Telefone from '../../models/valueObjects/Telefone';

describe('Telefone', () => {
  test('"(11) 98765-4321" vira "11987654321"', () => {
    expect(new Telefone('(11) 98765-4321').getValor()).toBe('11987654321');
  });

  test('aceita telefone fixo com 10 dígitos', () => {
    expect(new Telefone('(11) 3456-7890').getValor()).toBe('1134567890');
  });

  test('rejeita número curto', () => {
    expect(() => new Telefone('98765-4321')).toThrow(
      'O telefone precisa ter DDD e número, com 10 ou 11 dígitos.'
    );
  });

  test('rejeita DDD 01', () => {
    expect(() => new Telefone('(01) 98765-4321')).toThrow('O DDD do telefone não é válido.');
  });

  test('rejeita celular sem o 9 depois do DDD', () => {
    expect(() => new Telefone('(11) 88765-4321')).toThrow(
      'Celular com 11 dígitos precisa começar com 9 depois do DDD.'
    );
  });
});
