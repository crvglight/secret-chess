import { useId, type ReactNode } from "react";
import type { TipoCasaEspecial } from "@xadrez/engine";

// Casas especiais como "pisos" temáticos: cada desenho ocupa a casa inteira (100 x 100)
// e as peças ficam por cima. Os detalhes ficam mais fortes nas bordas e mais calmos no
// meio, onde a peça fica. Cada desenho cria os próprios degradês com um id único
// (pode haver vários no tabuleiro).

type Desenho = (id: string, direcao: 1 | -1) => ReactNode;

/** Portal: vórtice roxo que gira devagar. */
const portal: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-fundo`}>
        <stop offset="0%" stopColor="#f3e3ff" />
        <stop offset="35%" stopColor="#a35cf0" />
        <stop offset="75%" stopColor="#4a1f86" />
        <stop offset="100%" stopColor="#1e0b3d" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-fundo)`} />
    <g className="casa-portal-giro" fill="none" strokeLinecap="round">
      <path d="M50 6 A44 44 0 0 1 94 50" stroke="#d9b8ff" strokeWidth="4" opacity="0.8" />
      <path d="M50 94 A44 44 0 0 1 6 50" stroke="#d9b8ff" strokeWidth="4" opacity="0.8" />
      <path d="M80 50 A30 30 0 0 1 50 80" stroke="#7fe3ff" strokeWidth="3.5" />
      <path d="M20 50 A30 30 0 0 1 50 20" stroke="#7fe3ff" strokeWidth="3.5" />
      <path d="M50 34 A16 16 0 0 1 66 50" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
      <path d="M50 66 A16 16 0 0 1 34 50" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
    </g>
    <g fill="#ffffff">
      <circle cx="14" cy="18" r="1.6" />
      <circle cx="86" cy="80" r="1.8" />
      <circle cx="82" cy="14" r="1.2" />
      <circle cx="18" cy="86" r="1.2" />
    </g>
  </>
);

/** Lama: chão de barro molhado com poças e bolhas. */
const lama: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-fundo`} cx="50%" cy="55%" r="75%">
        <stop offset="0%" stopColor="#7a5232" />
        <stop offset="100%" stopColor="#4a2f17" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-fundo)`} />
    <path d="M0 22 C 18 14, 30 30, 50 22 S 82 14, 100 24 V0 H0 Z" fill="#3a230f" opacity="0.55" />
    <path d="M0 82 C 20 74, 36 90, 56 82 S 86 76, 100 84 V100 H0 Z" fill="#3a230f" opacity="0.55" />
    <ellipse cx="22" cy="58" rx="13" ry="5" fill="#2f1c0b" opacity="0.6" />
    <ellipse cx="78" cy="44" rx="11" ry="4.5" fill="#2f1c0b" opacity="0.6" />
    <g fill="none" stroke="#b07a48" strokeWidth="1.8" opacity="0.8">
      <circle cx="16" cy="40" r="3.5" />
      <circle cx="84" cy="64" r="4.5" />
      <circle cx="70" cy="88" r="2.8" />
      <circle cx="30" cy="12" r="2.5" />
    </g>
    <path d="M8 70 q6 -4 12 0 M80 30 q5 -4 10 0" fill="none" stroke="#9a6a3e" strokeWidth="2" strokeLinecap="round" />
  </>
);

