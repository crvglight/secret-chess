import type { CartaQualquer } from "./carta.ts";
import { CARTAS_OFICIAIS } from "./cartas/index.ts";
import type { CartasDoJogador, Cor } from "./tipos.ts";

export type Aleatorio = () => number;

/** Gerador pseudoaleatório com semente (para testes e revanches reproduzíveis). */
export function aleatorioComSemente(semente: number): Aleatorio {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Combinacao {
  poder: CartaQualquer;
  desvantagem: CartaQualquer;
  /** peso do poder menos peso da desvantagem */
  saldo: number;
}

export const DIFERENCA_MAXIMA = 1;

/**
 * Chance relativa de uma carta sair: peso 1 sai 5 vezes mais que peso 5.
 * (peso 1 → 5, peso 2 → 4, peso 3 → 3, peso 4 → 2, peso 5 → 1)
 */
export function chanceDoPeso(peso: number): number {
  return Math.max(1, 6 - peso);
}

const chanceDaCombinacao = (c: Combinacao) => chanceDoPeso(c.poder.peso) * chanceDoPeso(c.desvantagem.peso);

/** Sorteio ponderado: cada item sai com probabilidade proporcional à sua chance. */
function escolher<T>(lista: readonly T[], rng: Aleatorio, chance: (item: T) => number): T {
  const total = lista.reduce((s, item) => s + chance(item), 0);
  let r = rng() * total;
  for (const item of lista) {
    r -= chance(item);
    if (r < 0) return item;
  }
  return lista[lista.length - 1]!;
}

/**
 * Sorteia 1 poder e 1 desvantagem para cada lado. O saldo de cada lado
 * (peso do poder menos peso da desvantagem) difere no máximo 1 ponto.
 * Cartas de peso maior saem menos. Prefere que os dois lados tenham cartas diferentes.
 */
export function sortearCartas(
  rng: Aleatorio = Math.random,
  cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS,
  /** Partida com relógio: as cartas que dependem dele (ex.: Lentidão) também entram. */
  comRelogio = false,
): Record<Cor, CartasDoJogador> {
  const sorteaveis = cartas.filter((c) => comRelogio || !c.exigeRelogio);
  const poderes = sorteaveis.filter((c) => c.tipo === "poder");
  const desvantagens = sorteaveis.filter((c) => c.tipo === "desvantagem");
  if (poderes.length === 0 || desvantagens.length === 0) throw new Error("Faltam cartas para o sorteio");

  const combinacoes: Combinacao[] = poderes.flatMap((poder) =>
    desvantagens.map((desvantagem) => ({ poder, desvantagem, saldo: poder.peso - desvantagem.peso })),
  );

  const a = escolher(combinacoes, rng, chanceDaCombinacao);
  const equilibradas = combinacoes.filter((c) => Math.abs(c.saldo - a.saldo) <= DIFERENCA_MAXIMA);
  const diferentes = equilibradas.filter((c) => c.poder !== a.poder && c.desvantagem !== a.desvantagem);
  const b = escolher(diferentes.length > 0 ? diferentes : equilibradas, rng, chanceDaCombinacao);

  const [brancas, pretas] = rng() < 0.5 ? [a, b] : [b, a];
  return {
    brancas: { poder: brancas.poder.id, desvantagem: brancas.desvantagem.id },
    pretas: { poder: pretas.poder.id, desvantagem: pretas.desvantagem.id },
  };
}
