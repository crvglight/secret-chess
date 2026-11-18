import type { ReactNode } from "react";
import { LETRA_PECA, type Cor, type TipoPeca } from "@xadrez/engine";
import { useVisual, type EstiloPecas } from "../visual.tsx";

// Todas as peças foram desenhadas para este projeto (SVG original), num quadro de 100 x 100.

// ---------- Clássico (Sombra, Vidro e Neon usam as mesmas formas, só com outro CSS) ----------
const BASE = <rect x="24" y="76" width="52" height="10" rx="3" />;

const SILHUETAS: Record<TipoPeca, ReactNode> = {
  peao: (
    <>
      <circle cx="50" cy="30" r="12" />
      <path d="M38 44 h24 l-4 8 h-16 z" />
      <path d="M42 52 h16 l6 24 h-28 z" />
      {BASE}
    </>
  ),
  torre: (
    <>
      <path d="M30 18 h8 v8 h6 v-8 h12 v8 h6 v-8 h8 v20 h-40 z" />
      <path d="M34 38 h32 l4 38 h-40 z" />
      {BASE}
    </>
  ),
  bispo: (
    <>
      <circle cx="50" cy="14" r="5" />
      <path d="M50 20 C 34 32, 34 50, 41 58 h18 C 66 50, 66 32, 50 20 z" />
      <path className="detalhe" d="M55 31 L46 44" />
      <path d="M40 58 h20 l6 18 h-32 z" />
      {BASE}
    </>
  ),
  cavalo: (
    <>
      <path d="M68 76 L66 52 C 66 34, 58 22, 44 17 L41 9 L35 19 C 26 24, 20 35, 18 45 L23 52 L33 47 L41 45 C 38 54, 31 60, 31 76 Z" />
      <circle className="olho" cx="37" cy="30" r="3" />
      {BASE}
    </>
  ),
  dama: (
    <>
      <path d="M26 34 L32 50 L38 26 L44 46 L50 22 L56 46 L62 26 L68 50 L74 34 L66 60 H34 Z" />
      <circle cx="26" cy="32" r="4" />
      <circle cx="38" cy="24" r="4" />
      <circle cx="50" cy="19" r="4" />
      <circle cx="62" cy="24" r="4" />
      <circle cx="74" cy="32" r="4" />
      <path d="M34 60 h32 l4 16 h-40 z" />
      {BASE}
    </>
  ),
  rei: (
    <>
      <path d="M47 6 h6 v7 h7 v6 h-7 v9 h-6 v-9 h-7 v-6 h7 z" />
      <path d="M30 36 C 30 26, 70 26, 70 36 L63 60 H37 Z" />
      <path d="M36 60 h28 l4 16 h-36 z" />
      {BASE}
    </>
  ),
};

// ---------- Pixel art 12 x 12: "x" = contorno, "o" = preenchimento ----------
const MAPAS: Record<TipoPeca, string[]> = {
  peao: [
    "............",
    "............",
    ".....xx.....",
    "....xoox....",
    "....xoox....",
    ".....xx.....",
    "....xoox....",
    "....xoox....",
    "...xoooox...",
    "..xoooooox..",
    "..xxxxxxxx..",
    "............",
  ],
  torre: [
    "............",
    "............",
    "..xx.xx.xx..",
    "..xxxxxxxx..",
    "...xoooox...",
    "...xoooox...",
    "...xoooox...",
    "...xoooox...",
    "...xoooox...",
    "..xoooooox..",
    "..xxxxxxxx..",
    "............",
  ],
  bispo: [
    "............",
    ".....xx.....",
    "....xoox....",
    "...xooxox...",
    "...xoxoox...",
    "...xoooox...",
    "....xoox....",
    "....xoox....",
    "...xoooox...",
    "..xoooooox..",
    "..xxxxxxxx..",
    "............",
  ],
  cavalo: [
    "............",
    ".....xx.....",
    "....xoox....",
    "...xoooox...",
    "..xoxoooox..",
    ".xoooooooox.",
    ".xxxxooooox.",
    ".....xoooox.",
    "....xooooox.",
    "...xoooooox.",
    "..xxxxxxxxx.",
    "............",
  ],
  dama: [
    "............",
    ".x..x..x..x.",
    ".xo.xoox.ox.",
    ".xoxooooxox.",
    "..xoooooox..",
    "...xoooox...",
    "....xoox....",
    "....xoox....",
    "...xoooox...",
    "..xoooooox..",
    "..xxxxxxxx..",
    "............",
  ],
  rei: [
    ".....xx.....",
    "....xxxx....",
    ".....xx.....",
    "..xxxxxxxx..",
    "..xoooooox..",
    "...xoooox...",
    "....xoox....",
    "....xoox....",
    "...xoooox...",
    "..xoooooox..",
    "..xxxxxxxx..",
    "............",
  ],
};

