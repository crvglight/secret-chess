import { useId, type ReactNode } from "react";
import type { TipoCasaEspecial } from "@xadrez/engine";

// Desenhos das casas especiais (SVG original), num quadro de 100 x 100.
// Cada desenho cria os próprios degradês com um id único (pode haver vários no tabuleiro).

function Portal({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-brilho`}>
          <stop offset="0%" stopColor="#f6e8ff" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#b26bff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#5b2a9e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${id}-brilho)`} />
      <g className="casa-portal-giro" fill="none" strokeLinecap="round">
        <path d="M50 14 A36 36 0 0 1 86 50" stroke="#e3c7ff" strokeWidth="5" />
        <path d="M50 86 A36 36 0 0 1 14 50" stroke="#e3c7ff" strokeWidth="5" />
        <path d="M74 50 A24 24 0 0 1 50 74" stroke="#7fe3ff" strokeWidth="4" />
        <path d="M26 50 A24 24 0 0 1 50 26" stroke="#7fe3ff" strokeWidth="4" />
        <path d="M50 38 A12 12 0 0 1 62 50" stroke="#ffffff" strokeWidth="3" />
        <path d="M50 62 A12 12 0 0 1 38 50" stroke="#ffffff" strokeWidth="3" />
      </g>
    </>
  );
}

