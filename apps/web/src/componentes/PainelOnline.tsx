import { useEffect, useState } from "react";
import { corOposta, REACOES, type Cor } from "@xadrez/engine";
import type { ControleOnline } from "../telas/Partida.tsx";

/** Tempo que uma reação fica na tela. */
const DURACAO_REACAO_MS = 4000;

/** Painel lateral da partida online: adversário, reações prontas e desistir. */
export function PainelOnline({ online, minhaCor, fim }: { online: ControleOnline; minhaCor: Cor; fim: boolean }) {
  const adversario = corOposta(minhaCor);
  const [agora, setAgora] = useState(() => Date.now());
  const ultima = online.reacoes.at(-1);

  // Some com as reações velhas.
  useEffect(() => {
    if (!ultima) return;
    setAgora(Date.now());
    const id = setTimeout(() => setAgora(Date.now()), DURACAO_REACAO_MS + 50);
    return () => clearTimeout(id);
  }, [ultima]);

  const recentes = online.reacoes.filter((r) => agora - r.id < DURACAO_REACAO_MS);

  return (
    <section className="painel-online" aria-label="Partida online">
      <p className={`status-adversario ${online.adversarioConectado ? "" : "desconectado"}`}>
        <span className="ponto" aria-hidden="true" />
        {online.adversarioConectado
          ? `${online.nomes[adversario]} está conectado`
          : `${online.nomes[adversario]} caiu — tem 60 s para voltar`}
      </p>

      <div className="balao-reacoes" aria-live="polite">
        {recentes.map((r) => (
          <span key={r.id} className={`balao ${r.meu ? "meu" : ""}`}>
            {r.meu ? "Você" : r.nome}: {r.reacao}
          </span>
        ))}
      </div>

      <div className="reacoes" role="group" aria-label="Reações">
        {REACOES.map((r) => (
          <button key={r} type="button" className="botao-reacao" onClick={() => online.aoReagir(r)}>
            {r}
          </button>
        ))}
      </div>

      {!fim && (
        <button
          type="button"
          className="botao-link"
          onClick={() => {
            if (window.confirm("Desistir desta partida? O adversário vence.")) online.aoDesistir();
          }}
        >
          Desistir
        </button>
      )}
    </section>
  );
}
