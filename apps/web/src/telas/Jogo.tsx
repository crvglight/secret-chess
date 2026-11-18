import { useState } from "react";
import type { CartasDoJogador, Cor } from "@xadrez/engine";
import type { ModoPartida } from "../modo.ts";
import { Draft } from "./Draft.tsx";
import { Partida } from "./Partida.tsx";

/** Prepara a partida conforme as regras (ex.: o Draft escolhe as cartas antes) e depois joga. */
export function Jogo({ modo, aoSair }: { modo: ModoPartida; aoSair(): void }) {
  const [rodada, setRodada] = useState(0);
  const [cartas, setCartas] = useState<Record<Cor, CartasDoJogador> | null>(null);

  if (modo.regras === "draft" && !cartas) {
    return <Draft key={rodada} modo={modo} aoTerminar={setCartas} aoSair={aoSair} />;
  }

  const revancheComDraft = () => {
    setCartas(null);
    setRodada((r) => r + 1);
  };
  return (
    <Partida
      key={rodada}
      modo={modo}
      cartas={cartas ?? undefined}
      aoSair={aoSair}
      aoRevanche={modo.regras === "draft" ? revancheComDraft : undefined}
    />
  );
}
