// Airdrops: caixas que caem em casas vazias do meio do tabuleiro durante a partida.
// A primeira peça (menos o rei) que parar numa caixa a abre e ganha a recompensa.
// Os dois lados veem a raridade (cor da caixa); o prêmio só aparece ao abrir.
//
// Tudo é sorteado de forma fixa a partir de uma semente guardada no estado (e do lance
// e da casa), para o replay, a análise e o servidor online chegarem ao mesmo resultado.
import { recarregar } from "./casas.ts";
import { obterCarta } from "./cartas/index.ts";
import { corOposta, distancia, fileira, NOME_PECA, nomeCasa, pecaCapturada } from "./tabuleiro.ts";
import type { Casa, Cor, Estado, Lance, Peca, TipoPeca } from "./tipos.ts";

export type Raridade = "comum" | "rara" | "lendaria";

export type PremioAirdrop =
  // Comuns
  | "peao"
  | "recarga"
  | "escudo"
  | "espiar"
  // Raras
  | "cavalo"
  | "bispo"
  | "poder-em-dobro"
  | "promocao"
  | "lance-extra"
  // Lendárias
  | "dama"
  | "torre"
  | "sem-desvantagem"
  // Armadilhas (vêm em caixa de qualquer cor)
  | "bomba"
  | "presente"
  | "congelada";

export interface CaixaAirdrop {
  casa: Casa;
  raridade: Raridade;
  /** Meio-lance em que a caixa some, se ninguém pegar. */
  ate: number;
}

export interface EstadoAirdrops {
  semente: number;
  caixas: CaixaAirdrop[];
  /** Peças que não podem ser capturadas até o meio-lance `ate`. */
  escudos: { pecaId: number; ate: number }[];
  /** Peças que não podem se mover até o meio-lance `ate`. */
  congeladas: { pecaId: number; ate: number }[];
  /** Até que meio-lance a desvantagem de cada lado fica desligada. */
  semDesvantagem: Record<Cor, number>;
  /** Este lado vê as cartas do adversário. */
  espiando: Record<Cor, boolean>;
  /** Caixas abertas, para o painel e a tela de fim. */
  registro: { meioLance: number; cor: Cor; raridade: Raridade; premio: PremioAirdrop; texto: string }[];
}

/** Primeira caixa cai depois deste meio-lance; as seguintes, a cada INTERVALO. */
export const PRIMEIRO_AIRDROP = 4;
export const INTERVALO_AIRDROP = 8;
/** Por quantos meios-lances a caixa fica no tabuleiro. */
export const DURACAO_CAIXA = 12;
export const MAX_CAIXAS = 2;
/** Escudo e congelamento: 2 rodadas (4 meios-lances). */
const DUAS_RODADAS = 4;
/** Sem desvantagem: 5 rodadas. */
const CINCO_RODADAS = 10;
/** Chance de a caixa ser uma armadilha. */
const CHANCE_ARMADILHA = 1 / 6;

export const NOME_RARIDADE: Record<Raridade, string> = { comum: "comum", rara: "rara", lendaria: "lendária" };

const PREMIOS: Record<Raridade, PremioAirdrop[]> = {
  comum: ["peao", "recarga", "escudo", "espiar"],
  rara: ["cavalo", "bispo", "poder-em-dobro", "promocao", "lance-extra"],
  lendaria: ["dama", "torre", "sem-desvantagem"],
};
const ARMADILHAS: PremioAirdrop[] = ["bomba", "presente", "congelada"];

export const DESCRICAO_PREMIO: Record<PremioAirdrop, string> = {
  peao: "Peão extra",
  recarga: "+1 uso do poder",
  escudo: "Escudo por 2 rodadas",
  espiar: "Espiar as cartas do adversário",
  cavalo: "Cavalo extra",
  bispo: "Bispo extra",
  "poder-em-dobro": "+2 usos do poder",
  promocao: "Promoção da peça",
  "lance-extra": "Lance extra",
  dama: "Dama extra",
  torre: "Torre extra",
  "sem-desvantagem": "Sem desvantagem por 5 rodadas",
  bomba: "Armadilha: bomba",
  presente: "Armadilha: presente para o adversário",
  congelada: "Armadilha: peça congelada",
};

/** Número "aleatório" fixo entre 0 e 1, a partir da semente e de alguns números. */
function sorteioFixo(semente: number, ...n: number[]): number {
  let h = semente >>> 0;
  for (const x of n) {
    h = Math.imul(h ^ (x + 0x9e3779b9), 2654435761) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519) >>> 0;
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296;
}

export function iniciarAirdrops(rng: () => number = Math.random): EstadoAirdrops {
  return {
    semente: Math.floor(rng() * 2 ** 31),
    caixas: [],
    escudos: [],
    congeladas: [],
    semDesvantagem: { brancas: -1, pretas: -1 },
    espiando: { brancas: false, pretas: false },
    registro: [],
  };
}

