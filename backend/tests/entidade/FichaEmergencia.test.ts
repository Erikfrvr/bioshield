// Testes da entidade FichaEmergencia.
// Quem socorre le a ficha de cima pra baixo, entao confiro que a alergia grave vem primeiro
// e que remedio que a pessoa nao toma mais nao aparece pra confundir.
import { describe, expect, test } from '@jest/globals';
import FichaEmergencia from '../../models/entidade/FichaEmergencia';

describe('FichaEmergencia', () => {
  test('alergia grave aparece antes da leve', () => {
    const ficha = new FichaEmergencia('Maria', 'O+', null, null, new Date(), [
      { substancia: 'Lactose', gravidade: 'leve', observacao: null },
      { substancia: 'Penicilina', gravidade: 'grave', observacao: null },
      { substancia: 'Dipirona', gravidade: 'moderada', observacao: null },
    ]);

    const substancias = ficha.getAlergias().map((a) => a.substancia);
    expect(substancias).toEqual(['Penicilina', 'Dipirona', 'Lactose']);
    expect(ficha.temAlergiaGrave()).toBe(true);
  });

  test('remédio com ativo: false não aparece na ficha', () => {
    const ficha = new FichaEmergencia('Maria', 'O+', null, null, new Date(), [], [
      { nome: 'Losartana', dosagem: 50, unidade: 'mg', frequenciaHoras: 12, ativo: true },
      { nome: 'Amoxicilina', dosagem: 500, unidade: 'mg', frequenciaHoras: 8, ativo: false },
    ]);

    const nomes = ficha.getMedicamentos().map((m) => m.nome);
    expect(nomes).toEqual(['Losartana']);
  });

  test('contato de prioridade 1 aparece primeiro', () => {
    const ficha = new FichaEmergencia('Maria', null, null, null, new Date(), [], [], [
      { nome: 'Pedro', telefone: '11987654321', parentesco: 'Irmão', prioridade: 2 },
      { nome: 'Ana', telefone: '11912345678', parentesco: 'Mãe', prioridade: 1 },
    ]);

    expect(ficha.getContatos()[0].nome).toBe('Ana');
  });

  test('rejeita ficha sem nome', () => {
    expect(() => new FichaEmergencia('  ', null, null, null, new Date())).toThrow(
      'A ficha de emergência precisa do nome do titular.'
    );
  });
});
