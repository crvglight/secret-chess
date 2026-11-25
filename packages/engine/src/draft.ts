import type { CartaQualquer, TipoCarta } from "./carta.ts";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { escolherPonderado, sortearDesvantagemExtra, type Aleatorio } from "./sorteio.ts";
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

/**
 * Monta as cartas da partida a partir das escolhas: cada um fica com a desvantagem que o
 * outro escolheu. Spyware no Draft não vira carta: quem o escolhe fica sem poder e o
 * adversário recebe direto uma desvantagem extra (sorteada).
 */
export function cartasDoDraft(escolhas: Record<Cor, EscolhaDraft>, rng: Aleatorio = Math.random): Record<Cor, CartasDoJogador> {
  const cartas: Record<Cor, CartasDoJogador> = {
    brancas: { poder: escolhas.brancas.poder, desvantagem: escolhas.pretas.desvantagem },
    pretas: { poder: escolhas.pretas.poder, desvantagem: escolhas.brancas.desvantagem },
  };
  for (const cor of ["brancas", "pretas"] as const) {
    if (cartas[cor].poder !== "spyware") continue;
    const adv = cor === "brancas" ? "pretas" : "brancas";
    cartas[cor].poder = null;
    cartas[adv].extra = sortearDesvantagemExtra(rng, [cartas[adv].desvantagem]);
  }
  return cartas;
}

export const OPCOES_NO_DRAFT = 3;

/** Cartas que podem aparecer no Draft (sem as marcadas como fora dele). */
const doDraft = (cartas: readonly CartaQualquer[], tipo: TipoCarta, comRelogio: boolean) =>
  cartas.filter((c) => c.tipo === tipo && !c.foraDoDraft && (comRelogio || !c.exigeRelogio));

/** Diferença máxima entre a soma dos pesos das ofertas dos dois lados. */
const DIFERENCA_MAXIMA_DRAFT = 1;
const TENTATIVAS = 400;

const soma = (ids: readonly string[]) => ids.reduce((t, id) => t + obterCarta(id).peso, 0);

/**
 * Chance de cada carta no Draft, por peso. Já compensa o filtro de justiça (que, sozinho,
 * derruba as cartas de peso muito alto ou muito baixo): no fim, peso maior sai só um
 * pouco menos — aproximadamente 100% / 90% / 80% / 70% / 60% do peso 1 ao 5.
 */
const CHANCE_NO_DRAFT = [1.2, 0.9, 0.8, 0.8, 1.15];
const chanceNoDraft = (peso: number) => CHANCE_NO_DRAFT[Math.max(1, Math.min(5, peso)) - 1]!;

/** Sorteia `n` cartas diferentes (peso maior sai um pouco menos), sem as de `usadas`. */
function sortearVarias(cartas: readonly CartaQualquer[], rng: Aleatorio, usadas: Set<string>, n = OPCOES_NO_DRAFT): string[] {
  const escolhidas: string[] = [];
  for (let i = 0; i < n; i++) {
    const livres = cartas.filter((c) => !usadas.has(c.id));
    if (livres.length === 0) throw new Error("Faltam cartas para o draft");
    const c = escolherPonderado(livres, rng, (x) => chanceNoDraft(x.peso) * (x.raridade ?? 1));
    usadas.add(c.id);
    escolhidas.push(c.id);
  }
  return escolhidas;
}

/**
 * Monta as ofertas do Draft dos dois lados. Cada lado recebe 3 poderes e 3 desvantagens
 * sorteados carta a carta, com uma diferença leve entre os pesos (fatorDoPeso: peso maior
 * sai um pouco menos). Para ser justo, a soma dos pesos das ofertas dos dois lados difere
 * no máximo 1 ponto (sorteia de novo até dar).
 */
export function sortearDraft(
  rng: Aleatorio = Math.random,
  cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS,
  comRelogio = false,
): Record<Cor, OfertaDraft> {
  const poderes = doDraft(cartas, "poder", comRelogio);
  const desvantagens = doDraft(cartas, "desvantagem", comRelogio);
  let ultima: Record<Cor, OfertaDraft> | null = null;
  for (let t = 0; t < TENTATIVAS; t++) {
    const usadas = new Set<string>();
    const oferta: Record<Cor, OfertaDraft> = {
      brancas: { poderes: sortearVarias(poderes, rng, usadas), desvantagens: sortearVarias(desvantagens, rng, usadas) },
      pretas: { poderes: sortearVarias(poderes, rng, usadas), desvantagens: sortearVarias(desvantagens, rng, usadas) },
    };
    ultima = oferta;
    const justa =
      Math.abs(soma(oferta.brancas.poderes) - soma(oferta.pretas.poderes)) <= DIFERENCA_MAXIMA_DRAFT &&
      Math.abs(soma(oferta.brancas.desvantagens) - soma(oferta.pretas.desvantagens)) <= DIFERENCA_MAXIMA_DRAFT;
    if (justa) return oferta;
  }
  return ultima!;
}

/**
 * Re-roll do Draft: troca todas as cartas da oferta por outras, nunca repetindo as de
 * antes (nem as de `ocupadas`, as das duas ofertas atuais). A soma dos pesos da oferta
 * nova fica a no máximo 1 ponto da antiga, para continuar justa com a do adversário.
 */
export function rerolarOferta(
  oferta: OfertaDraft,
  rng: Aleatorio = Math.random,
  cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS,
  comRelogio = false,
  ocupadas: ReadonlySet<string> = new Set(),
): OfertaDraft {
  const proibidas = new Set([...ocupadas, ...oferta.poderes, ...oferta.desvantagens]);
  const poderes = doDraft(cartas, "poder", comRelogio);
  const desvantagens = doDraft(cartas, "desvantagem", comRelogio);
  let melhor: OfertaDraft | null = null;
  let melhorErro = Infinity;
  for (let t = 0; t < TENTATIVAS; t++) {
    const usadas = new Set(proibidas);
    const nova = { poderes: sortearVarias(poderes, rng, usadas), desvantagens: sortearVarias(desvantagens, rng, usadas) };
    const erro =
      Math.abs(soma(nova.poderes) - soma(oferta.poderes)) + Math.abs(soma(nova.desvantagens) - soma(oferta.desvantagens));
    if (Math.abs(soma(nova.poderes) - soma(oferta.poderes)) <= DIFERENCA_MAXIMA_DRAFT &&
      Math.abs(soma(nova.desvantagens) - soma(oferta.desvantagens)) <= DIFERENCA_MAXIMA_DRAFT) return nova;
    if (erro < melhorErro) {
      melhor = nova;
      melhorErro = erro;
    }
  }
  return melhor!;
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
