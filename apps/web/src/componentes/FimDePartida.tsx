import { CORES, obterCarta, obterEvento, type Cor, type Estado, type SlotCarta } from "@xadrez/engine";
import { CartaVisual } from "./CartaVisual.tsx";
import type { Novidades } from "../progresso.ts";
import { explicacaoResultado, NOME_COR, numeroDoLance, tituloResultado } from "../textos.ts";

interface Props {
  estado: Estado;
  /** Sem isso (quem só assiste), não há botão de revanche. */
  aoRevanche?(): void;
  aoNovaPartida(): void;
  aoFechar(): void;
  /** Abre a análise da partida (erros, acertos e o uso das cartas). */
  aoAnalisar?(): void;
  /** Online: larga a vaga e passa a assistir à sala. */
  aoVirarEspectador?(): void;
  /** Conquistas desta partida. */
  novidades?: Novidades | null;
  /** Online: quem já pediu revanche. */
  revanche?: { pedida: Record<Cor, boolean>; minhaCor: Cor };
}

const SLOTS: SlotCarta[] = ["poder", "desvantagem"];

/** Cartas a revelar de um lado. No modo Mão de cartas: a desvantagem e os poderes que ele jogou. */
function cartasDoLado(estado: Estado, cor: Cor): (string | null)[] {
  if (!estado.mao) return SLOTS.map((slot) => estado.cartas[cor][slot]);
  const jogadas = estado.eventos
    .filter((e) => e.cor === cor && obterCarta(e.cartaId).tipo === "poder")
    .map((e) => e.cartaId);
  return [estado.cartas[cor].desvantagem, ...new Set(jogadas)];
}

export function FimDePartida({ estado, aoRevanche, aoNovaPartida, aoFechar, aoAnalisar, aoVirarEspectador, novidades, revanche }: Props) {
  const pediu = revanche?.pedida[revanche.minhaCor];
  const adversarioPediu = revanche && revanche.pedida[revanche.minhaCor === "brancas" ? "pretas" : "brancas"];
  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-fim">
      <div className="janela janela-fim">
        <h2 id="titulo-fim">{tituloResultado(estado)}</h2>
        <p className="subtitulo">{explicacaoResultado(estado)}</p>

        {novidades && novidades.conquistas.length > 0 && (
          <div className="novidades">
            {novidades.conquistas.map((c) => (
              <p key={c.id}>
                🏆 Conquista: <strong>{c.nome}</strong> <span className="dica">{c.descricao}</span>
              </p>
            ))}
          </div>
        )}

        <div className="revelacao">
          {CORES.map((cor) => (
            <div key={cor} className="revelacao-lado">
              <h3>
                <span className={`bolinha bolinha-${cor}`} aria-hidden="true" /> {NOME_COR[cor]}
              </h3>
              {estado.mao && cartasDoLado(estado, cor).length === 1 && (
                <p className="dica">Não jogou nenhuma carta da mão.</p>
              )}
              {cartasDoLado(estado, cor).map((id, indice) => {
                const eventos = estado.eventos.filter((e) => e.cor === cor && e.cartaId === id);
                return (
                  <div key={`${id}-${indice}`} className="revelacao-carta">
                    <CartaVisual cartaId={id} />
                    <ul className="momentos">
                      {eventos.length === 0 ? (
                        <li className="dica">Não pesou diretamente.</li>
                      ) : (
                        eventos.map((e, i) => (
                          <li key={i}>
                            <span className="momento-lance">Lance {numeroDoLance(e.meioLance + 1)}</span> {e.texto}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {estado.caos && estado.caos.registro.length > 0 && (
          <section className="fim-eventos">
            <h3>Eventos da partida</h3>
            <ul className="momentos">
              {estado.caos.registro.map((r, i) => (
                <li key={i}>
                  <span className="momento-lance">Lance {numeroDoLance(r.meioLance)}</span> {obterEvento(r.id).nome}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="acoes">
          {aoRevanche && (
            <button type="button" className="botao" onClick={aoRevanche} disabled={pediu}>
              {pediu ? "Esperando o adversário…" : adversarioPediu ? "Aceitar revanche" : "Revanche"}
            </button>
          )}
          {aoAnalisar && (
            <button type="button" className="botao botao-secundario" onClick={aoAnalisar}>
              🔍 Analisar partida
            </button>
          )}
          {aoVirarEspectador && (
            <button
              type="button"
              className="botao botao-secundario"
              onClick={aoVirarEspectador}
              title="Libera a sua vaga para outra pessoa jogar e você passa a assistir à sala"
            >
              👁 Virar espectador
            </button>
          )}
          <button type="button" className="botao botao-secundario" onClick={aoNovaPartida}>
            Nova partida
          </button>
          <button type="button" className="botao-link" onClick={aoFechar}>
            Ver o tabuleiro
          </button>
        </div>
      </div>
    </div>
  );
}
