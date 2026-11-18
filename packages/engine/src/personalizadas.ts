// Cartas criadas pelo jogador a partir de modelos prontos (criador de cartas).
// A definição é só dados (JSON), para salvar no navegador e, no futuro, mandar pela rede.
import type { CartaQualquer } from "./carta.ts";
import { DIAGONAIS, deslizar, RETAS, saltos, SALTOS_CAVALO, VIZINHOS } from "./movimentos.ts";
import { casasDasPecas, contarPecas, distancia, NOME_PECA, pecaCapturada } from "./tabuleiro.ts";
import type { Lance, TipoPeca } from "./tipos.ts";

/** Jeitos de andar que uma peça pode ganhar (modelo "anda como"). */
export type JeitoDeAndar = "cavalo" | "rei" | "torre" | "bispo";

export type ModeloCarta =
  | { modelo: "anda-como"; peca: TipoPeca; jeito: JeitoDeAndar }
  | { modelo: "imune-a-peao"; peca: TipoPeca }
  | { modelo: "nao-captura"; peca: TipoPeca }
  | { modelo: "parada"; peca: TipoPeca; lances: number }
  | { modelo: "alcance"; peca: TipoPeca; casas: number }
  | { modelo: "perde-sem"; peca: TipoPeca };

export type DefinicaoCarta = ModeloCarta & {
  /** Sempre começa com "minha-" para não colidir com as cartas oficiais. */
  id: string;
  nome: string;
  peso: number;
};

/** Os modelos disponíveis, para montar o formulário. */
export const MODELOS: { modelo: ModeloCarta["modelo"]; tipo: "poder" | "desvantagem"; titulo: string }[] = [
  { modelo: "anda-como", tipo: "poder", titulo: "Uma peça também anda de outro jeito" },
  { modelo: "imune-a-peao", tipo: "poder", titulo: "Uma peça não pode ser capturada por peões" },
  { modelo: "nao-captura", tipo: "desvantagem", titulo: "Uma peça não pode capturar" },
  { modelo: "parada", tipo: "desvantagem", titulo: "Uma peça fica parada no começo" },
  { modelo: "alcance", tipo: "desvantagem", titulo: "Uma peça anda no máximo algumas casas" },
  { modelo: "perde-sem", tipo: "desvantagem", titulo: "Você perde se ficar sem uma peça" },
];

const PLURAL: Record<TipoPeca, string> = {
  peao: "peões",
  cavalo: "cavalos",
  bispo: "bispos",
  torre: "torres",
  dama: "damas",
  rei: "reis",
};

const JEITO: Record<JeitoDeAndar, string> = {
  cavalo: "como um cavalo",
  rei: "1 casa em qualquer direção",
  torre: "em linha reta, como a torre",
  bispo: "na diagonal, como o bispo",
};

export function tipoDoModelo(m: ModeloCarta["modelo"]): "poder" | "desvantagem" {
  return MODELOS.find((x) => x.modelo === m)!.tipo;
}

/** O texto da carta, montado a partir do modelo. */
export function descreverModelo(d: ModeloCarta): string {
  const seus = `Seus ${PLURAL[d.peca]}`;
  switch (d.modelo) {
    case "anda-como":
      return `${seus} também podem andar ${JEITO[d.jeito]}.`;
    case "imune-a-peao":
      return `${seus} não podem ser capturados por peões.`;
    case "nao-captura":
      return `${seus} não podem capturar.`;
    case "parada":
      return `${seus} não podem se mover nos ${d.lances} primeiros lances.`;
    case "alcance":
      return `${seus} andam no máximo ${d.casas} casa(s) por lance.`;
    case "perde-sem":
      return `Você perde se ficar sem nenhum ${NOME_PECA[d.peca]}.`;
  }
}

/** Transforma a definição numa carta de verdade (com os hooks do motor). */
export function criarCartaPersonalizada(d: DefinicaoCarta): CartaQualquer {
  const base = {
    id: d.id,
    nome: d.nome,
    tipo: tipoDoModelo(d.modelo),
    peso: Math.min(5, Math.max(1, Math.round(d.peso))),
    descricao: descreverModelo(d),
  };

  switch (d.modelo) {
    case "anda-como":
      return {
        ...base,
        adicionarLances({ estado, dono }, jogador) {
          if (jogador !== dono) return [];
          const t = estado.tabuleiro;
          const lances: Lance[] = [];
          for (const de of casasDasPecas(estado, dono, d.peca)) {
            if (d.jeito === "cavalo") saltos(t, de, dono, SALTOS_CAVALO, lances);
            if (d.jeito === "rei") saltos(t, de, dono, VIZINHOS, lances);
            if (d.jeito === "torre") deslizar(t, de, dono, RETAS, lances);
            if (d.jeito === "bispo") deslizar(t, de, dono, DIAGONAIS, lances);
          }
          // Peão que chega à última fileira por outro jeito não promove (fica como está).
          return lances;
        },
      };
    case "imune-a-peao":
      return {
        ...base,
        filtrarLances({ estado, dono }, lances, jogador) {
          if (jogador === dono) return lances;
          return lances.filter((l) => {
            const alvo = pecaCapturada(estado, l);
            return !(alvo?.cor === dono && alvo.tipo === d.peca && estado.tabuleiro[l.de]?.tipo === "peao");
          });
        },
      };
    case "nao-captura":
      return {
        ...base,
        filtrarLances({ estado, dono }, lances, jogador) {
          if (jogador !== dono) return lances;
          return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== d.peca || !pecaCapturada(estado, l));
        },
      };
    case "parada":
      return {
        ...base,
        filtrarLances({ estado, dono }, lances, jogador) {
          if (jogador !== dono || estado.lancesFeitos[dono] >= d.lances) return lances;
          return lances.filter((l) => estado.tabuleiro[l.de]?.tipo !== d.peca);
        },
      };
    case "alcance":
      return {
        ...base,
        filtrarLances({ estado, dono }, lances, jogador) {
          if (jogador !== dono) return lances;
          return lances.filter(
            (l) => l.poder || estado.tabuleiro[l.de]?.tipo !== d.peca || distancia(l.de, l.para) <= d.casas,
          );
        },
      };
    case "perde-sem":
      return {
        ...base,
        condicaoDerrota: ({ estado, dono }) => contarPecas(estado, dono, d.peca) === 0,
      };
  }
}