function Lama({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-poca`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#8a5a32" />
          <stop offset="70%" stopColor="#5e3b1c" />
          <stop offset="100%" stopColor="#3e2610" />
        </radialGradient>
      </defs>
      <path
        d="M12 60 C 10 42, 30 34, 46 38 C 58 30, 82 34, 88 52 C 94 70, 74 84, 52 80 C 34 88, 14 80, 12 60 Z"
        fill={`url(#${id}-poca)`}
        stroke="#2e1c0b"
        strokeWidth="2"
      />
      <ellipse cx="50" cy="58" rx="22" ry="9" fill="none" stroke="#b07a48" strokeWidth="2.5" opacity="0.8" />
      <ellipse cx="50" cy="58" rx="10" ry="4" fill="none" stroke="#c99464" strokeWidth="2" opacity="0.8" />
      <circle cx="30" cy="52" r="3.5" fill="#a77345" />
      <circle cx="72" cy="66" r="4.5" fill="#a77345" />
      <circle cx="66" cy="46" r="2.5" fill="#c99464" />
      <path d="M20 30 q4 -8 8 0 M78 26 q3 -6 6 0" fill="none" stroke="#7a4f2a" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Bau({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0%" stopColor="#fff2a8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffd34d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="42" fill={`url(#${id}-aura)`} />
      {/* Tampa arredondada */}
      <path d="M20 46 C 20 24, 80 24, 80 46 Z" fill="#a8642a" stroke="#4a2a0e" strokeWidth="3" />
      <path d="M30 30 C 34 27, 40 26, 44 26 M56 26 C 60 26, 66 27, 70 30" stroke="#c98a4b" strokeWidth="2" fill="none" />
      {/* Caixa com tábuas */}
      <rect x="20" y="46" width="60" height="34" rx="3" fill="#8f5222" stroke="#4a2a0e" strokeWidth="3" />
      <path d="M20 58 H80 M20 69 H80" stroke="#6b3c16" strokeWidth="2" />
      {/* Cintas douradas e fechadura */}
      <rect x="28" y="28" width="7" height="52" fill="#f2c94c" stroke="#8a6a12" strokeWidth="1.5" />
      <rect x="65" y="28" width="7" height="52" fill="#f2c94c" stroke="#8a6a12" strokeWidth="1.5" />
      <rect x="43" y="42" width="14" height="16" rx="3" fill="#ffd966" stroke="#8a6a12" strokeWidth="2" />
      <circle cx="50" cy="49" r="2.5" fill="#4a2a0e" />
      <path d="M50 51 v4" stroke="#4a2a0e" strokeWidth="2.5" strokeLinecap="round" />
      {/* Brilhos */}
      <path d="M84 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#fff6c2" />
      <path d="M14 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill="#fff6c2" />
    </>
  );
}

function Muralha() {
  return (
    <>
      {/* Ameias no alto */}
      <path
        d="M8 34 V18 H22 V26 H32 V18 H46 V26 H54 V18 H68 V26 H78 V18 H92 V34 Z"
        fill="#9a9ea6"
        stroke="#3d3f44"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Corpo de pedra */}
      <rect x="8" y="34" width="84" height="54" fill="#868a92" stroke="#3d3f44" strokeWidth="3" />
      <path
        d="M8 52 H92 M8 70 H92 M30 34 V52 M58 34 V52 M82 34 V52 M18 52 V70 M44 52 V70 M70 52 V70 M30 70 V88 M58 70 V88 M82 70 V88"
        stroke="#3d3f44"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Luz no alto das pedras */}
      <path d="M11 37 H27 M33 37 H55 M61 37 H79 M11 55 H15 M21 55 H41 M47 55 H67 M73 55 H89" stroke="#b9bdc4" strokeWidth="2" />
    </>
  );
}

function Gelo({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-gelo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2fbff" />
          <stop offset="100%" stopColor="#8fd0f0" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" rx="10" fill={`url(#${id}-gelo)`} stroke="#5aa7cf" strokeWidth="3" opacity="0.9" />
      <path d="M28 22 L44 46 L36 62 M44 46 L66 40 L78 58 M66 40 L70 22" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 76 L36 66" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

function Trampolim() {
  return (
    <>
      <path d="M26 66 L20 86 M74 66 L80 86 M50 70 L50 86" stroke="#3d3f44" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="50" cy="64" rx="34" ry="10" fill="#2f80ed" stroke="#1b4f91" strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="24" ry="5" fill="#5aa0ff" />
      <path d="M50 52 V18 M38 30 L50 16 L62 30" fill="none" stroke="#f2c94c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Vigia() {
  return (
    <>
      <path d="M32 88 L38 40 H62 L68 88 Z" fill="#9a9ea6" stroke="#3d3f44" strokeWidth="3" />
      <path d="M30 40 V26 H38 V32 H46 V26 H54 V32 H62 V26 H70 V40 Z" fill="#b5b9c0" stroke="#3d3f44" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="60" rx="13" ry="8" fill="#ffffff" stroke="#3d3f44" strokeWidth="2.5" />
      <circle cx="50" cy="60" r="4.5" fill="#2f80ed" />
    </>
  );
}

function Santuario({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0%" stopColor="#fff9d6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffe27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${id}-aura)`} />
      <path
        d="M50 16 L78 26 V48 C78 66, 64 78, 50 86 C36 78, 22 66, 22 48 V26 Z"
        fill="#e8eef7"
        stroke="#6b84a8"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M50 30 V68 M36 46 H64" stroke="#d4a62a" strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function Forja() {
  return (
    <>
      <path d="M18 44 H82 L74 54 H58 L64 76 H36 L42 54 H26 Z" fill="#4b4f57" stroke="#22252a" strokeWidth="3" strokeLinejoin="round" />
      <rect x="30" y="76" width="40" height="8" rx="2" fill="#33363c" />
      <path d="M50 38 L44 22 M56 36 L66 20 M44 36 L30 26" stroke="#ff9f1c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="20" r="3" fill="#ffd166" />
      <circle cx="68" cy="18" r="3" fill="#ffd166" />
      <circle cx="28" cy="24" r="2.5" fill="#ffd166" />
    </>
  );
}

function Vulcao() {
  return (
    <>
      <path d="M8 86 L38 34 H62 L92 86 Z" fill="#6d4c3d" stroke="#3a261c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 34 C 42 44, 46 40, 50 50 C 54 42, 58 46, 62 34 Z" fill="#ff5a1f" />
      <path d="M44 34 L40 52 M56 34 L60 56" stroke="#ff8a3d" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M50 28 C 44 18, 52 14, 48 6 M58 26 C 64 18, 58 12, 64 6 M42 26 C 36 20, 40 14, 36 8"
        fill="none"
        stroke="#9aa0a6"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

function Esteira({ direcao }: { direcao: 1 | -1 }) {
  return (
    <g transform={direcao === -1 ? "translate(100 0) scale(-1 1)" : undefined}>
      <rect x="10" y="38" width="80" height="26" rx="13" fill="#3d3f44" stroke="#22252a" strokeWidth="3" />
      <circle cx="23" cy="51" r="7" fill="#6b6f77" />
      <circle cx="77" cy="51" r="7" fill="#6b6f77" />
      <path d="M34 51 H62 M54 43 L64 51 L54 59" fill="none" stroke="#f2c94c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 74 H80" stroke="#f2c94c" strokeWidth="3" strokeDasharray="8 6" />
    </g>
  );
}

function Espelho({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-vidro`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9f6ff" />
          <stop offset="100%" stopColor="#9cc3e6" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="48" rx="26" ry="34" fill={`url(#${id}-vidro)`} stroke="#b08a3e" strokeWidth="6" />
      <path d="M38 30 L54 22 M36 42 L60 30" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 82 V92 M38 92 H62" stroke="#b08a3e" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function Areia() {
  return (
    <>
      <ellipse cx="50" cy="56" rx="40" ry="28" fill="#e2c27a" stroke="#a8843a" strokeWidth="3" />
      <path
        d="M50 56 m-22 0 a22 14 0 1 1 22 14 a14 9 0 1 1 -10 -9 a6 4 0 1 1 6 3"
        fill="none"
        stroke="#a8843a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="24" cy="44" r="2" fill="#a8843a" />
      <circle cx="78" cy="62" r="2" fill="#a8843a" />
      <circle cx="70" cy="40" r="1.8" fill="#a8843a" />
    </>
  );
}

function Altar() {
  return (
    <>
      <rect x="18" y="56" width="64" height="14" rx="2" fill="#a7a2a0" stroke="#4d4846" strokeWidth="3" />
      <path d="M26 70 V88 M74 70 V88" stroke="#4d4846" strokeWidth="7" />
      <rect x="44" y="34" width="12" height="22" rx="2" fill="#f4eee2" stroke="#4d4846" strokeWidth="2" />
      <path d="M50 30 C 44 22, 50 14, 50 10 C 54 18, 58 22, 50 30 Z" fill="#ff9f1c" stroke="#e05a00" strokeWidth="1.5" />
    </>
  );
}

function Nevoa() {
  return (
    <>
      <path
        d="M18 58 C 10 58, 10 44, 20 44 C 20 30, 40 28, 44 38 C 50 26, 72 28, 72 42 C 86 40, 90 58, 76 60 Z"
        fill="#d9dde3"
        stroke="#8a9099"
        strokeWidth="3"
        opacity="0.95"
      />
      <path d="M16 70 H62 M30 80 H84" stroke="#b9bfc8" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function Sorte() {
  return (
    <>
      <g transform="rotate(-10 50 50)">
        <rect x="20" y="20" width="60" height="60" rx="12" fill="#ffffff" stroke="#2b2119" strokeWidth="4" />
        <g fill="#2b2119">
          <circle cx="35" cy="35" r="6" />
          <circle cx="50" cy="50" r="6" />
          <circle cx="65" cy="65" r="6" />
          <circle cx="65" cy="35" r="6" />
          <circle cx="35" cy="65" r="6" />
        </g>
      </g>
      <path d="M84 12 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#f2c94c" />
    </>
  );
}

const DESENHOS: Record<TipoCasaEspecial, (id: string, direcao: 1 | -1) => ReactNode> = {
  portal: (id) => <Portal id={id} />,
  lama: (id) => <Lama id={id} />,
  bau: (id) => <Bau id={id} />,
  muralha: () => <Muralha />,
  gelo: (id) => <Gelo id={id} />,
  trampolim: () => <Trampolim />,
  vigia: () => <Vigia />,
  santuario: (id) => <Santuario id={id} />,
  forja: () => <Forja />,
  vulcao: () => <Vulcao />,
  esteira: (_id, direcao) => <Esteira direcao={direcao} />,
  espelho: (id) => <Espelho id={id} />,
  areia: () => <Areia />,
  altar: () => <Altar />,
  nevoa: () => <Nevoa />,
  sorte: () => <Sorte />,
};

/** Desenho de uma casa especial dentro de um <svg> (no tabuleiro ou na legenda). */
export function DesenhoCasa({ tipo, direcao = 1 }: { tipo: TipoCasaEspecial; direcao?: 1 | -1 }) {
  const id = useId().replace(/:/g, "");
  return <g className={`casa-especial casa-${tipo}`}>{DESENHOS[tipo](id, direcao)}</g>;
}

export function IconeCasa({ tipo, tamanho = 28 }: { tipo: TipoCasaEspecial; tamanho?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
      <DesenhoCasa tipo={tipo} />
    </svg>
  );
}
