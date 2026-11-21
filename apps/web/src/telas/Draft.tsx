import { useState } from "react";
import {
  cartasDoDraft,
  escolhaDraftIA,
  rerolarOferta,
  sortearDraft,
  type CartasDoJogador,
  type Cor,
  type EscolhaDraft,
} from "@xadrez/engine";
import { CartaVisual } from "../componentes/CartaVisual.tsx";
import type { ModoPartida } from "../modo.ts";
import { NOME_COR } from "../textos.ts";

interface Props {
  modo: ModoPartida;
  aoTerminar(cartas: Record<Cor, CartasDoJogador>): void;
  aoSair(): void;
}

/**
 * Modo Draft: cada lado escolhe o próprio poder entre 3 e a desvantagem do ADVERSÁRIO entre 3.
 * Na partida local, um lado escolhe de cada vez (o outro não olha).
 * Contra a IA, ela escolhe em segredo.
 */
export function Draft({ modo, aoTerminar, aoSair }: Props) {
  const [ofertas, setOfertas] = useState(() => sortearDraft());
  // Cada lado tem um re-roll: troca as 6 opções por outras do mesmo peso.
  const [rerollUsado, setRerollUsado] = useState<Record<Cor, boolean>>({ brancas: false, pretas: false });
  // Ordem de quem escolhe na tela: contra a IA, só o humano.
  const ordem: Cor[] = modo.tipo === "ia" ? [modo.corHumano] : ["brancas", "pretas"];
  const [indice, setIndice] = useState(0);
  const [escolhas, setEscolhas] = useState<Partial<Record<Cor, EscolhaDraft>>>({});
  const [revelado, setRevelado] = useState(modo.tipo === "ia");
  const [poder, setPoder] = useState<string | null>(null);
  const [desvantagem, setDesvantagem] = useState<string | null>(null);

  const cor = ordem[indice]!;
  const oferta = ofertas[cor];

  function rerolar() {
    if (rerollUsado[cor]) return;
    const todas = new Set([...ofertas.brancas.poderes, ...ofertas.brancas.desvantagens, ...ofertas.pretas.poderes, ...ofertas.pretas.desvantagens]);
    setOfertas({ ...ofertas, [cor]: rerolarOferta(ofertas[cor], Math.random, undefined, false, todas) });
    setRerollUsado({ ...rerollUsado, [cor]: true });
    setPoder(null);
    setDesvantagem(null);
  }

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
    // Cada um fica com o próprio poder e a desvantagem que o outro escolheu.
    aoTerminar(cartasDoDraft(novas as Record<Cor, EscolhaDraft>));
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
            Escolha o seu poder e a desvantagem que o adversário vai ter. Ele recebeu opções com os mesmos pesos
            {modo.tipo === "ia" ? " e vai escolher a sua desvantagem em segredo." : " e escolhe a sua desvantagem."}
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

          <h2>Desvantagem para o adversário</h2>
          <div className="draft-opcoes" role="radiogroup" aria-label="Desvantagem para o adversário">
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
            <button
              type="button"
              className="botao botao-secundario"
              disabled={rerollUsado[cor]}
              onClick={rerolar}
              title="Troca as 6 opções por outras do mesmo peso (só uma vez)"
            >
              {rerollUsado[cor] ? "Re-roll usado" : "🎲 Re-roll (1×)"}
            </button>
            <button type="button" className="botao" disabled={!poder || !desvantagem} onClick={confirmar}>
              {indice + 1 < ordem.length ? "Confirmar e passar a vez" : "Confirmar e começar"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
