import type { CartaQualquer, TipoCarta } from "./carta.ts";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { chanceDoPeso, type Aleatorio } from "./sorteio.ts";
import type { CartasDoJogador, Cor } from "./tipos.ts";

/** As cartas oferecidas a um jogador no modo Draft. */
export interface OfertaDraft {
  poderes: string[];
  desvantagens: string[];
}

export const OPCOES_NO_DRAFT = 3;

/**
 * Monta as ofertas do Draft dos dois lados. Para ser justo, as ofertas têm os mesmos
 * pesos: cada "vaga" sorteia um peso e dá uma carta diferente daquele peso para cada lado.
 * Pesos menores saem mais (mesma chance do sorteio normal).
 */
export function sortearDraft(
  rng: Aleatorio = Math.random,
  cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS,
  comRelogio = false,
): Record<Cor, OfertaDraft> {
  const oferta = (tipo: TipoCarta) =>
    montarVagas(cartas.filter((c) => c.tipo === tipo && (comRelogio || !c.exigeRelogio)), rng);
  const poderes = oferta("poder");
  const desvantagens = oferta("desvantagem");
  return {
    brancas: { poderes: poderes.map(([a]) => a), desvantagens: desvantagens.map(([a]) => a) },
    pretas: { poderes: poderes.map(([, b]) => b), desvantagens: desvantagens.map(([, b]) => b) },
  };
}

/** Sorteia OPCOES_NO_DRAFT pares [carta das brancas, carta das pretas] de mesmo peso. */
function montarVagas(cartas: CartaQualquer[], rng: Aleatorio): [string, string][] {
  const restantes = new Map<number, CartaQualquer[]>();
  for (const c of cartas) restantes.set(c.peso, [...(restantes.get(c.peso) ?? []), c]);

  const tirar = (lista: CartaQualquer[]) => lista.splice(Math.floor(rng() * lista.length), 1)[0]!;
  const vagas: [string, string][] = [];
  for (let i = 0; i < OPCOES_NO_DRAFT; i++) {
    // Pesos que ainda têm duas cartas; se nenhum tiver, junta as que sobraram de qualquer peso.
    const pesos = [...restantes.entries()].filter(([, l]) => l.length >= 2).map(([p]) => p);
    if (pesos.length > 0) {
      const peso = escolherPeso(pesos, rng);
      const lista = restantes.get(peso)!;
      vagas.push([tirar(lista).id, tirar(lista).id]);
    } else {
      const todas = [...restantes.values()].flat();
      if (todas.length < 2) throw new Error("Faltam cartas para o draft");
      const a = tirar(todas);
      const b = tirar(todas);
      restantes.forEach((l, p) => restantes.set(p, l.filter((c) => c !== a && c !== b)));
      vagas.push([a.id, b.id]);
    }
  }
  return vagas;
}

function escolherPeso(pesos: number[], rng: Aleatorio): number {
  const total = pesos.reduce((s, p) => s + chanceDoPeso(p), 0);
  let r = rng() * total;
  for (const p of pesos) {
    r -= chanceDoPeso(p);
    if (r < 0) return p;
  }
  return pesos[pesos.length - 1]!;
}

/**
 * Escolha da IA no Draft. No fácil, escolhe ao acaso; nos outros níveis, pega o poder
 * mais forte e a desvantagem mais leve (empates ao acaso).
 */
export function escolhaDraftIA(oferta: OfertaDraft, esperta: boolean, rng: Aleatorio = Math.random): CartasDoJogador {
  const escolher = (ids: string[], melhor: (a: number, b: number) => boolean) => {
    if (!esperta) return ids[Math.floor(rng() * ids.length)]!;
    const embaralhadas = [...ids].sort(() => rng() - 0.5);
    return embaralhadas.reduce((m, id) => (melhor(obterCarta(id).peso, obterCarta(m).peso) ? id : m));
  };
  return {
    poder: escolher(oferta.poderes, (a, b) => a > b),
    desvantagem: escolher(oferta.desvantagens, (a, b) => a < b),
  };
}
