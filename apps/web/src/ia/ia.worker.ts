/// <reference lib="webworker" />
import { escolherJogada, type Estado, type JogadaIA, type NivelIA } from "@xadrez/engine";

export interface PedidoIA {
  id: number;
  estado: Estado;
  nivel: NivelIA;
}

export type RespostaIA = { id: number; jogada: JogadaIA } | { id: number; erro: string };

const escopo = self as unknown as DedicatedWorkerGlobalScope;

escopo.onmessage = (ev: MessageEvent<PedidoIA>) => {
  const { id, estado, nivel } = ev.data;
  let resposta: RespostaIA;
  try {
    resposta = { id, jogada: escolherJogada(estado, nivel) };
  } catch (erro) {
    resposta = { id, erro: erro instanceof Error ? erro.message : String(erro) };
  }
  escopo.postMessage(resposta);
};
