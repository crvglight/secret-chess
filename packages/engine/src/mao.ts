// Modo Mão de cartas: cada lado tem cartas de poder de uso único na mão.
// Jogar uma carta põe o poder dela no lugar do "poder" do jogador por uma rodada
// (a vez dele e a do adversário). Assim os poderes funcionam igual ao modo Padrão.
import type { CartaQualquer } from "./carta.ts";
import { CARTAS_OFICIAIS, obterCarta } from "./cartas/index.ts";
import { chanceDoPeso, type Aleatorio } from "./sorteio.ts";
import { clonarMao } from "./tabuleiro.ts";
import type { Cor, Estado, MaoDeCartas } from "./tipos.ts";

export const MAO_INICIAL = 3;
export const MAO_MAXIMA = 5;
/** A cada quantos lances próprios o jogador compra uma carta. */
export const LANCES_POR_CARTA = 10;
const TAMANHO_BARALHO = 24;

/** Poderes que não fazem sentido como carta de uso único. */
const FORA_DA_MAO = new Set(["segunda-chance"]);

export function cartasDaMao(cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS): CartaQualquer[] {
  return cartas.filter((c) => c.tipo === "poder" && !FORA_DA_MAO.has(c.id) && !c.foraDaMao && !c.exigeRelogio && !c.exigeOnline);
}

function sortearPeso(pesos: number[], rng: Aleatorio): number {
  const total = pesos.reduce((s, p) => s + chanceDoPeso(p), 0);
  let r = rng() * total;
  for (const p of pesos) {
    r -= chanceDoPeso(p);
    if (r < 0) return p;
  }
  return pesos[pesos.length - 1]!;
}

/**
 * Monta os baralhos dos dois lados com a mesma sequência de pesos
 * (cada posição sorteia um peso e uma carta daquele peso para cada lado).
 * Sem repetição: cada poder aparece no máximo uma vez no baralho de cada lado.
 */
export function montarMaos(rng: Aleatorio = Math.random, cartas: readonly CartaQualquer[] = CARTAS_OFICIAIS): MaoDeCartas {
  // Cartas que ainda podem sair, separadas por peso, para cada lado.
  const restantes = (): Map<number, CartaQualquer[]> => {
    const porPeso = new Map<number, CartaQualquer[]>();
    for (const c of cartasDaMao(cartas)) porPeso.set(c.peso, [...(porPeso.get(c.peso) ?? []), c]);
    return porPeso;
  };
  const sobra = { brancas: restantes(), pretas: restantes() };
  const tirar = (lista: CartaQualquer[]) => lista.splice(Math.floor(rng() * lista.length), 1)[0]!.id;

  const brancas: string[] = [];
  const pretas: string[] = [];
  for (let i = 0; i < TAMANHO_BARALHO; i++) {
    // Só pesos que ainda têm carta para os dois lados.
    const pesos = [...sobra.brancas.keys()].filter(
      (p) => sobra.brancas.get(p)!.length > 0 && (sobra.pretas.get(p)?.length ?? 0) > 0,
    );
    if (pesos.length === 0) break;
    const peso = sortearPeso(pesos, rng);
    brancas.push(tirar(sobra.brancas.get(peso)!));
    pretas.push(tirar(sobra.pretas.get(peso)!));
  }
  return {
    mao: { brancas: brancas.slice(0, MAO_INICIAL), pretas: pretas.slice(0, MAO_INICIAL) },
    baralho: { brancas: brancas.slice(MAO_INICIAL), pretas: pretas.slice(MAO_INICIAL) },
    jogada: { brancas: null, pretas: null },
  };
}

/** Motivo para não poder jogar carta agora (null = pode). */
export function travaDaMao(estado: Estado, cor: Cor = estado.vez): string | null {
  if (!estado.mao) return "Esta partida não usa mão de cartas";
  if (estado.resultado) return "A partida já terminou";
  if (estado.vez !== cor) return "Espere a sua vez";
  if (estado.mao.jogada[cor]) return "Você já jogou uma carta nesta rodada";
  if (estado.mao.mao[cor].length === 0) return "Sua mão está vazia";
  return null;
}

/**
 * Joga a carta `indice` da mão de quem tem a vez: o poder dela fica em jogo por
 * uma rodada. Não gasta o lance (depois disso o jogador ainda usa o poder e joga).
 */
export function jogarCartaDaMao(estado: Estado, indice: number): Estado {
  const cor = estado.vez;
  const trava = travaDaMao(estado, cor);
  if (trava) throw new Error(trava);
  const id = estado.mao!.mao[cor][indice];
  if (!id) throw new Error("Carta inválida");
  const carta = obterCarta(id);

  const mao = clonarMao(estado.mao!);
  mao.mao[cor].splice(indice, 1);
  mao.jogada[cor] = id;
  const novo: Estado = {
    ...estado,
    mao,
    cartas: { ...estado.cartas, [cor]: { ...estado.cartas[cor], poder: id } },
    dadosCartas: {
      ...estado.dadosCartas,
      [cor]: { ...estado.dadosCartas[cor], poder: { ...carta.dadosIniciais?.() } },
    },
    usosPoder: { ...estado.usosPoder, [cor]: carta.acaoAtiva ? 1 : 0 },
    eventos: [...estado.eventos, { meioLance: estado.meioLance, cor, cartaId: id, texto: `Jogou a carta ${carta.nome}` }],
  };
  return novo;
}

/**
 * Chamado pelo motor quando a vez passa para `cor`: a carta que ele jogou na
 * rodada anterior sai de jogo.
 */
export function encerrarCartaJogada(estado: Estado, cor: Cor): void {
  if (!estado.mao?.jogada[cor]) return;
  estado.mao.jogada[cor] = null;
  estado.cartas[cor] = { ...estado.cartas[cor], poder: null };
  estado.dadosCartas[cor] = { ...estado.dadosCartas[cor], poder: {} };
  estado.usosPoder[cor] = 0;
}

/** Chamado pelo motor depois de cada lance de `cor`: a cada LANCES_POR_CARTA, compra uma carta. */
export function comprarSeForAHora(estado: Estado, cor: Cor): void {
  const m = estado.mao;
  if (!m || estado.lancesFeitos[cor] % LANCES_POR_CARTA !== 0) return;
  if (m.mao[cor].length >= MAO_MAXIMA || m.baralho[cor].length === 0) return;
  m.mao[cor].push(m.baralho[cor].shift()!);
}

/** Quantos lances faltam para `cor` comprar a próxima carta. */
export function lancesAteComprar(estado: Estado, cor: Cor): number {
  return LANCES_POR_CARTA - (estado.lancesFeitos[cor] % LANCES_POR_CARTA);
}