export function clonarAirdrops(a: EstadoAirdrops): EstadoAirdrops {
  return {
    ...a,
    caixas: a.caixas.slice(),
    escudos: a.escudos.slice(),
    congeladas: a.congeladas.slice(),
    semDesvantagem: { ...a.semDesvantagem },
    espiando: { ...a.espiando },
    registro: a.registro.slice(),
  };
}

/** Em quantos meios-lances cai a próxima caixa (contando os dois lados). */
export function proximoAirdrop(estado: Estado): number {
  const m = estado.meioLance;
  if (m < PRIMEIRO_AIRDROP) return PRIMEIRO_AIRDROP - m;
  const resto = (m - PRIMEIRO_AIRDROP) % INTERVALO_AIRDROP;
  return resto === 0 ? INTERVALO_AIRDROP : INTERVALO_AIRDROP - resto;
}

/** A desvantagem de `cor` está desligada por um airdrop agora? */
export function desvantagemDesligada(estado: Estado, cor: Cor): boolean {
  return !!estado.airdrops && estado.airdrops.semDesvantagem[cor] > estado.meioLance;
}

/** `cor` está espiando as cartas do adversário (airdrop)? */
export const espiandoPorAirdrop = (estado: Estado, cor: Cor) => !!estado.airdrops?.espiando[cor];

/** Há escudo ou peça congelada valendo (os filtros de lance precisam rodar)? */
export function airdropsFiltram(estado: Estado): boolean {
  const a = estado.airdrops;
  return !!a && (a.escudos.length > 0 || a.congeladas.length > 0);
}

/** Tira os lances que capturam peça com escudo ou movem peça congelada. */
export function filtrarPorAirdrops(estado: Estado, lances: Lance[]): Lance[] {
  const a = estado.airdrops;
  if (!a || (a.escudos.length === 0 && a.congeladas.length === 0)) return lances;
  const protegidas = new Set(a.escudos.filter((e) => e.ate > estado.meioLance).map((e) => e.pecaId));
  const presas = new Set(a.congeladas.filter((e) => e.ate > estado.meioLance).map((e) => e.pecaId));
  return lances.filter((l) => {
    const quem = estado.tabuleiro[l.de];
    if (quem && presas.has(quem.id) && l.montada !== "descer") return false;
    const alvo = pecaCapturada(estado, l);
    return !(alvo && protegidas.has(alvo.id));
  });
}

/** Casas com efeito para mostrar no tabuleiro (escudo, congelada). */
export function destaquesDosAirdrops(estado: Estado): { casa: Casa; rotulo: string }[] {
  const a = estado.airdrops;
  if (!a) return [];
  const casaDe = (id: number) => estado.tabuleiro.findIndex((p) => p?.id === id);
  return [
    ...a.escudos.filter((e) => e.ate > estado.meioLance).map((e) => ({ casa: casaDe(e.pecaId), rotulo: "Escudo" })),
    ...a.congeladas.filter((e) => e.ate > estado.meioLance).map((e) => ({ casa: casaDe(e.pecaId), rotulo: "Congelada" })),
  ].filter((d) => d.casa >= 0);
}

// ---------------------------------------------------------------------------
// Abrir caixa
// ---------------------------------------------------------------------------

const novoId = (estado: Estado) => Math.max(0, ...estado.tabuleiro.map((p) => p?.id ?? 0)) + 1;

/** Põe uma peça nova de `cor` numa casa livre perto de `perto`. Devolve a casa ou null. */
function porPecaExtra(estado: Estado, cor: Cor, tipo: TipoPeca, perto: Casa, sorteio: number): Casa | null {
  const livres = estado.tabuleiro
    .map((p, c) => (p ? -1 : c))
    .filter((c) => c >= 0 && distancia(c, perto) === 1)
    .filter((c) => tipo !== "peao" || (fileira(c) !== 0 && fileira(c) !== 7));
  if (livres.length === 0) return null;
  const casa = livres[Math.floor(sorteio * livres.length)]!;
  estado.tabuleiro[casa] = { id: novoId(estado), tipo, cor };
  return casa;
}

const PROMOVE: Partial<Record<TipoPeca, TipoPeca>> = { peao: "cavalo", cavalo: "torre", bispo: "torre", torre: "dama" };

