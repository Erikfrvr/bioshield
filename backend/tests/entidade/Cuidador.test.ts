// Testes da entidade Cuidador.
// Desvincular nao apaga a linha, so desliga o acesso, entao confiro que o vinculo fica inativo
// e que desfazer um vinculo que ja foi desfeito da erro em vez de passar calado.
import { describe, expect, test } from '@jest/globals';
import Cuidador from '../../models/entidade/Cuidador';

describe('Cuidador', () => {
  test('vínculo novo começa ativo', () => {
    expect(new Cuidador(1, 2).estaAtivo()).toBe(true);
  });

  test('desvincular() deixa o vínculo inativo', () => {
    const cuidador = new Cuidador(1, 2);
    cuidador.desvincular();
    expect(cuidador.estaAtivo()).toBe(false);
  });

  test('desvincular duas vezes dá erro', () => {
    const cuidador = new Cuidador(1, 2);
    cuidador.desvincular();
    expect(() => cuidador.desvincular()).toThrow('Esse vínculo já foi desfeito.');
  });

  test('reativar volta o vínculo e troca a data da autorização', () => {
    const cuidador = new Cuidador(1, 2, 10, new Date('2026-01-01T10:00:00'));
    const novaData = new Date('2026-10-04T10:00:00');

    cuidador.desvincular();
    cuidador.reativar(novaData);

    expect(cuidador.estaAtivo()).toBe(true);
    expect(cuidador.getAutorizadoEm()).toBe(novaData);
  });

  test('rejeita id de paciente inválido', () => {
    expect(() => new Cuidador(1, 0)).toThrow('O id do paciente é inválido.');
  });
});
