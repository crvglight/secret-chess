import { infoPoder, lancesAteComprar, resumoDaCarta, travaDaMao, type Cor, type Estado } from "@xadrez/engine";
import { CartaVisual } from "./CartaVisual.tsx";
import { NOME_COR } from "../textos.ts";

interface Props {
  estado: Estado;
  cor: Cor;
  nome: string;
  /** false = lado da IA: sem botões de ver cartas e de poder. */
  controlavel: boolean;
  cartasVisiveis: boolean;
  modoPoder: boolean;
  aoAlternarCartas(): void;
  aoUsarPoder(): void;
  aoCancelarPoder(): void;
  /** Modo Mão de cartas: jogar a carta deste índice da mão. */
  aoJogarCarta(indice: number): void;
  /** Online com relógio: tempo restante (ms) e se é o relógio que está correndo. */
  tempo?: number | null;
  relogioCorrendo?: boolean;
}

/** 4:05, ou 0:09.4 nos últimos 10 segundos. */
function formatarTempo(ms: number): string {
  if (ms < 10_000) return `0:0${(ms / 1000).toFixed(1)}`;
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PainelJogador({
  estado,
  cor,
  nome,
  controlavel,
  cartasVisiveis,
  modoPoder,
  tempo,
  relogioCorrendo,
  ...acoes
}: Props) {
  const daVez = estado.vez === cor && !estado.resultado;
  const poder = infoPoder(estado, cor);
  const cartas = estado.cartas[cor];
  const temAcao = poder.instrucao !== null;
  const mao = estado.mao;
  const podeJogarCarta = controlavel && !modoPoder && !!mao && travaDaMao(estado, cor) === null;

  let rodapePoder = resumoDaCarta(estado, cor, "poder") ?? (temAcao ? `Usos restantes: ${poder.usosRestantes}` : "Efeito permanente");
  if (mao && cartas.poder) rodapePoder = temAcao ? `Use nesta rodada (${poder.usosRestantes} uso)` : "Vale até a sua próxima vez";

  return (
    <section className={`painel ${daVez ? "painel-da-vez" : ""}`} aria-label={`Painel das ${NOME_COR[cor].toLowerCase()}`}>
      <header className="painel-topo">
        <span className={`bolinha bolinha-${cor}`} aria-hidden="true" />
        <strong>{nome}</strong>
        {daVez && <span className="selo-vez">{controlavel ? "Sua vez" : "Pensando…"}</span>}
        {tempo !== undefined && tempo !== null && (
          <span
            className={`relogio ${relogioCorrendo ? "correndo" : ""} ${tempo < 20_000 ? "pouco-tempo" : ""}`}
            aria-label={`Tempo: ${formatarTempo(tempo)}`}
          >
            {formatarTempo(tempo)}
          </span>
        )}
        {controlavel && !estado.resultado && (
          <button type="button" className="botao-link" onClick={acoes.aoAlternarCartas}>
            {cartasVisiveis ? "Esconder cartas" : "Ver minhas cartas"}
          </button>
        )}
      </header>

      <div className="painel-cartas">
        <CartaVisual
          cartaId={cartas.poder}
          virada={!cartasVisiveis}
          textoVazio={mao ? "Nenhuma carta em jogo" : undefined}
          rodape={rodapePoder}
        />
        <CartaVisual
          cartaId={cartas.desvantagem}
          virada={!cartasVisiveis}
          rodape={resumoDaCarta(estado, cor, "desvantagem") ?? undefined}
        />
      </div>

      {mao && (
        <div className="mao">
          <div className="mao-topo">
            <strong>Mão ({mao.mao[cor].length})</strong>
            <span className="dica">
              {mao.baralho[cor].length === 0
                ? "Baralho vazio"
                : `Próxima carta em ${lancesAteComprar(estado, cor)} lance(s)`}
            </span>
          </div>
          {mao.mao[cor].length === 0 ? (
            <p className="dica">Sem cartas na mão.</p>
          ) : (
            <div className="mao-cartas">
              {mao.mao[cor].map((id, i) => (
                <div key={`${id}-${i}`} className="mao-carta">
                  <CartaVisual cartaId={id} virada={!cartasVisiveis} />
                  {podeJogarCarta && cartasVisiveis && (
                    <button type="button" className="botao botao-poder botao-pequeno" onClick={() => acoes.aoJogarCarta(i)}>
                      Jogar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {daVez && controlavel && temAcao && (
        <div className="painel-poder">
          {modoPoder ? (
            <>
              <span className="instrucao">{poder.instrucao}</span>
              <button type="button" className="botao botao-secundario" onClick={acoes.aoCancelarPoder}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="botao botao-poder"
              disabled={!poder.disponivel}
              title={poder.motivo ?? undefined}
              onClick={acoes.aoUsarPoder}
            >
              Usar poder
            </button>
          )}
          {!poder.disponivel && !modoPoder && poder.motivo && <span className="dica">{poder.motivo}</span>}
        </div>
      )}
    </section>
  );
}
