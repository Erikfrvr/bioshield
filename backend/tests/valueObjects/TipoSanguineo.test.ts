// Testes do value object TipoSanguineo.
// Esse dado aparece na ficha de emergencia, entao confiro que so os oito tipos passam,
// que a escrita e normalizada e que o campo vazio vira null.
import { describe, expect, test } from '@jest/globals';
import TipoSanguineo from '../../models/valueObjects/TipoSanguineo';

const MENSAGEM_INVALIDO = 'Tipo sanguíneo inválido. Use A+, A-, B+, B-, AB+, AB-, O+ ou O-.';

describe('TipoSanguineo', () => {
  test('aceita os oito tipos', () => {
    const tipos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (const tipo of tipos) {
      expect(new TipoSanguineo(tipo).getValor()).toBe(tipo);
    }
  });

  test('normaliza " ab- " para "AB-"', () => {
    expect(new TipoSanguineo(' ab- ').getValor()).toBe('AB-');
  });

  test('rejeita "0+" escrito com zero', () => {
    expect(() => new TipoSanguineo('0+')).toThrow(MENSAGEM_INVALIDO);
  });

  test('rejeita "C+"', () => {
    expect(() => new TipoSanguineo('C+')).toThrow(MENSAGEM_INVALIDO);
  });

  test('rejeita "A" sem o fator Rh', () => {
    expect(() => new TipoSanguineo('A')).toThrow(MENSAGEM_INVALIDO);
  });

  test('TipoSanguineo.opcional("") devolve null', () => {
    expect(TipoSanguineo.opcional('')).toBeNull();
    expect(TipoSanguineo.opcional(null)).toBeNull();
    expect(TipoSanguineo.opcional(undefined)).toBeNull();
  });

  test('TipoSanguineo.opcional com valor válido devolve o tipo', () => {
    expect(TipoSanguineo.opcional('o-')?.getValor()).toBe('O-');
  });
});
