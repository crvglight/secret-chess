import { useCallback, useEffect, useRef } from "react";
import type { Estado, JogadaIA, NivelIA } from "@xadrez/engine";
import type { PedidoIA, RespostaIA } from "./ia.worker.ts";

/** Devolve uma função que pede a jogada da IA ao Web Worker (sem travar a tela). */
export function useIA(): (estado: Estado, nivel: NivelIA) => Promise<JogadaIA> {
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

  return useCallback(
    (estado, nivel) =>
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
        const pedido: PedidoIA = { id, estado, nivel };
        worker.postMessage(pedido);
      }),
    [],
  );
}
