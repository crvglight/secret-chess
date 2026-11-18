import { useMemo, useState } from "react";
import { escolhaDraftIA, sortearDraft, type CartasDoJogador, type Cor } from "@xadrez/engine";
import { CartaVisual } from "../componentes/CartaVisual.tsx";
import type { ModoPartida } from "../modo.ts";
import { NOME_COR } from "../textos.ts";

interface Props {
  modo: ModoPartida;
  aoTerminar(cartas: Record<Cor, CartasDoJogador>): void;
  aoSair(): void;
}

/**
 * Modo Draft: cada lado escolhe 1 poder e 1 desvantagem entre 3 de cada.
 * Na partida local, um lado escolhe de cada vez (o outro não olha).
 * Contra a IA, ela escolhe em segredo.
 */
export function Draft({ modo, aoTerminar, aoSair }: Props) {
  const ofertas = useMemo(() => sortearDraft(), []);
  // Ordem de quem escolhe na tela: contra a IA, só o humano.
  const ordem: Cor[] = modo.tipo === "ia" ? [modo.corHumano] : ["brancas", "pretas"];
  const [indice, setIndice] = useState(0);
  const [escolhas, setEscolhas] = useState<Partial<Record<Cor, CartasDoJogador>>>({});
  const [revelado, setRevelado] = useState(modo.tipo === "ia");
  const [poder, setPoder] = useState<string | null>(null);
  const [desvantagem, setDesvantagem] = useState<string | null>(null);

  const cor = ordem[indice]!;
  const oferta = ofertas[cor];

  function confirmar() {
    if (!poder || !desvantagem) return;
    const novas = { ...escolhas, [cor]: { poder, desvantagem } };
    if (indice + 1 < ordem.length) {
      setEscolhas(novas);
      setIndice(indice + 1);
      setPoder(null);
      setDesvantagem(null);
      setRevelado(false);
      return;
    }
    if (modo.tipo === "ia") {
      const corIA: Cor = modo.corHumano === "brancas" ? "pretas" : "brancas";
      novas[corIA] = escolhaDraftIA(ofertas[corIA], modo.nivel !== "facil");
    }
    aoTerminar(novas as Record<Cor, CartasDoJogador>);
  }

  return (
    <div className="tela-draft">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoSair}>
          ← Início
        </button>
        <span className="barra-titulo">Draft de cartas</span>
        <span />
      </header>

      {!revelado ? (
        <section className="draft-aviso">
          <h1>Vez das {NOME_COR[cor].toLowerCase()} escolherem</h1>
          <p className="subtitulo">
            Passe para quem joga com as {NOME_COR[cor].toLowerCase()}. O outro jogador não deve olhar.
          </p>
          <button type="button" className="botao" onClick={() => setRevelado(true)}>
            Mostrar minhas opções
          </button>
        </section>
      ) : (
        <section className="draft-escolha" aria-label={`Escolha das ${NOME_COR[cor].toLowerCase()}`}>
          <h1>
            {modo.tipo === "ia" ? "Escolha suas cartas" : `${NOME_COR[cor]}: escolha suas cartas`}
          </h1>
          <p className="subtitulo">
            Escolha 1 poder e 1 desvantagem. O adversário recebeu opções com os mesmos pesos
            {modo.tipo === "ia" ? " e vai escolher em segredo." : "."}
          </p>

          <h2>Poder</h2>
          <div className="draft-opcoes" role="radiogroup" aria-label="Poder">
            {oferta.poderes.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={poder === id}
                className={`draft-carta ${poder === id ? "escolhida" : ""}`}
                onClick={() => setPoder(id)}
              >
                <CartaVisual cartaId={id} />
              </button>
            ))}
          </div>

          <h2>Desvantagem</h2>
          <div className="draft-opcoes" role="radiogroup" aria-label="Desvantagem">
            {oferta.desvantagens.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={desvantagem === id}
                className={`draft-carta ${desvantagem === id ? "escolhida" : ""}`}
                onClick={() => setDesvantagem(id)}
              >
                <CartaVisual cartaId={id} />
              </button>
            ))}
          </div>

          <div className="acoes">
            <button type="button" className="botao" disabled={!poder || !desvantagem} onClick={confirmar}>
              {indice + 1 < ordem.length ? "Confirmar e passar a vez" : "Confirmar e começar"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
