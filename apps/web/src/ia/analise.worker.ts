/// <reference lib="webworker" />
// Análise depois da partida, jogada por jogada (pesada: fica fora da tela).
import { analisarTurno, turnosDaPartida, type AcaoPartida, type Cor, type Estado, type JogadaAnalisada } from "@xadrez/engine";

export interface PedidoAnalise {
  inicial: Estado;
  acoes: AcaoPartida[];
  /** Os lados a analisar (contra a IA ou online, só o seu). */
  cores: Cor[];
  tempoMs: number;
}

export type MensagemAnalise =
  | { tipo: "inicio"; total: number }
  | { tipo: "jogada"; jogada: JogadaAnalisada; feitas: number; total: number }
  | { tipo: "fim" }
  | { tipo: "erro"; erro: string };

const escopo = self as unknown as DedicatedWorkerGlobalScope;

escopo.onmessage = (ev: MessageEvent<PedidoAnalise>) => {
  const { inicial, acoes, cores, tempoMs } = ev.data;
  try {
    const turnos = turnosDaPartida(inicial, acoes)
      .map((turno, indice) => ({ turno, indice }))
      .filter(({ turno }) => cores.includes(turno.cor));
    escopo.postMessage({ tipo: "inicio", total: turnos.length } satisfies MensagemAnalise);
    turnos.forEach(({ turno, indice }, i) => {
      const jogada = analisarTurno(turno, indice, tempoMs);
      escopo.postMessage({ tipo: "jogada", jogada, feitas: i + 1, total: turnos.length } satisfies MensagemAnalise);
    });
    escopo.postMessage({ tipo: "fim" } satisfies MensagemAnalise);
  } catch (erro) {
    escopo.postMessage({ tipo: "erro", erro: erro instanceof Error ? erro.message : String(erro) } satisfies MensagemAnalise);
  }
};
