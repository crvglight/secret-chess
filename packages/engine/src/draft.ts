import type { CartaQualquer, TipoCarta } from "./carta.ts";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { chanceDoPeso, type Aleatorio } from "./sorteio.ts";
import type { CartasDoJogador, Cor } from "./tipos.ts";

/**
 * As cartas oferecidas a um jogador no modo Draft: os poderes são para ele;
 * as desvantagens são para ele escolher qual o ADVERSÁRIO vai ter.
 */
export interface OfertaDraft {
  poderes: string[];
  desvantagens: string[];
}

/**
 * Escolha de um lado no Draft: o poder dele e a desvantagem que ele deu ao adversário.
 * (Mesmo formato das cartas, mas `desvantagem` é a do outro lado.)
 */
export type EscolhaDraft = CartasDoJogador;

/** Monta as cartas da partida a partir das escolhas: cada um fica com a desvantagem que o outro escolheu. */
export function cartasDoDraft(escolhas: Record<Cor, EscolhaDraft>): Record<Cor, CartasDoJogador> {
  return {
    brancas: { poder: escolhas.brancas.poder, desvantagem: escolhas.pretas.desvantagem },
    pretas: { poder: escolhas.pretas.poder, desvantagem: escolhas.brancas.desvantagem },
  };
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

/**
 * Re-roll do Draft: troca todas as cartas da oferta por outras, nunca repetindo as de
 * antes. Usa cartas do MESMO peso (a oferta continua tão boa quanto a do adversário);
 * se não sobrar nenhuma daquele peso, usa a do peso mais próximo. `ocupadas` são as
 * cartas que não podem aparecer (as das duas ofertas atuais).
 */
export function rerolarOferta(
  oferta: OfertaDraft,
  rng: Aleatorio = Math.random,
  cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS,
  comRelogio = false,
  ocupadas: ReadonlySet<string> = new Set(),
): OfertaDraft {
  const usadas = new Set([...ocupadas, ...oferta.poderes, ...oferta.desvantagens]);
  const trocar = (id: string) => {
    const atual = obterCarta(id);
    const livres = cartas.filter((c) => c.tipo === atual.tipo && !usadas.has(c.id) && (comRelogio || !c.exigeRelogio));
    if (livres.length === 0) return id; // (só se o baralho inteiro acabasse)
    // Mesmo peso; se não houver, o mais próximo.
    const menorDiferenca = Math.min(...livres.map((c) => Math.abs(c.peso - atual.peso)));
    const opcoes = livres.filter((c) => Math.abs(c.peso - atual.peso) === menorDiferenca);
    const nova = opcoes[Math.floor(rng() * opcoes.length)]!;
    usadas.add(nova.id);
    return nova.id;
  };
  return { poderes: oferta.poderes.map(trocar), desvantagens: oferta.desvantagens.map(trocar) };
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
 * mais forte e dá ao adversário a desvantagem mais pesada (empates ao acaso).
 */
export function escolhaDraftIA(oferta: OfertaDraft, esperta: boolean, rng: Aleatorio = Math.random): EscolhaDraft {
  const escolher = (ids: string[], melhor: (a: number, b: number) => boolean) => {
    if (!esperta) return ids[Math.floor(rng() * ids.length)]!;
    const embaralhadas = [...ids].sort(() => rng() - 0.5);
    return embaralhadas.reduce((m, id) => (melhor(obterCarta(id).peso, obterCarta(m).peso) ? id : m));
  };
  return {
    poder: escolher(oferta.poderes, (a, b) => a > b),
    desvantagem: escolher(oferta.desvantagens, (a, b) => a > b),
  };
}
