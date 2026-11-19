import { useEffect, useState } from "react";
import { corOposta, REACOES, type Cor } from "@xadrez/engine";
import type { ControleOnline } from "../telas/Partida.tsx";

/** Tempo que uma reação fica na tela. */
const DURACAO_REACAO_MS = 4000;

/**
 * Painel lateral da partida online: adversário, reações prontas, desistir e
 * espectadores. Para quem só assiste: os dois jogadores e as reações deles.
 */
export function PainelOnline({ online, minhaCor, fim }: { online: ControleOnline; minhaCor: Cor; fim: boolean }) {
  const adversario = corOposta(minhaCor);
  const [agora, setAgora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);
  const ultima = online.reacoes.at(-1);

  // Some com as reações velhas.
  useEffect(() => {
    if (!ultima) return;
    setAgora(Date.now());
    const id = setTimeout(() => setAgora(Date.now()), DURACAO_REACAO_MS + 50);
    return () => clearTimeout(id);
  }, [ultima]);

  const recentes = online.reacoes.filter((r) => agora - r.id < DURACAO_REACAO_MS);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(online.linkAssistir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link para assistir:", online.linkAssistir);
    }
  }

  const status = (cor: Cor, texto: string) => (
    <p key={cor} className={`status-adversario ${online.conectados[cor] ? "" : "desconectado"}`}>
      <span className="ponto" aria-hidden="true" />
      {online.conectados[cor] ? texto : `${online.nomes[cor]} caiu — tem 60 s para voltar`}
    </p>
  );

  return (
    <section className="painel-online" aria-label="Partida online">
      {online.espectador ? (
        <>
          <p className="selo-espectador">👁 Você está assistindo</p>
          {(["brancas", "pretas"] as const).map((cor) =>
            status(cor, `${online.nomes[cor]} (${cor === "brancas" ? "brancas" : "pretas"})`),
          )}
        </>
      ) : (
        status(adversario, `${online.nomes[adversario]} está conectado`)
      )}

      <div className="balao-reacoes" aria-live="polite">
        {recentes.map((r) => (
          <span key={r.id} className={`balao ${r.meu ? "meu" : ""}`}>
            {r.meu ? "Você" : r.nome}: {r.reacao}
          </span>
        ))}
      </div>

      {!online.espectador && (
        <div className="reacoes" role="group" aria-label="Reações">
          {REACOES.map((r) => (
            <button key={r} type="button" className="botao-reacao" onClick={() => online.aoReagir(r)}>
              {r}
            </button>
          ))}
        </div>
      )}

      <p className="espectadores">
        👁 {online.espectadores === 0 ? "Ninguém assistindo" : online.espectadores === 1 ? "1 pessoa assistindo" : `${online.espectadores} pessoas assistindo`}
        <button type="button" className="botao-link" onClick={copiarLink}>
          {copiado ? "Link copiado!" : "Copiar link para assistir"}
        </button>
      </p>

      {!fim && !online.espectador && (
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
