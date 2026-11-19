import { useCallback, useEffect, useRef } from "react";
import { fenParaStockfish, lanceDoUci, type Estado, type JogadaIA, type NivelIA } from "@xadrez/engine";
import type { PedidoIA, RespostaIA } from "./ia.worker.ts";
import { FORCA_PADRAO, stockfish } from "./stockfish.ts";

/** Os níveis da IA do jogo mais o Stockfish. */
export type NivelAdversario = NivelIA | "stockfish";

/** Quanto tempo a IA do jogo pensa nas cartas quando o adversário é o Stockfish. */
const TEMPO_CARTAS_MS = 900;

/**
 * Devolve uma função que pede a jogada da IA (sem travar a tela).
 *
 * Contra o Stockfish o jogo é híbrido: a IA do jogo decide se vale jogar carta ou
 * usar poder (o Stockfish não conhece as cartas). Se ela decidir que não, quem
 * escolhe o lance é o Stockfish, entre os lances permitidos pelas cartas.
 */
export function useIA(
  precarregarStockfish = false,
): (estado: Estado, nivel: NivelAdversario, forca?: number) => Promise<JogadaIA> {
  const workerRef = useRef<Worker | null>(null);
  const contador = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL("./ia.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Baixa o Stockfish logo no começo da partida (a primeira jogada não fica esperando).
  useEffect(() => {
    if (precarregarStockfish) stockfish.iniciar().catch(() => undefined);
  }, [precarregarStockfish]);

  const pedirAoWorker = useCallback(
    (estado: Estado, nivel: NivelIA, tempoMs?: number) =>
      new Promise<JogadaIA>((resolver, rejeitar) => {
        const worker = workerRef.current;
        if (!worker) {
          rejeitar(new Error("A IA ainda não está pronta"));
          return;
        }
        const id = ++contador.current;
        const ouvir = (ev: MessageEvent<RespostaIA>) => {
          if (ev.data.id !== id) return;
          worker.removeEventListener("message", ouvir);
          if ("erro" in ev.data) rejeitar(new Error(ev.data.erro));
          else resolver(ev.data.jogada);
        };
        worker.addEventListener("message", ouvir);
        const pedido: PedidoIA = { id, estado, nivel, ...(tempoMs ? { tempoMs } : {}) };
        worker.postMessage(pedido);
      }),
    [],
  );

  return useCallback(
    async (estado, nivel, forca = FORCA_PADRAO) => {
      if (nivel !== "stockfish") return pedirAoWorker(estado, nivel);

      // 1) A IA do jogo vê se vale usar carta ou poder agora.
      const doJogo = await pedirAoWorker(estado, "medio", TEMPO_CARTAS_MS);
      if (doJogo.carta !== null || doJogo.poder || doJogo.lance.poder) return doJogo;

      // 2) Senão, o Stockfish escolhe o lance (se a posição for de xadrez normal).
      const fen = fenParaStockfish(estado);
      if (!fen) return doJogo;
      try {
        const { melhor, alternativas } = await stockfish.pensar(fen, forca);
        // Se uma carta proíbe o lance preferido, vai para o próximo da lista.
        for (const uci of [melhor, ...alternativas]) {
          const lance = lanceDoUci(estado, uci);
          if (lance) return { ...doJogo, lance };
        }
      } catch {
        // Stockfish fora do ar (não carregou ou travou): fica a jogada da IA do jogo.
      }
      return doJogo;
    },
    [pedirAoWorker],
  );
}