/** Baú: piso de tábuas com moedas de ouro espalhadas e brilho dourado. */
const bau: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-brilho`}>
        <stop offset="0%" stopColor="#fff1a6" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#f2b632" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#9a5f2a" />
    <path d="M0 25 H100 M0 50 H100 M0 75 H100" stroke="#6b3c16" strokeWidth="2.5" />
    <path d="M40 0 V25 M72 25 V50 M24 50 V75 M60 75 V100" stroke="#6b3c16" strokeWidth="2" />
    <rect width="100" height="100" fill={`url(#${id}-brilho)`} />
    <rect x="3" y="3" width="94" height="94" fill="none" stroke="#f2c94c" strokeWidth="4" rx="4" />
    <g fill="#ffd34d" stroke="#9a6c0a" strokeWidth="1.5">
      <ellipse cx="14" cy="16" rx="6" ry="4" />
      <ellipse cx="20" cy="20" rx="6" ry="4" />
      <ellipse cx="84" cy="84" rx="6" ry="4" />
      <ellipse cx="78" cy="88" rx="6" ry="4" />
      <ellipse cx="86" cy="14" rx="5" ry="3.5" />
      <ellipse cx="14" cy="86" rx="5" ry="3.5" />
    </g>
    <path d="M88 30 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill="#fff6c2" />
    <path d="M10 62 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z" fill="#fff6c2" />
  </>
);

/** Muralha: parede de pedra de ponta a ponta. */
const muralha: Desenho = () => (
  <>
    <rect width="100" height="100" fill="#7d828a" />
    <g fill="#8f949c" stroke="#3d3f44" strokeWidth="2.5">
      <rect x="0" y="0" width="30" height="25" />
      <rect x="30" y="0" width="40" height="25" />
      <rect x="70" y="0" width="30" height="25" />
      <rect x="0" y="25" width="50" height="25" />
      <rect x="50" y="25" width="50" height="25" />
      <rect x="0" y="50" width="30" height="25" />
      <rect x="30" y="50" width="40" height="25" />
      <rect x="70" y="50" width="30" height="25" />
      <rect x="0" y="75" width="50" height="25" />
      <rect x="50" y="75" width="50" height="25" />
    </g>
    <path
      d="M3 4 H26 M34 4 H66 M74 4 H97 M3 29 H46 M54 29 H97 M3 54 H26 M34 54 H66 M74 54 H97 M3 79 H46 M54 79 H97"
      stroke="#b4b8bf"
      strokeWidth="2"
    />
    <path d="M14 38 l6 6 M80 12 l-5 6 M62 88 l6 -5" stroke="#4d5056" strokeWidth="1.5" strokeLinecap="round" />
  </>
);

/** Gelo: placa de gelo azul com rachaduras e reflexo. */
const gelo: Desenho = (id) => (
  <>
    <defs>
      <linearGradient id={`${id}-fundo`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#eefaff" />
        <stop offset="100%" stopColor="#7cc4ea" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-fundo)`} />
    <g fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
      <path d="M0 18 L18 26 L30 10 L44 0" />
      <path d="M18 26 L14 44" />
      <path d="M100 70 L82 66 L72 84 L76 100" />
      <path d="M82 66 L90 50" />
    </g>
    <g fill="none" stroke="#4f9cc6" strokeWidth="1.5" opacity="0.7">
      <path d="M0 19 L18 27 L30 11" />
      <path d="M100 71 L82 67 L72 85" />
    </g>
    <path d="M58 8 L92 42" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
    <path d="M8 62 L28 82" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
  </>
);

/** Trampolim: lona azul esticada com molas na moldura. */
const trampolim: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-lona`}>
        <stop offset="0%" stopColor="#4a8ff0" />
        <stop offset="100%" stopColor="#1d4f9a" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#d84a3a" />
    <rect x="12" y="12" width="76" height="76" rx="8" fill={`url(#${id}-lona)`} stroke="#13325f" strokeWidth="2" />
    <g stroke="#e8e8e8" strokeWidth="2.5" strokeLinecap="round">
      <path d="M22 3 V12 M40 3 V12 M60 3 V12 M78 3 V12" />
      <path d="M22 88 V97 M40 88 V97 M60 88 V97 M78 88 V97" />
      <path d="M3 22 H12 M3 40 H12 M3 60 H12 M3 78 H12" />
      <path d="M88 22 H97 M88 40 H97 M88 60 H97 M88 78 H97" />
    </g>
    <path d="M50 76 V30 M38 42 L50 28 L62 42" fill="none" stroke="#f2c94c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
  </>
);

