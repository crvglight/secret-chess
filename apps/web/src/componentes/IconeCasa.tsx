import type { ReactNode } from "react";
import type { TipoCasaEspecial } from "@xadrez/engine";

// Casas especiais em estilo minimalista: a casa inteira numa cor chapada do tema e
// um único símbolo de traço fino, meio transparente, para a peça continuar em destaque.
// Quadro de 100 x 100.

interface Estilo {
  /** Cor de fundo da casa. */
  fundo: string;
  /** Cor do traço do símbolo (claro em fundo escuro, escuro em fundo claro). */
  traco: string;
  simbolo(direcao: 1 | -1): ReactNode;
}

const CLARO = "rgba(255, 255, 255, 0.55)";
const ESCURO = "rgba(40, 30, 20, 0.4)";

const ESTILOS: Record<TipoCasaEspecial, Estilo> = {
  portal: {
    fundo: "#7458c9",
    traco: CLARO,
    simbolo: () => (
      <>
        <circle cx="50" cy="50" r="34" />
        <circle cx="50" cy="50" r="20" />
      </>
    ),
  },
  lama: {
    fundo: "#7a5838",
    traco: CLARO,
    simbolo: () => <path d="M16 70 q8 -6 16 0 t16 0 t16 0 t16 0 t8 0" />,
  },
  bau: {
    fundo: "#d2a640",
    traco: ESCURO,
    simbolo: () => <rect x="14" y="14" width="72" height="72" rx="4" />,
  },
  muralha: {
    fundo: "#878c94",
    traco: CLARO,
    simbolo: () => <path d="M0 33 H100 M0 66 H100 M50 0 V33 M25 33 V66 M75 33 V66 M50 66 V100" />,
  },
  gelo: {
    fundo: "#a8d6ee",
    traco: "rgba(255, 255, 255, 0.85)",
    simbolo: () => <path d="M10 26 L32 40 L28 60 M60 90 L72 66 L92 62" />,
  },
  trampolim: {
    fundo: "#4a84d6",
    traco: CLARO,
    simbolo: () => <path d="M30 40 L50 20 L70 40 M30 62 L50 42 L70 62" />,
  },
  vigia: {
    fundo: "#4b5563",
    traco: CLARO,
    simbolo: () => (
      <>
        <path d="M18 50 Q50 18 82 50 Q50 82 18 50 Z" />
        <circle cx="50" cy="50" r="8" />
      </>
    ),
  },
  santuario: {
    fundo: "#ece0b4",
    traco: "rgba(160, 120, 30, 0.55)",
    simbolo: () => <circle cx="50" cy="50" r="36" />,
  },
  forja: {
    fundo: "#565b64",
    traco: "rgba(255, 150, 60, 0.75)",
    simbolo: () => <path d="M50 14 V30 M50 70 V86 M14 50 H30 M70 50 H86" />,
  },
  vulcao: {
    fundo: "#b5452c",
    traco: CLARO,
    simbolo: () => <path d="M14 82 L50 22 L86 82 Z" />,
  },
  esteira: {
    fundo: "#3b3e44",
    traco: "rgba(242, 201, 76, 0.7)",
    simbolo: (direcao) => (
      <path d={direcao === 1 ? "M26 30 L46 50 L26 70 M54 30 L74 50 L54 70" : "M74 30 L54 50 L74 70 M46 30 L26 50 L46 70"} />
    ),
  },
  espelho: {
    fundo: "#c6d4e1",
    traco: "rgba(255, 255, 255, 0.9)",
    simbolo: () => <path d="M18 46 L46 18 M18 70 L70 18" />,
  },
  areia: {
    fundo: "#dfc07e",
    traco: ESCURO,
    simbolo: () => <path d="M50 50 m-6 0 a6 6 0 1 1 6 6 a14 14 0 1 1 14 -14 a24 24 0 1 1 -24 -24" />,
  },
  altar: {
    fundo: "#7a3038",
    traco: "rgba(230, 190, 110, 0.65)",
    simbolo: () => (
      <>
        <circle cx="50" cy="50" r="34" />
        <path d="M50 16 V28 M50 72 V84 M16 50 H28 M72 50 H84" />
      </>
    ),
  },
  nevoa: {
    fundo: "#b6bcc5",
    traco: "rgba(255, 255, 255, 0.8)",
    simbolo: () => <path d="M12 38 q13 -8 26 0 t26 0 t26 0 M12 62 q13 -8 26 0 t26 0 t26 0" />,
  },
  sorte: {
    fundo: "#3e9660",
    traco: CLARO,
    simbolo: () => (
      <>
        <rect x="22" y="22" width="56" height="56" rx="10" />
        <circle cx="38" cy="38" r="3" fill="currentColor" />
        <circle cx="50" cy="50" r="3" fill="currentColor" />
        <circle cx="62" cy="62" r="3" fill="currentColor" />
      </>
    ),
  },
};

/** Piso de uma casa especial dentro de um <svg> (no tabuleiro ou na legenda). */
export function DesenhoCasa({ tipo, direcao = 1 }: { tipo: TipoCasaEspecial; direcao?: 1 | -1 }) {
  const e = ESTILOS[tipo];
  return (
    <g className={`casa-especial casa-${tipo}`}>
      <rect width="100" height="100" fill={e.fundo} />
      <g
        fill="none"
        stroke={e.traco}
        color={e.traco}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {e.simbolo(direcao)}
      </g>
    </g>
  );
}

export function IconeCasa({ tipo, tamanho = 28 }: { tipo: TipoCasaEspecial; tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true" className="icone-casa">
      <DesenhoCasa tipo={tipo} />
    </svg>
  );
}
