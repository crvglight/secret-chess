/// <reference lib="webworker" />
import { escolherJogada, type Estado, type JogadaIA, type NivelIA } from "@xadrez/engine";

export interface PedidoIA {
  id: number;
  estado: Estado;
  nivel: NivelIA;
  /** Tempo para pensar (sem isso, o do nível). */
  tempoMs?: number;
}

export type RespostaIA = { id: number; jogada: JogadaIA } | { id: number; erro: string };

const escopo = self as unknown as DedicatedWorkerGlobalScope;

escopo.onmessage = (ev: MessageEvent<PedidoIA>) => {
  const { id, estado, nivel, tempoMs } = ev.data;
  let resposta: RespostaIA;
  try {
    resposta = { id, jogada: escolherJogada(estado, nivel, tempoMs ? { tempoMs } : {}) };
  } catch (erro) {
    resposta = { id, erro: erro instanceof Error ? erro.message : String(erro) };
  }
  escopo.postMessage(resposta);
};
