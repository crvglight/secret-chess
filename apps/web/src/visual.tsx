// Preferências visuais (tema do tabuleiro, estilo das peças, cores e ajustes), salvas no navegador.
// O tema vira atributos no <html> (data-tabuleiro, data-pecas...) e o CSS troca as variáveis.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TemaTabuleiro =
  | "madeira"
  | "torneio"
  | "marmore"
  | "papel"
  | "floresta"
  | "oceano"
  | "gelo"
  | "lava"
  | "neon"
  | "pixel"
  | "personalizado";

export type EstiloPecas = "classico" | "sombra" | "vidro" | "neon" | "pixel" | "fichas" | "geometrico";
export type TamanhoTabuleiro = "pequeno" | "medio" | "grande";

/** Cores escolhidas pelo jogador (tema "Personalizado" e, se ligado, as peças). */
export interface CoresPersonalizadas {
  casaClara: string;
  casaEscura: string;
  selecao: string;
  pecaBranca: string;
  pecaBrancaContorno: string;
  pecaPreta: string;
  pecaPretaContorno: string;
}

export interface Visual {
  tabuleiro: TemaTabuleiro;
  pecas: EstiloPecas;
  cores: CoresPersonalizadas;
  /** Usa as cores personalizadas nas peças (estilos que aceitam cor). */
  coresNasPecas: boolean;
  coordenadas: boolean;
  ultimoLance: boolean;
  lancesPossiveis: boolean;
  animacao: boolean;
  tamanho: TamanhoTabuleiro;
  corSetas: string;
}

export const TEMAS: { id: TemaTabuleiro; nome: string; descricao: string }[] = [
  { id: "madeira", nome: "Madeira", descricao: "Clássico, com veios de madeira" },
  { id: "torneio", nome: "Torneio", descricao: "Verde e creme, como nos clubes" },
  { id: "marmore", nome: "Mármore", descricao: "Claro, com veios de pedra" },
  { id: "papel", nome: "Papel", descricao: "Desenhado à mão, com hachuras" },
  { id: "floresta", nome: "Floresta", descricao: "Musgo e terra" },
  { id: "oceano", nome: "Oceano", descricao: "Azuis com ondas" },
  { id: "gelo", nome: "Gelo", descricao: "Claro e frio, com cristais" },
  { id: "lava", nome: "Lava", descricao: "Pedra escura com rachaduras quentes" },
  { id: "neon", nome: "Neon", descricao: "Escuro, com grade brilhante" },
  { id: "pixel", nome: "Pixel", descricao: "Cores de videogame antigo" },
  { id: "personalizado", nome: "Personalizado", descricao: "As cores que você escolher" },
];

export const ESTILOS: { id: EstiloPecas; nome: string; descricao: string; aceitaCor: boolean }[] = [
  { id: "classico", nome: "Clássico", descricao: "Silhuetas tradicionais", aceitaCor: true },
  { id: "sombra", nome: "Sombra", descricao: "Contorno grosso e sombra marcada", aceitaCor: true },
  { id: "vidro", nome: "Vidro", descricao: "Transparentes e brilhantes", aceitaCor: false },
  { id: "neon", nome: "Neon", descricao: "Contorno colorido e brilhante", aceitaCor: false },
  { id: "pixel", nome: "Pixel", descricao: "Pixel art 12 × 12", aceitaCor: true },
  { id: "fichas", nome: "Fichas", descricao: "Discos com a letra da peça", aceitaCor: true },
  { id: "geometrico", nome: "Geométrico", descricao: "Uma forma simples para cada peça", aceitaCor: true },
];

export const TAMANHOS: { id: TamanhoTabuleiro; nome: string }[] = [
  { id: "pequeno", nome: "Pequeno" },
  { id: "medio", nome: "Médio" },
  { id: "grande", nome: "Grande" },
];

export const CORES_DAS_SETAS = ["#f08c1a", "#e5484d", "#3f8fd8", "#30a46c", "#8e4ec6"];

export const VISUAL_PADRAO: Visual = {
  tabuleiro: "madeira",
  pecas: "classico",
  cores: {
    casaClara: "#f0d9b5",
    casaEscura: "#946f51",
    selecao: "#f2c94c",
    pecaBranca: "#fbf7f0",
    pecaBrancaContorno: "#2b2119",
    pecaPreta: "#2b2119",
    pecaPretaContorno: "#f1e6d4",
  },
  coresNasPecas: false,
  coordenadas: true,
  ultimoLance: true,
  lancesPossiveis: true,
  animacao: true,
  tamanho: "medio",
  corSetas: "#f08c1a",
};