/** Transforma o mapa em retângulos, juntando pixels vizinhos da mesma cor numa linha só. */
function desenharMapa(mapa: string[]): ReactNode {
  const retangulos: ReactNode[] = [];
  mapa.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const ch = linha[x]!;
      let fim = x;
      while (linha[fim + 1] === ch) fim++;
      if (ch !== ".") {
        retangulos.push(
          <rect key={`${x}-${y}`} className={ch === "x" ? "px-contorno" : "px-corpo"} x={x} y={y} width={fim - x + 1} height={1} />,
        );
      }
      x = fim + 1;
    }
  });
  return <g transform="translate(2 2) scale(8)">{retangulos}</g>;
}

const PIXEL = Object.fromEntries(
  Object.entries(MAPAS).map(([tipo, mapa]) => [tipo, desenharMapa(mapa)]),
) as Record<TipoPeca, ReactNode>;

// ---------- Geométrico: uma forma simples para cada peça ----------
const PLINTO = <rect x="26" y="80" width="48" height="7" rx="3.5" />;

const GEOMETRICAS: Record<TipoPeca, ReactNode> = {
  // círculo pequeno
  peao: (
    <>
      <circle cx="50" cy="58" r="17" />
      {PLINTO}
    </>
  ),
  // quadrado
  torre: (
    <>
      <rect x="29" y="34" width="42" height="40" rx="4" />
      {PLINTO}
    </>
  ),
  // losango
  bispo: (
    <>
      <path d="M50 16 L72 46 L50 76 L28 46 Z" />
      {PLINTO}
    </>
  ),
  // "L" do salto do cavalo
  cavalo: (
    <>
      <path d="M32 74 V22 H62 V40 H48 V74 Z" />
      {PLINTO}
    </>
  ),
  // estrela de 8 pontas
  dama: (
    <>
      <path d="M50 14 L57 33 L75 25 L67 43 L86 50 L67 57 L75 75 L57 67 L50 86 L43 67 L25 75 L33 57 L14 50 L33 43 L25 25 L43 33 Z" transform="translate(50 47) scale(0.78) translate(-50 -50)" />
      {PLINTO}
    </>
  ),
  // círculo com cruz por cima
  rei: (
    <>
      <circle cx="50" cy="56" r="20" />
      <path d="M46 10 h8 v8 h8 v8 h-8 v10 h-8 v-10 h-8 v-8 h8 z" />
      {PLINTO}
    </>
  ),
};

// ---------- Fichas: disco com a letra da peça (P para o peão) ----------
function ficha(tipo: TipoPeca): ReactNode {
  return (
    <>
      <circle cx="50" cy="50" r="38" />
      <circle className="detalhe" cx="50" cy="50" r="31" />
      <text className="letra-ficha" x="50" y="52" textAnchor="middle" dominantBaseline="central">
        {LETRA_PECA[tipo] || "P"}
      </text>
    </>
  );
}

export function PecaSvg({ tipo, cor, estilo }: { tipo: TipoPeca; cor: Cor; estilo?: EstiloPecas }) {
  const atual = useVisual().visual.pecas;
  const e = estilo ?? atual;
  let desenho: ReactNode;
  if (e === "pixel") desenho = PIXEL[tipo];
  else if (e === "fichas") desenho = ficha(tipo);
  else if (e === "geometrico") desenho = GEOMETRICAS[tipo];
  else desenho = SILHUETAS[tipo]; // clássico, sombra, vidro e neon: mesmas formas, CSS diferente
  return <g className={`peca peca-${cor} peca-${e}`}>{desenho}</g>;
}

/** Versão avulsa (fora do tabuleiro), para botões e listas. */
export function IconePeca({
  tipo,
  cor,
  tamanho = 40,
  estilo,
}: {
  tipo: TipoPeca;
  cor: Cor;
  tamanho?: number;
  estilo?: EstiloPecas;
}) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
      <PecaSvg tipo={tipo} cor={cor} estilo={estilo} />
    </svg>
  );
}
