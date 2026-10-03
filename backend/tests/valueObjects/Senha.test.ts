// Testes do value object Senha.
// Confiro as regras de forca (tamanho, maiuscula, minuscula, numero e especial)
// e que a senha nunca aparece quando o objeto vira texto.
import { describe, expect, test } from '@jest/globals';
import Senha from '../../models/valueObjects/Senha';

const MENSAGEM_FORCA =
  'A senha precisa ter letra maiúscula, letra minúscula, número e um caractere especial (@ $ ! % * ? & #).';

describe('Senha', () => {
  test('aceita senha com 8 caracteres, maiúscula, minúscula, número e caractere especial', () => {
    const senha = Senha.criar('Abcdef1@');
    expect(senha.getValor()).toBe('Abcdef1@');
    expect(senha.ehHash()).toBe(false);
  });

  test('rejeita senha curta', () => {
    expect(() => Senha.criar('Ab1@')).toThrow('A senha precisa ter pelo menos 8 caracteres.');
  });

  test('rejeita senha sem letra maiúscula', () => {
    expect(() => Senha.criar('abcdef1@')).toThrow(MENSAGEM_FORCA);
  });

  test('rejeita senha sem letra minúscula', () => {
    expect(() => Senha.criar('ABCDEF1@')).toThrow(MENSAGEM_FORCA);
  });

  test('rejeita senha sem número', () => {
    expect(() => Senha.criar('Abcdefg@')).toThrow(MENSAGEM_FORCA);
  });

  test('rejeita senha sem caractere especial', () => {
    expect(() => Senha.criar('Abcdefg1')).toThrow(MENSAGEM_FORCA);
  });

  test('String(senha) mostra só ******** e nunca a senha', () => {
    const senha = Senha.criar('Abcdef1@');

    expect(String(senha)).toBe('********');
    expect(String(senha)).not.toContain('Abcdef1@');
    expect(JSON.stringify({ senha })).toBe('{"senha":"********"}');
  });
});