const CHAVE = "xadrez-visual";
const COR_VALIDA = /^#[0-9a-f]{6}$/i;

/** Lê o que está salvo, conferindo campo a campo (o que estiver estranho volta ao padrão). */
export function lerVisual(): Visual {
  let salvo: Partial<Visual> = {};
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Partial<Visual>;
  } catch {
    // sem localStorage ou JSON quebrado: fica o padrão
  }
  const p = VISUAL_PADRAO;
  const bool = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);
  const cor = (v: unknown, padrao: string) => (typeof v === "string" && COR_VALIDA.test(v) ? v : padrao);
  const cores = Object.fromEntries(
    Object.entries(p.cores).map(([k, padrao]) => [k, cor(salvo.cores?.[k as keyof CoresPersonalizadas], padrao)]),
  ) as unknown as CoresPersonalizadas;
  return {
    tabuleiro: TEMAS.some((t) => t.id === salvo.tabuleiro) ? salvo.tabuleiro! : p.tabuleiro,
    pecas: ESTILOS.some((e) => e.id === salvo.pecas) ? salvo.pecas! : p.pecas,
    cores,
    coresNasPecas: bool(salvo.coresNasPecas, p.coresNasPecas),
    coordenadas: bool(salvo.coordenadas, p.coordenadas),
    ultimoLance: bool(salvo.ultimoLance, p.ultimoLance),
    lancesPossiveis: bool(salvo.lancesPossiveis, p.lancesPossiveis),
    animacao: bool(salvo.animacao, p.animacao),
    tamanho: TAMANHOS.some((t) => t.id === salvo.tamanho) ? salvo.tamanho! : p.tamanho,
    corSetas: cor(salvo.corSetas, p.corSetas),
  };
}

/** Coloca o visual no <html>. Chamado antes do primeiro desenho para não piscar. */
export function aplicarVisual(v: Visual): void {
  const raiz = document.documentElement;
  raiz.dataset.tabuleiro = v.tabuleiro;
  raiz.dataset.pecas = v.pecas;
  raiz.dataset.coresPecas = v.coresNasPecas ? "usuario" : "estilo";
  raiz.dataset.tamanho = v.tamanho;
  raiz.dataset.animacao = v.animacao ? "sim" : "nao";
  const css = raiz.style;
  css.setProperty("--usuario-casa-clara", v.cores.casaClara);
  css.setProperty("--usuario-casa-escura", v.cores.casaEscura);
  css.setProperty("--usuario-selecao", v.cores.selecao);
  css.setProperty("--usuario-peca-branca", v.cores.pecaBranca);
  css.setProperty("--usuario-peca-branca-contorno", v.cores.pecaBrancaContorno);
  css.setProperty("--usuario-peca-preta", v.cores.pecaPreta);
  css.setProperty("--usuario-peca-preta-contorno", v.cores.pecaPretaContorno);
  css.setProperty("--seta", v.corSetas);
}

interface ContextoVisual {
  visual: Visual;
  mudar(parcial: Partial<Visual>): void;
  restaurar(): void;
}

const Contexto = createContext<ContextoVisual>({ visual: VISUAL_PADRAO, mudar: () => {}, restaurar: () => {} });

function salvar(v: Visual): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(v));
  } catch {
    // Sem localStorage (janela privada): vale só nesta visita.
  }
}

export function ProvedorVisual({ children }: { children: ReactNode }) {
  const [visual, setVisual] = useState(lerVisual);

  useEffect(() => aplicarVisual(visual), [visual]);

  // Outra janela (ex.: a de análise) mudou o visual: acompanha.
  useEffect(() => {
    const aoMudar = (ev: StorageEvent) => {
      if (ev.key === CHAVE) setVisual(lerVisual());
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const mudar = useCallback((parcial: Partial<Visual>) => {
    setVisual((atual) => {
      const novo = { ...atual, ...parcial };
      salvar(novo);
      return novo;
    });
  }, []);

  const restaurar = useCallback(() => {
    salvar(VISUAL_PADRAO);
    setVisual(VISUAL_PADRAO);
  }, []);

  const valor = useMemo(() => ({ visual, mudar, restaurar }), [visual, mudar, restaurar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useVisual = () => useContext(Contexto);
