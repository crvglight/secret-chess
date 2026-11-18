import type { Casa, Cor, Estado, Lance, MaoDeCartas, Peca, TipoPeca } from "./tipos.ts";

export const FEN_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const NOME_PECA: Record<TipoPeca, string> = {
  peao: "peão",
  cavalo: "cavalo",
  bispo: "bispo",
  torre: "torre",
  dama: "dama",
  rei: "rei",
};

export const LETRA_PECA: Record<TipoPeca, string> = {
  peao: "",
  cavalo: "C",
  bispo: "B",
  torre: "T",
  dama: "D",
  rei: "R",
};

const PECA_DO_FEN: Record<string, TipoPeca> = {
  p: "peao",
  n: "cavalo",
  b: "bispo",
  r: "torre",
  q: "dama",
  k: "rei",
};

export const coluna = (c: Casa): number => c % 8;
export const fileira = (c: Casa): number => Math.floor(c / 8);
export const casa = (col: number, fil: number): Casa => fil * 8 + col;
export const dentro = (col: number, fil: number): boolean =>
  col >= 0 && col < 8 && fil >= 0 && fil < 8;

export function nomeCasa(c: Casa): string {
  return "abcdefgh"[coluna(c)]! + (fileira(c) + 1);
}

export function casaDoNome(nome: string): Casa {
  if (!/^[a-h][1-8]$/.test(nome)) throw new Error(`Casa inválida: ${nome}`);
  return casa(nome.charCodeAt(0) - 97, Number(nome[1]) - 1);
}

export function corOposta(cor: Cor): Cor {
  return cor === "brancas" ? "pretas" : "brancas";
}

export const direcaoPeao = (cor: Cor): number => (cor === "brancas" ? 1 : -1);
export const fileiraInicialPeao = (cor: Cor): number => (cor === "brancas" ? 1 : 6);
export const ultimaFileira = (cor: Cor): number => (cor === "brancas" ? 7 : 0);

/** A peça que o lance captura (considera en passant), ou null. */
export function pecaCapturada(estado: Estado, lance: Lance): Peca | null {
  if (lance.especial === "en-passant") {
    const p = estado.tabuleiro[lance.de];
    return p ? (estado.tabuleiro[lance.para - 8 * direcaoPeao(p.cor)] ?? null) : null;
  }
  return estado.tabuleiro[lance.para] ?? null;
}

export function casasDasPecas(estado: Estado, cor: Cor, tipo?: TipoPeca): Casa[] {
  const casas: Casa[] = [];
  estado.tabuleiro.forEach((p, c) => {
    if (p && p.cor === cor && (!tipo || p.tipo === tipo)) casas.push(c);
  });
  return casas;
}

export function contarPecas(estado: Estado, cor: Cor, tipo: TipoPeca): number {
  return casasDasPecas(estado, cor, tipo).length;
}

export interface PosicaoFen {
  tabuleiro: (Peca | null)[];
  vez: Cor;
  roque: Estado["roque"];
  enPassant: Casa | null;
  semProgresso: number;
}

export function lerFen(fen: string): PosicaoFen {
  const [pecas = "", vez = "w", roque = "-", ep = "-", semProgresso = "0"] = fen.trim().split(/\s+/);
  const linhas = pecas.split("/");
  if (linhas.length !== 8) throw new Error(`FEN inválido: ${fen}`);

  const tabuleiro: (Peca | null)[] = Array(64).fill(null);
  let id = 1;
  linhas.forEach((linha, i) => {
    const fil = 7 - i;
    let col = 0;
    for (const ch of linha) {
      if (/\d/.test(ch)) {
        col += Number(ch);
        continue;
      }
      const tipo = PECA_DO_FEN[ch.toLowerCase()];
      if (!tipo || col > 7) throw new Error(`FEN inválido: ${fen}`);
      const cor: Cor = ch === ch.toUpperCase() ? "brancas" : "pretas";
      tabuleiro[casa(col, fil)] = { id: id++, tipo, cor };
      col++;
    }
    if (col !== 8) throw new Error(`FEN inválido: ${fen}`);
  });

  return {
    tabuleiro,
    vez: vez === "b" ? "pretas" : "brancas",
    roque: {
      brancas: { curto: roque.includes("K"), longo: roque.includes("Q") },
      pretas: { curto: roque.includes("k"), longo: roque.includes("q") },
    },
    enPassant: ep === "-" ? null : casaDoNome(ep),
    semProgresso: Number(semProgresso) || 0,
  };
}

export function clonarEstado(e: Estado): Estado {
  return {
    ...e,
    tabuleiro: e.tabuleiro.slice(),
    roque: { brancas: { ...e.roque.brancas }, pretas: { ...e.roque.pretas } },
    lancesFeitos: { ...e.lancesFeitos },
    cartas: { brancas: { ...e.cartas.brancas }, pretas: { ...e.cartas.pretas } },
    dadosCartas: {
      brancas: {
        poder: { ...e.dadosCartas.brancas.poder },
        desvantagem: { ...e.dadosCartas.brancas.desvantagem },
      },
      pretas: {
        poder: { ...e.dadosCartas.pretas.poder },
        desvantagem: { ...e.dadosCartas.pretas.desvantagem },
      },
    },
    usosPoder: { ...e.usosPoder },
    historico: e.historico.slice(),
    eventos: e.eventos.slice(),
    ...(e.mao ? { mao: clonarMao(e.mao) } : {}),
    ...(e.caos ? { caos: { ...e.caos, registro: e.caos.registro.slice() } } : {}),
    ...(e.casas ? { casas: { ...e.casas, registro: e.casas.registro.slice() } } : {}),
  };
}

export function clonarMao(m: MaoDeCartas): MaoDeCartas {
  return {
    mao: { brancas: m.mao.brancas.slice(), pretas: m.mao.pretas.slice() },
    baralho: { brancas: m.baralho.brancas.slice(), pretas: m.baralho.pretas.slice() },
    jogada: { ...m.jogada },
  };
}

/** Distância em lances de rei entre duas casas. */
export function distancia(a: Casa, b: Casa): number {
  return Math.max(Math.abs(coluna(a) - coluna(b)), Math.abs(fileira(a) - fileira(b)));
}

/** Quantas fileiras o lance anda para a frente, do ponto de vista de `cor` (negativo = para trás). */
export function avancoDoLance(lance: Lance, cor: Cor): number {
  return (fileira(lance.para) - fileira(lance.de)) * direcaoPeao(cor);
}

/** Casa onde está a peça com este id, ou null se ela saiu do tabuleiro. */
export function casaDaPeca(estado: Estado, id: number): Casa | null {
  const c = estado.tabuleiro.findIndex((p) => p?.id === id);
  return c >= 0 ? c : null;
}