/** Torre de vigia: chão de pedra escura com a luz do farol e um olho no canto. */
const vigia: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-luz`} cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#3e4652" />
    <g fill="none" stroke="#2a3038" strokeWidth="2">
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="30" />
      <path d="M50 6 V20 M50 80 V94 M6 50 H20 M80 50 H94 M19 19 L29 29 M81 19 L71 29 M19 81 L29 71 M81 81 L71 71" />
    </g>
    <rect width="100" height="100" fill={`url(#${id}-luz)`} />
    <g transform="translate(78 14)">
      <ellipse rx="12" ry="7.5" fill="#ffffff" stroke="#15191f" strokeWidth="2" />
      <circle r="4.5" fill="#2f80ed" />
      <circle r="1.8" fill="#0b1220" />
    </g>
  </>
);

/** Santuário: piso de mármore claro com halo dourado. */
const santuario: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0%" stopColor="#fffbe0" />
        <stop offset="70%" stopColor="#f6edd0" />
        <stop offset="100%" stopColor="#e2d3a6" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-halo)`} />
    <path d="M10 0 C 24 30, 6 60, 22 100 M78 0 C 70 30, 92 64, 80 100" fill="none" stroke="#d8cdb4" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#d4a62a" strokeWidth="3" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="#e8c463" strokeWidth="1.5" strokeDasharray="4 4" />
    <g stroke="#d4a62a" strokeWidth="3" strokeLinecap="round">
      <path d="M50 2 V12 M50 88 V98 M2 50 H12 M88 50 H98" />
    </g>
  </>
);

/** Forja: chapa de ferro com rebites e brasas acesas nas frestas. */
const forja: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-calor`} cx="50%" cy="100%" r="80%">
        <stop offset="0%" stopColor="#ff7a1a" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#3c4048" />
    <rect width="100" height="100" fill={`url(#${id}-calor)`} />
    <path d="M0 50 H100 M50 0 V100" stroke="#25282d" strokeWidth="3" />
    <path d="M0 50 H100 M50 0 V100" stroke="#ff8a2a" strokeWidth="1.2" opacity="0.9" />
    <g fill="#6b7079" stroke="#25282d" strokeWidth="1">
      <circle cx="8" cy="8" r="3" />
      <circle cx="92" cy="8" r="3" />
      <circle cx="8" cy="92" r="3" />
      <circle cx="92" cy="92" r="3" />
      <circle cx="42" cy="8" r="2.2" />
      <circle cx="58" cy="92" r="2.2" />
    </g>
    <g fill="#ffd166">
      <circle cx="20" cy="70" r="1.8" />
      <circle cx="80" cy="26" r="1.6" />
      <circle cx="74" cy="78" r="2" />
      <circle cx="28" cy="22" r="1.4" />
    </g>
  </>
);

/** Vulcão: rocha negra cortada por rios de lava. */
const vulcao: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-lava`}>
        <stop offset="0%" stopColor="#ffe08a" />
        <stop offset="45%" stopColor="#ff6a1a" />
        <stop offset="100%" stopColor="#b3200e" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#2a1f1c" />
    <g fill="none" stroke="#ff5a1f" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 30 L18 34 L26 22 L44 26" strokeWidth="4" />
      <path d="M100 68 L82 64 L72 80 L58 76" strokeWidth="4" />
      <path d="M30 100 L34 84 L24 74" strokeWidth="3" />
      <path d="M70 0 L66 14 L78 22" strokeWidth="3" />
    </g>
    <g fill="none" stroke="#ffd166" strokeLinecap="round" strokeWidth="1.3">
      <path d="M0 30 L18 34 L26 22 L44 26" />
      <path d="M100 68 L82 64 L72 80 L58 76" />
    </g>
    <circle cx="50" cy="50" r="22" fill={`url(#${id}-lava)`} className="casa-lava-pulsa" opacity="0.8" />
    <g fill="#4a3a35">
      <circle cx="14" cy="80" r="4" />
      <circle cx="88" cy="20" r="3.5" />
    </g>
  </>
);

