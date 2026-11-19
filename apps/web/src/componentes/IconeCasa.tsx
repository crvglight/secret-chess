import { useId, type ReactNode } from "react";
import type { TipoCasaEspecial } from "@xadrez/engine";

// Desenhos das casas especiais, num quadro de 100 x 100.
// Versão minimalista: formas simples, cores chapadas e poucos detalhes.
// Só o portal usa degradê (o brilho) e tem animação (gira devagar).

const TRACO = { strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Portal({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-brilho`}>
          <stop offset="0%" stopColor="#f6e8ff" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#b26bff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5b2a9e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill={`url(#${id}-brilho)`} />
      <g className="casa-portal-giro" fill="none" strokeLinecap="round">
        <path d="M50 16 A34 34 0 0 1 84 50" stroke="#e3c7ff" strokeWidth="5" />
        <path d="M50 84 A34 34 0 0 1 16 50" stroke="#e3c7ff" strokeWidth="5" />
        <path d="M72 50 A22 22 0 0 1 50 72" stroke="#7fe3ff" strokeWidth="4" />
        <path d="M28 50 A22 22 0 0 1 50 28" stroke="#7fe3ff" strokeWidth="4" />
      </g>
    </>
  );
}

function Lama() {
  return (
    <>
      <path
        d="M14 60 C 12 44, 30 36, 46 40 C 58 32, 82 36, 86 52 C 92 70, 72 82, 52 78 C 34 86, 16 78, 14 60 Z"
        fill="#6b4423"
      />
      <ellipse cx="50" cy="58" rx="18" ry="7" fill="none" stroke="#a8754a" strokeWidth="3" />
    </>
  );
}

function Bau() {
  return (
    <>
      <path d="M22 46 C 22 26, 78 26, 78 46 Z" fill="#a8642a" />
      <rect x="22" y="46" width="56" height="32" rx="3" fill="#8f5222" />
      <rect x="43" y="40" width="14" height="16" rx="3" fill="#f2c94c" />
    </>
  );
}

function Muralha() {
  return (
    <>
      <path d="M12 86 V24 H26 V34 H38 V24 H62 V34 H74 V24 H88 V86 Z" fill="#8f939b" />
      <path d="M12 54 H88 M50 34 V54 M32 54 V86 M68 54 V86" stroke="#5d6067" strokeWidth="3" fill="none" />
    </>
  );
}

function Gelo() {
  return (
    <>
      <rect x="14" y="14" width="72" height="72" rx="12" fill="#bfe6f7" stroke="#5aa7cf" strokeWidth="2.5" />
      <path d="M32 26 L46 48 L38 64 M46 48 L68 42" fill="none" stroke="#ffffff" {...TRACO} />
    </>
  );
}

function Trampolim() {
  return (
    <>
      <path d="M30 68 L24 84 M70 68 L76 84" stroke="#3d3f44" {...TRACO} strokeWidth="5" />
      <ellipse cx="50" cy="66" rx="32" ry="9" fill="#2f80ed" />
      <path d="M50 52 V20 M38 32 L50 20 L62 32" fill="none" stroke="#f2c94c" {...TRACO} strokeWidth="6" />
    </>
  );
}

function Vigia() {
  return (
    <>
      <path d="M34 86 L39 42 H61 L66 86 Z" fill="#9a9ea6" />
      <path d="M32 42 V28 H40 V34 H46 V28 H54 V34 H60 V28 H68 V42 Z" fill="#b5b9c0" />
      <circle cx="50" cy="62" r="7" fill="#2f80ed" />
    </>
  );
}

function Santuario() {
  return (
    <>
      <path d="M50 16 L78 26 V48 C78 66, 64 78, 50 86 C36 78, 22 66, 22 48 V26 Z" fill="#e8eef7" stroke="#6b84a8" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 32 V66 M37 46 H63" stroke="#d4a62a" {...TRACO} strokeWidth="6" />
    </>
  );
}

function Forja() {
  return (
    <>
      <path d="M18 46 H82 L74 56 H58 L64 78 H36 L42 56 H26 Z" fill="#4b4f57" strokeLinejoin="round" />
      <path d="M50 38 L44 22 M58 36 L66 22" stroke="#ff9f1c" {...TRACO} />
    </>
  );
}

function Vulcao() {
  return (
    <>
      <path d="M10 86 L38 36 H62 L90 86 Z" fill="#6d4c3d" />
      <path d="M38 36 C 42 46, 46 42, 50 50 C 54 42, 58 46, 62 36 Z" fill="#ff5a1f" />
      <path d="M50 28 C 44 20, 54 14, 48 8" fill="none" stroke="#9aa0a6" {...TRACO} />
    </>
  );
}

function Esteira({ direcao }: { direcao: 1 | -1 }) {
  return (
    <g transform={direcao === -1 ? "translate(100 0) scale(-1 1)" : undefined}>
      <rect x="12" y="38" width="76" height="24" rx="12" fill="#3d3f44" />
      <path d="M30 50 H64 M54 41 L65 50 L54 59" fill="none" stroke="#f2c94c" {...TRACO} strokeWidth="5" />
    </g>
  );
}

function Espelho() {
  return (
    <>
      <ellipse cx="50" cy="48" rx="25" ry="33" fill="#cfe5f5" stroke="#b08a3e" strokeWidth="5" />
      <path d="M38 38 L56 26" stroke="#ffffff" {...TRACO} />
      <path d="M50 82 V90" stroke="#b08a3e" {...TRACO} strokeWidth="5" />
    </>
  );
}

function Areia() {
  return (
    <>
      <ellipse cx="50" cy="56" rx="38" ry="26" fill="#e2c27a" />
      <path
        d="M50 56 m-20 0 a20 13 0 1 1 20 13 a12 8 0 1 1 -9 -8"
        fill="none"
        stroke="#a8843a"
        {...TRACO}
        strokeWidth="3"
      />
    </>
  );
}

function Altar() {
  return (
    <>
      <rect x="20" y="58" width="60" height="12" rx="2" fill="#a7a2a0" />
      <path d="M28 70 V86 M72 70 V86" stroke="#a7a2a0" strokeWidth="7" />
      <rect x="44" y="36" width="12" height="22" rx="2" fill="#f4eee2" />
      <path d="M50 32 C 44 24, 50 16, 50 12 C 54 20, 58 24, 50 32 Z" fill="#ff9f1c" />
    </>
  );
}

function Nevoa() {
  return (
    <>
      <path
        d="M20 60 C 12 60, 12 46, 22 46 C 22 32, 42 30, 46 40 C 52 28, 72 30, 72 44 C 86 42, 88 60, 76 60 Z"
        fill="#d9dde3"
        stroke="#8a9099"
        strokeWidth="2.5"
      />
      <path d="M24 74 H76" stroke="#b9bfc8" {...TRACO} strokeWidth="5" />
    </>
  );
}

function Sorte() {
  return (
    <g transform="rotate(-10 50 50)">
      <rect x="22" y="22" width="56" height="56" rx="12" fill="#ffffff" stroke="#2b2119" strokeWidth="3" />
      <g fill="#2b2119">
        <circle cx="36" cy="36" r="5.5" />
        <circle cx="50" cy="50" r="5.5" />
        <circle cx="64" cy="64" r="5.5" />
        <circle cx="64" cy="36" r="5.5" />
        <circle cx="36" cy="64" r="5.5" />
      </g>
    </g>
  );
}

const DESENHOS: Record<TipoCasaEspecial, (id: string, direcao: 1 | -1) => ReactNode> = {
  portal: (id) => <Portal id={id} />,
  lama: () => <Lama />,
  bau: () => <Bau />,
  muralha: () => <Muralha />,
  gelo: () => <Gelo />,
  trampolim: () => <Trampolim />,
  vigia: () => <Vigia />,
  santuario: () => <Santuario />,
  forja: () => <Forja />,
  vulcao: () => <Vulcao />,
  esteira: (_id, direcao) => <Esteira direcao={direcao} />,
  espelho: () => <Espelho />,
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
