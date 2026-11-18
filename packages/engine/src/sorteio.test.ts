import { describe, expect, it } from "vitest";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { aleatorioComSemente, DIFERENCA_MAXIMA, sortearCartas } from "./sorteio.ts";
import type { CartasDoJogador } from "./tipos.ts";

const saldo = (c: CartasDoJogador) => obterCarta(c.poder!).peso - obterCarta(c.desvantagem!).peso;

describe("sorteio equilibrado", () => {
  it("cada lado recebe 1 poder e 1 desvantagem, com saldo diferindo no máximo 1", () => {
    const rng = aleatorioComSemente(42);
    for (let i = 0; i < 1000; i++) {
      const { brancas, pretas } = sortearCartas(rng);
      for (const lado of [brancas, pretas]) {
        expect(obterCarta(lado.poder!).tipo).toBe("poder");
        expect(obterCarta(lado.desvantagem!).tipo).toBe("desvantagem");
      }
      expect(Math.abs(saldo(brancas) - saldo(pretas))).toBeLessThanOrEqual(DIFERENCA_MAXIMA);
    }
  });

  it("com as cartas atuais, os dois lados sempre recebem cartas diferentes", () => {
    const rng = aleatorioComSemente(7);
    for (let i = 0; i < 500; i++) {
      const { brancas, pretas } = sortearCartas(rng);
      expect(brancas.poder).not.toBe(pretas.poder);
      expect(brancas.desvantagem).not.toBe(pretas.desvantagem);
    }
  });

  it("cartas de peso maior saem menos", () => {
    const rng = aleatorioComSemente(99);
    const vezes = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const { brancas, pretas } = sortearCartas(rng);
      for (const id of [brancas.poder, brancas.desvantagem, pretas.poder, pretas.desvantagem]) {
        vezes.set(id!, (vezes.get(id!) ?? 0) + 1);
      }
    }
    // Média de aparições por carta, agrupada pelo peso.
    const mediaDoPeso = (peso: number) => {
      const cartas = CARTAS_OFICIAIS.filter((c) => c.peso === peso);
      return cartas.reduce((s, c) => s + (vezes.get(c.id) ?? 0), 0) / cartas.length;
    };
    expect(mediaDoPeso(4)).toBeLessThan(mediaDoPeso(3));
    expect(mediaDoPeso(3)).toBeLessThan(mediaDoPeso(2));
    expect(mediaDoPeso(2)).toBeLessThan(mediaDoPeso(1));
  });

  it("a mesma semente dá o mesmo sorteio", () => {
    expect(sortearCartas(aleatorioComSemente(5))).toEqual(sortearCartas(aleatorioComSemente(5)));
  });
});