/** Esteira: correia com setas no sentido em que empurra e roletes nas pontas. */
const esteira: Desenho = (_id, direcao) => (
  <g transform={direcao === -1 ? "translate(100 0) scale(-1 1)" : undefined}>
    <rect width="100" height="100" fill="#2f3237" />
    <rect x="0" y="0" width="100" height="10" fill="#f2c94c" />
    <rect x="0" y="90" width="100" height="10" fill="#f2c94c" />
    <path d="M0 0 L10 10 M20 0 L30 10 M40 0 L50 10 M60 0 L70 10 M80 0 L90 10 M0 90 L10 100 M20 90 L30 100 M40 90 L50 100 M60 90 L70 100 M80 90 L90 100" stroke="#2f3237" strokeWidth="5" />
    <path d="M0 26 H100 M0 42 H100 M0 58 H100 M0 74 H100" stroke="#24272b" strokeWidth="1.5" />
    <g fill="none" stroke="#f2c94c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
      <path d="M8 34 L18 50 L8 66" />
      <path d="M40 34 L50 50 L40 66" />
      <path d="M72 34 L82 50 L72 66" />
    </g>
  </g>
);

/** Espelho: vidro prateado com moldura dourada e reflexo na diagonal. */
const espelho: Desenho = (id) => (
  <>
    <defs>
      <linearGradient id={`${id}-vidro`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f4fbff" />
        <stop offset="50%" stopColor="#b9d3ea" />
        <stop offset="100%" stopColor="#8fb2d4" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="#b08a3e" />
    <rect x="6" y="6" width="88" height="88" rx="4" fill={`url(#${id}-vidro)`} stroke="#7a5c1e" strokeWidth="2" />
    <path d="M14 40 L40 14 M14 56 L56 14" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
    <path d="M60 86 L86 60" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    <g fill="#f2d27a">
      <circle cx="6" cy="6" r="3" />
      <circle cx="94" cy="6" r="3" />
      <circle cx="6" cy="94" r="3" />
      <circle cx="94" cy="94" r="3" />
    </g>
  </>
);

/** Areia movediça: areia com um redemoinho afundando no meio. */
const areia: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-funil`}>
        <stop offset="0%" stopColor="#8a6a2a" />
        <stop offset="60%" stopColor="#c9a456" />
        <stop offset="100%" stopColor="#e6c987" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="#e6c987" />
    <circle cx="50" cy="50" r="46" fill={`url(#${id}-funil)`} />
    <path
      d="M50 50 m-38 0 a38 34 0 1 1 38 34 a28 24 0 1 1 -18 -22 a16 14 0 1 1 12 10"
      fill="none"
      stroke="#8a6a2a"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.75"
    />
    <g fill="#a8843a">
      <circle cx="8" cy="10" r="1.6" />
      <circle cx="92" cy="12" r="1.4" />
      <circle cx="90" cy="90" r="1.8" />
      <circle cx="10" cy="88" r="1.4" />
    </g>
  </>
);

/** Altar: pedra vermelha escura com círculo de runas e velas nos cantos. */
const altar: Desenho = () => (
  <>
    <rect width="100" height="100" fill="#4a2326" />
    <rect x="4" y="4" width="92" height="92" fill="none" stroke="#2e1416" strokeWidth="3" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="#c9a14a" strokeWidth="2.5" />
    <circle cx="50" cy="50" r="31" fill="none" stroke="#c9a14a" strokeWidth="1.2" />
    <g stroke="#c9a14a" strokeWidth="2" strokeLinecap="round" fill="none">
      <path d="M50 13 v6 M47 16 h6" />
      <path d="M50 81 v6 M47 84 h6" />
      <path d="M13 47 l4 6 l2 -6" />
      <path d="M81 53 l4 -6 l2 6" />
    </g>
    {[
      [11, 11],
      [89, 11],
      [11, 89],
      [89, 89],
    ].map(([x, y]) => (
      <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <rect x="-3" y="-2" width="6" height="9" rx="1" fill="#f4eee2" />
        <path d="M0 -2 C -3 -6, 0 -9, 0 -11 C 2 -7, 3 -5, 0 -2 Z" fill="#ff9f1c" />
      </g>
    ))}
  </>
);

/** Névoa: faixas de neblina cinza cobrindo a casa. */
const nevoa: Desenho = (id) => (
  <>
    <defs>
      <linearGradient id={`${id}-fundo`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c9ced6" />
        <stop offset="100%" stopColor="#9aa1ab" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-fundo)`} />
    <g fill="none" stroke="#eef1f5" strokeLinecap="round" className="casa-nevoa-flutua">
      <path d="M-4 16 C 14 8, 30 24, 50 16 S 86 8, 104 16" strokeWidth="7" opacity="0.8" />
      <path d="M-4 40 C 18 32, 34 48, 56 40 S 90 32, 104 40" strokeWidth="5" opacity="0.5" />
      <path d="M-4 64 C 14 56, 32 72, 52 64 S 86 56, 104 64" strokeWidth="5" opacity="0.5" />
      <path d="M-4 88 C 18 80, 34 96, 56 88 S 90 80, 104 88" strokeWidth="7" opacity="0.8" />
    </g>
  </>
);

/** Casa da sorte: feltro verde de cassino com dados nos cantos e um "?" dourado. */
const sorte: Desenho = (id) => (
  <>
    <defs>
      <radialGradient id={`${id}-feltro`}>
        <stop offset="0%" stopColor="#2e9b5c" />
        <stop offset="100%" stopColor="#14592f" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id}-feltro)`} />
    <rect x="4" y="4" width="92" height="92" rx="6" fill="none" stroke="#f2c94c" strokeWidth="3" strokeDasharray="6 4" />
    <g transform="translate(8 8) rotate(-12 9 9)">
      <rect width="18" height="18" rx="4" fill="#ffffff" stroke="#14592f" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="2" fill="#1b1b1b" />
      <circle cx="9" cy="9" r="2" fill="#1b1b1b" />
      <circle cx="13" cy="13" r="2" fill="#1b1b1b" />
    </g>
    <g transform="translate(74 74) rotate(14 9 9)">
      <rect width="18" height="18" rx="4" fill="#ffffff" stroke="#14592f" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="2" fill="#1b1b1b" />
      <circle cx="13" cy="5" r="2" fill="#1b1b1b" />
      <circle cx="5" cy="13" r="2" fill="#1b1b1b" />
      <circle cx="13" cy="13" r="2" fill="#1b1b1b" />
    </g>
    <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="800" fill="#f2c94c" opacity="0.35" fontFamily="system-ui, sans-serif">
      ?
    </text>
  </>
);

const DESENHOS: Record<TipoCasaEspecial, Desenho> = {
  portal,
  lama,
  bau,
  muralha,
  gelo,
  trampolim,
  vigia,
  santuario,
  forja,
  vulcao,
  esteira,
  espelho,
  areia,
  altar,
  nevoa,
  sorte,
};

/** Piso de uma casa especial dentro de um <svg> (no tabuleiro ou na legenda), recortado na casa. */
export function DesenhoCasa({ tipo, direcao = 1 }: { tipo: TipoCasaEspecial; direcao?: 1 | -1 }) {
  const id = useId().replace(/:/g, "");
  return (
    <g className={`casa-especial casa-${tipo}`} clipPath={`url(#${id}-recorte)`}>
      <defs>
        <clipPath id={`${id}-recorte`}>
          <rect width="100" height="100" />
        </clipPath>
      </defs>
      {DESENHOS[tipo](id, direcao)}
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
