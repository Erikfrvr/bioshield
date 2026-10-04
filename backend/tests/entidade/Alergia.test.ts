// Testes da entidade Alergia.
// A alergia e o primeiro aviso que o socorrista le na ficha, entao confiro o padrao "moderada"
// igual ao DEFAULT do banco e que gravidade fora da lista ou substancia vazia nao entram.
import { describe, expect, test } from '@jest/globals';
import Alergia from '../../models/entidade/Alergia';

describe('Alergia', () => {
  test('sem gravidade, a alergia fica "moderada"', () => {
    const alergia = new Alergia('Dipirona');
    expect(alergia.getGravidade()).toBe('moderada');
  });

  test('gravidade vazia também vira "moderada"', () => {
    expect(new Alergia('Dipirona', '').getGravidade()).toBe('moderada');
  });

  test('normaliza a gravidade e a substância', () => {
    const alergia = new Alergia('  Penicilina ', ' GRAVE ');
    expect(alergia.getSubstancia()).toBe('Penicilina');
    expect(alergia.getGravidade()).toBe('grave');
    expect(alergia.ehGrave()).toBe(true);
  });

  test('rejeita gravidade "fatal"', () => {
    expect(() => new Alergia('Dipirona', 'fatal')).toThrow(
      'A gravidade da alergia precisa ser leve, moderada ou grave.'
    );
  });

  test('rejeita substância vazia', () => {
    expect(() => new Alergia('   ')).toThrow('Informe a substância da alergia.');
  });
});
