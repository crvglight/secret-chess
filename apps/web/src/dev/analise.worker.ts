/// <reference lib="webworker" />
// Só existe no modo de desenvolvimento (pnpm dev). Não entra no build publicado.
// Analisa sem parar e manda um resultado a cada profundidade completa.
import { analisarAoVivo, textoJogada, type Estado } from "@xadrez/engine";

export interface LinhaAnalise {
  texto: string;
  de: number;
  para: number;
  avaliacao: number;
  linha: string[];
}

export type RespostaAnalise =
  | { tipo: "parcial"; profundidade: number; lances: LinhaAnalise[]; tempoMs: number }
  | { tipo: "fim" }
  | { tipo: "erro"; erro: string };

const escopo = self as unknown as DedicatedWorkerGlobalScope;
const enviar = (r: RespostaAnalise) => escopo.postMessage(r);

escopo.onmessage = (ev: MessageEvent<Estado>) => {
  const estado = ev.data;
  const inicio = Date.now();
  try {
    analisarAoVivo(estado, (analise) =>
      enviar({
        tipo: "parcial",
        profundidade: analise.profundidade,
        tempoMs: Date.now() - inicio,
        lances: analise.lances.map((l) => ({
          texto: textoJogada(estado, l.poder, l.lance, l.carta),
          de: l.lance.de,
          para: l.lance.para,
          avaliacao: l.avaliacao,
          linha: l.linha,
        })),
      }),
    );
    enviar({ tipo: "fim" });
  } catch (erro) {
    enviar({ tipo: "erro", erro: erro instanceof Error ? erro.message : String(erro) });
  }
};