/** Aplica o prêmio para quem abriu (a peça está em `casa`). Devolve o texto do que aconteceu. */
function aplicarPremio(estado: Estado, premio: PremioAirdrop, peca: Peca, casa: Casa, sorteio: number): string {
  const a = estado.airdrops!;
  const cor = peca.cor;
  const extra = (tipo: TipoPeca) => {
    const onde = porPecaExtra(estado, cor, tipo, casa, sorteio);
    return onde === null ? `${recarregar(estado, cor)} (não havia casa livre para o ${NOME_PECA[tipo]})` : `${NOME_PECA[tipo]} extra em ${nomeCasa(onde)}`;
  };
  switch (premio) {
    case "peao":
    case "cavalo":
    case "bispo":
    case "torre":
    case "dama":
      return extra(premio);
    case "recarga":
      return recarregar(estado, cor);
    case "poder-em-dobro": {
      if (estado.mao) return recarregar(estado, cor);
      const id = estado.cartas[cor].poder;
      if (id && obterCarta(id).acaoAtiva) {
        estado.usosPoder[cor] += 2;
        return "+2 usos do poder";
      }
      return extra("cavalo");
    }
    case "escudo":
      a.escudos.push({ pecaId: peca.id, ate: estado.meioLance + DUAS_RODADAS });
      return `o ${NOME_PECA[peca.tipo]} em ${nomeCasa(casa)} ganhou escudo por 2 rodadas`;
    case "espiar":
      a.espiando[cor] = true;
      return "agora vê as cartas do adversário";
    case "promocao": {
      const nova = PROMOVE[peca.tipo];
      if (!nova) return recarregar(estado, cor);
      estado.tabuleiro[casa] = { ...peca, tipo: nova };
      return `o ${NOME_PECA[peca.tipo]} virou ${NOME_PECA[nova]}`;
    }
    case "lance-extra":
      estado.repetirVez = true;
      return "joga de novo";
    case "sem-desvantagem":
      a.semDesvantagem[cor] = estado.meioLance + CINCO_RODADAS;
      return "ficou sem desvantagem por 5 rodadas";
    case "bomba":
      estado.tabuleiro[casa] = null;
      return `armadilha! O ${NOME_PECA[peca.tipo]} explodiu`;
    case "presente": {
      // Peão extra para o adversário, numa casa livre da 2ª ou 3ª fileira dele.
      const adv = corOposta(cor);
      const fileiras = adv === "brancas" ? [1, 2] : [6, 5];
      const livres = estado.tabuleiro.map((p, c) => (p ? -1 : c)).filter((c) => c >= 0 && fileiras.includes(fileira(c)));
      if (livres.length === 0) return "armadilha! Mas não havia lugar para o presente";
      const onde = livres[Math.floor(sorteio * livres.length)]!;
      estado.tabuleiro[onde] = { id: novoId(estado), tipo: "peao", cor: adv };
      return `armadilha! O adversário ganhou um peão em ${nomeCasa(onde)}`;
    }
    case "congelada":
      a.congeladas.push({ pecaId: peca.id, ate: estado.meioLance + DUAS_RODADAS });
      return `armadilha! O ${NOME_PECA[peca.tipo]} ficou congelado por 2 rodadas`;
  }
}

/**
 * Depois de um lance: abre as caixas onde parou uma peça (menos o rei).
 * `meioLanceDoLance` é o índice do lance que acabou de ser feito.
 */
export function abrirCaixas(estado: Estado, meioLanceDoLance: number): void {
  const a = estado.airdrops;
  if (!a || a.caixas.length === 0) return;
  for (const caixa of a.caixas.slice()) {
    const peca = estado.tabuleiro[caixa.casa];
    if (!peca || peca.tipo === "rei") continue;
    a.caixas = a.caixas.filter((c) => c !== caixa);
    const s = (n: number) => sorteioFixo(a.semente, meioLanceDoLance, caixa.casa, n);
    const lista = s(1) < CHANCE_ARMADILHA ? ARMADILHAS : PREMIOS[caixa.raridade];
    const premio = lista[Math.floor(s(2) * lista.length)]!;
    const texto = aplicarPremio(estado, premio, peca, caixa.casa, s(3));
    a.registro.push({ meioLance: meioLanceDoLance, cor: peca.cor, raridade: caixa.raridade, premio, texto });
  }
}

/** No fim de cada lance: vence efeitos e caixas velhas e, na hora certa, solta uma caixa nova. */
export function passoDosAirdrops(estado: Estado): void {
  const a = estado.airdrops;
  if (!a) return;
  const m = estado.meioLance;
  a.caixas = a.caixas.filter((c) => c.ate > m);
  a.escudos = a.escudos.filter((e) => e.ate > m);
  a.congeladas = a.congeladas.filter((e) => e.ate > m);

  const hora = m >= PRIMEIRO_AIRDROP && (m - PRIMEIRO_AIRDROP) % INTERVALO_AIRDROP === 0;
  if (!hora || a.caixas.length >= MAX_CAIXAS) return;
  // Casa vazia do meio (3ª a 6ª fileira), sem outra caixa.
  const livres = estado.tabuleiro
    .map((p, c) => (p ? -1 : c))
    .filter((c) => c >= 0 && fileira(c) >= 2 && fileira(c) <= 5 && !a.caixas.some((x) => x.casa === c));
  if (livres.length === 0) return;
  const casa = livres[Math.floor(sorteioFixo(a.semente, m, 101) * livres.length)]!;
  const r = sorteioFixo(a.semente, m, 202);
  const raridade: Raridade = r < 0.55 ? "comum" : r < 0.85 ? "rara" : "lendaria";
  a.caixas.push({ casa, raridade, ate: m + DURACAO_CAIXA });
}
