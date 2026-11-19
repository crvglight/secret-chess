import type { Cor } from "@xadrez/engine";
import type { NivelAdversario } from "./ia/useIA.ts";

/** O jeito de distribuir e usar as cartas na partida. */
export type RegrasPartida = "padrao" | "draft" | "mao" | "caos";

/** Opções que valem em qualquer modo. */
interface Opcoes {
  regras: RegrasPartida;
  /** Casas especiais no tabuleiro ("todas" = os 16 tipos de uma vez, para testar). */
  casasEspeciais?: boolean | "todas";
}

export type ModoPartida =
  | ({ tipo: "local" } & Opcoes)
  /** Contra o Stockfish, "forca" vai de 1 a 8. */
  | ({ tipo: "ia"; nivel: NivelAdversario; forca?: number; corHumano: Cor } & Opcoes)
  /** Online: "corHumano" é a cor deste navegador. */
  | ({ tipo: "online"; corHumano: Cor; codigo: string } & Opcoes);

export const NOME_NIVEL: Record<NivelAdversario, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
  stockfish: "Stockfish",
};

/** Nome do adversário IA (ex.: "IA média", "Stockfish força 5"). */
export function nomeDaIA(nivel: NivelAdversario, forca?: number): string {
  if (nivel === "stockfish") return `Stockfish força ${forca ?? 4}`;
  return `IA ${NOME_NIVEL[nivel].toLowerCase()}`;
}

export const REGRAS: { id: RegrasPartida; nome: string; descricao: string; pronto: boolean }[] = [
  { id: "padrao", nome: "Padrão", descricao: "1 poder e 1 desvantagem sorteados em segredo.", pronto: true },
  { id: "draft", nome: "Draft", descricao: "Veja 3 poderes e 3 desvantagens e escolha 1 de cada.", pronto: true },
  { id: "mao", nome: "Mão de cartas", descricao: "Comece com 3 poderes de uso único e compre 1 a cada 10 lances.", pronto: true },
  { id: "caos", nome: "Caos", descricao: "A cada 8 lances (4 de cada lado), um evento muda a partida para os dois lados.", pronto: true },
];

export const NOME_REGRAS: Record<RegrasPartida, string> = Object.fromEntries(REGRAS.map((r) => [r.id, r.nome])) as Record<
  RegrasPartida,
  string
>;
