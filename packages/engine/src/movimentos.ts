import { casa, coluna, dentro, direcaoPeao, fileira, fileiraInicialPeao, ultimaFileira } from "./tabuleiro.ts";
import type { Casa, Cor, Especial, Estado, Lance, Peca, TipoPeca } from "./tipos.ts";

export type Direcao = readonly [number, number];

export const SALTOS_CAVALO: Direcao[] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
export const RETAS: Direcao[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const DIAGONAIS: Direcao[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
export const VIZINHOS: Direcao[] = [...RETAS, ...DIAGONAIS];

export const PROMOCOES: readonly TipoPeca[] = ["dama", "torre", "bispo", "cavalo"];

/** Adiciona um lance de peão, já abrindo as 4 promoções se chegar à última fileira. */
export function adicionarLancePeao(lances: Lance[], de: Casa, para: Casa, cor: Cor, especial?: Especial): void {
  if (fileira(para) === ultimaFileira(cor)) {
    for (const promocao of PROMOCOES) lances.push(especial ? { de, para, promocao, especial } : { de, para, promocao });
  } else {
    lances.push(especial ? { de, para, especial } : { de, para });
  }
}

/**
 * Lances do xadrez normal, sem nenhuma carta e sem a regra do xeque:
 * o rei pode ir para uma casa atacada e o roque pode passar por casa atacada.
 */
export function gerarLancesBase(estado: Estado, cor: Cor): Lance[] {
  const lances: Lance[] = [];
  const t = estado.tabuleiro;
  for (let de = 0; de < 64; de++) {
    const p = t[de];
    if (!p || p.cor !== cor) continue;
    switch (p.tipo) {
      case "peao":
        lancesPeao(estado, de, cor, lances);
        break;
      case "cavalo":
        saltos(t, de, cor, SALTOS_CAVALO, lances);
        break;
      case "bispo":
        deslizar(t, de, cor, DIAGONAIS, lances);
        break;
      case "torre":
        deslizar(t, de, cor, RETAS, lances);
        break;
      case "dama":
        deslizar(t, de, cor, VIZINHOS, lances);
        break;
      case "rei":
        saltos(t, de, cor, VIZINHOS, lances);
        roques(estado, de, cor, lances);
        break;
    }
  }
  return lances;
}

function lancesPeao(estado: Estado, de: Casa, cor: Cor, lances: Lance[]): void {
  const t = estado.tabuleiro;
  const dir = direcaoPeao(cor);
  const col = coluna(de);
  const fil = fileira(de);

  if (dentro(col, fil + dir) && !t[casa(col, fil + dir)]) {
    adicionarLancePeao(lances, de, casa(col, fil + dir), cor);
    const duas = casa(col, fil + 2 * dir);
    if (fil === fileiraInicialPeao(cor) && !t[duas]) lances.push({ de, para: duas, especial: "duplo" });
  }

  for (const dc of [-1, 1]) {
    if (!dentro(col + dc, fil + dir)) continue;
    const alvo = casa(col + dc, fil + dir);
    const p = t[alvo];
    if (p && p.cor !== cor) adicionarLancePeao(lances, de, alvo, cor);
    else if (!p && alvo === estado.enPassant) lances.push({ de, para: alvo, especial: "en-passant" });
  }
}

export function saltos(t: (Peca | null)[], de: Casa, cor: Cor, direcoes: Direcao[], lances: Lance[]): void {
  const col = coluna(de);
  const fil = fileira(de);
  for (const [dc, df] of direcoes) {
    if (!dentro(col + dc, fil + df)) continue;
    const para = casa(col + dc, fil + df);
    if (t[para]?.cor !== cor) lances.push({ de, para });
  }
}

export function deslizar(t: (Peca | null)[], de: Casa, cor: Cor, direcoes: Direcao[], lances: Lance[]): void {
  for (const [dc, df] of direcoes) {
    let col = coluna(de) + dc;
    let fil = fileira(de) + df;
    while (dentro(col, fil)) {
      const para = casa(col, fil);
      const p = t[para];
      if (p?.cor === cor) break;
      lances.push({ de, para });
      if (p) break;
      col += dc;
      fil += df;
    }
  }
}

function roques(estado: Estado, de: Casa, cor: Cor, lances: Lance[]): void {
  const t = estado.tabuleiro;
  const base = cor === "brancas" ? 0 : 56;
  if (de !== base + 4) return;
  const torre = (c: Casa) => t[c]?.tipo === "torre" && t[c]?.cor === cor;
  if (estado.roque[cor].curto && torre(base + 7) && !t[base + 5] && !t[base + 6]) {
    lances.push({ de, para: base + 6, especial: "roque-curto" });
  }
  if (estado.roque[cor].longo && torre(base) && !t[base + 1] && !t[base + 2] && !t[base + 3]) {
    lances.push({ de, para: base + 2, especial: "roque-longo" });
  }
}

function pecaDoTipo(t: (Peca | null)[], c: number, f: number, atacante: Cor, tipo: TipoPeca): boolean {
  if (c < 0 || c > 7 || f < 0 || f > 7) return false;
  const p = t[f * 8 + c];
  return !!p && p.cor === atacante && p.tipo === tipo;
}

/** Primeira peça na direção (dc, df) a partir do alvo é de `atacante` e de um dos dois tipos? */
function raioAtaca(t: (Peca | null)[], col: number, fil: number, dc: number, df: number, atacante: Cor, a: TipoPeca, b: TipoPeca): boolean {
  let c = col + dc;
  let f = fil + df;
  while (c >= 0 && c < 8 && f >= 0 && f < 8) {
    const p = t[f * 8 + c];
    if (p) return p.cor === atacante && (p.tipo === a || p.tipo === b);
    c += dc;
    f += df;
  }
  return false;
}

/**
 * Alguma peça de `atacante` alcança a casa `alvo` pelas regras normais do xadrez
 * (sem cartas)? Conta rápida, olhando da casa para fora (a busca chama isto em todo nó).
 */
export function casaAtacada(t: (Peca | null)[], alvo: Casa, atacante: Cor): boolean {
  const col = alvo % 8;
  const fil = (alvo - col) / 8;
  // Peão atacante fica uma fileira "atrás" do alvo, do ponto de vista dele.
  const fp = fil - direcaoPeao(atacante);
  if (pecaDoTipo(t, col - 1, fp, atacante, "peao") || pecaDoTipo(t, col + 1, fp, atacante, "peao")) return true;
  for (const [dc, df] of SALTOS_CAVALO) if (pecaDoTipo(t, col + dc, fil + df, atacante, "cavalo")) return true;
  for (const [dc, df] of VIZINHOS) if (pecaDoTipo(t, col + dc, fil + df, atacante, "rei")) return true;
  for (const [dc, df] of RETAS) if (raioAtaca(t, col, fil, dc, df, atacante, "torre", "dama")) return true;
  for (const [dc, df] of DIAGONAIS) if (raioAtaca(t, col, fil, dc, df, atacante, "bispo", "dama")) return true;
  return false;
}
