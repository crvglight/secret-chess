import { useEffect, useMemo, useState } from "react";
import {
  momentosChave,
  NOME_CLASSIFICACAO,
  ORDEM_CLASSIFICACAO,
  resumirLado,
  textoNota,
  type AcaoPartida,
  type Classificacao,
  type Cor,
  type Estado,
  type JogadaAnalisada,
  type ResumoLado,
  type TipoComentario,
} from "@xadrez/engine";
import { CartaVisual } from "../componentes/CartaVisual.tsx";
import { Tabuleiro } from "../componentes/Tabuleiro.tsx";
import type { MensagemAnalise, PedidoAnalise } from "../ia/analise.worker.ts";
import { reconstruirPartida } from "../progresso.ts";
import { explicacaoResultado, NOME_COR } from "../textos.ts";

/** Tempo de busca por posição (a análise inteira leva ~1 s por jogada). */
const TEMPO_POR_POSICAO_MS = 450;

const SIMBOLO: Record<Classificacao, string> = {
  brilhante: "!!",
  melhor: "★",
  bom: "✓",
  imprecisao: "?!",
  erro: "?",
  "erro-grave": "??",
};

const ICONE_COMENTARIO: Record<TipoComentario, string> = {
  melhor: "➜",
  mate: "♚",
  poder: "⚡",
  oportunidade: "💡",
  desvantagem: "⛓",
  surpresa: "🎭",
  "carta-propria": "🃏",
};

const SEM_ACAO = () => {};

export interface PartidaParaAnalisar {
  inicial: Estado;
  acoes: AcaoPartida[];
  /** Lados analisados (contra a IA ou online, só o seu). */
  cores: Cor[];
  /** Quem joga embaixo no tabuleiro. */
  orientacao: Cor;
  titulo: string;
}

export function AnalisePartida({ partida, aoVoltar }: { partida: PartidaParaAnalisar; aoVoltar(): void }) {
  const estados = useMemo(() => reconstruirPartida(partida), [partida]);
  const final = estados[estados.length - 1]!;
  const [jogadas, setJogadas] = useState<JogadaAnalisada[]>([]);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [orientacao, setOrientacao] = useState<Cor>(partida.orientacao);

  // Roda a análise num Web Worker; as jogadas vão chegando uma a uma.
  useEffect(() => {
    const worker = new Worker(new URL("../ia/analise.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<MensagemAnalise>) => {
      const m = ev.data;
      if (m.tipo === "inicio") setProgresso({ feitas: 0, total: m.total });
      else if (m.tipo === "jogada") {
        setJogadas((js) => [...js, m.jogada]);
        setProgresso({ feitas: m.feitas, total: m.total });
      } else if (m.tipo === "erro") setErro(m.erro);
    };
    const pedido: PedidoAnalise = {
      inicial: partida.inicial,
      acoes: partida.acoes,
      cores: partida.cores,
      tempoMs: TEMPO_POR_POSICAO_MS,
    };
    worker.postMessage(pedido);
    return () => worker.terminate();
  }, [partida]);

  const terminou = progresso !== null && progresso.feitas === progresso.total;
  const atual = jogadas.find((j) => j.indice === selecionada) ?? null;
  const estado = atual ? estados[atual.passoDepois]! : final;
  const resumos = partida.cores.map((cor) => ({ cor, resumo: resumirLado(jogadas, cor) }));
  const chave = terminou ? momentosChave(jogadas) : [];

  const posicao = atual ? jogadas.indexOf(atual) : -1;
  const ir = (i: number) => {
    const j = jogadas[Math.max(0, Math.min(jogadas.length - 1, i))];
    if (j) setSelecionada(j.indice);
  };
  const proximoErro = () => {
    const j = jogadas.slice(posicao + 1).find((x) => x.perda > 50) ?? jogadas.find((x) => x.perda > 50);
    if (j) setSelecionada(j.indice);
  };

  // Setas: verde para a melhor jogada, quando não foi a feita.
  // Antes da jogada: laranja para o lance feito, verde para o melhor.
  const setas = atual && !atual.jogouAMelhor ? [{ de: atual.melhor.de, para: atual.melhor.para }] : [];
  const feito = atual ? estados[atual.passoDepois]?.historico.at(-1)?.lance : undefined;
  const setasFixas = atual && !atual.jogouAMelhor && feito ? [{ de: feito.de, para: feito.para }] : [];
  const estadoTabuleiro = atual && !atual.jogouAMelhor ? estados[atual.passoAntes]! : estado;

  return (
    <div className="tela-progresso tela-analise">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoVoltar}>
          ← Voltar
        </button>
        <span className="barra-titulo">Análise · {partida.titulo}</span>
        <span className="barra-acoes">
          <button type="button" className="botao-link" onClick={() => setOrientacao((o) => (o === "brancas" ? "pretas" : "brancas"))}>
            Girar tabuleiro
          </button>
        </span>
      </header>

      {!terminou && !erro && (
        <div className="progresso-analise" role="status" aria-live="polite">
          <span>
            Analisando… {progresso ? `${progresso.feitas} de ${progresso.total} jogadas` : "preparando"}
          </span>
          <div className="barra-progresso">
            <div style={{ width: `${progresso && progresso.total ? (100 * progresso.feitas) / progresso.total : 0}%` }} />
          </div>
        </div>
      )}
      {erro && <p className="aviso">A análise parou: {erro}</p>}

      <section className="resumos-analise">
        {resumos.map(({ cor, resumo }) => (
          <ResumoDoLado key={cor} cor={cor} resumo={resumo} final={final} />
        ))}
      </section>

      <Grafico jogadas={jogadas} selecionada={selecionada} aoEscolher={setSelecionada} />

      <div className="replay">
        <div className="replay-tabuleiro">
          <div className="area-tabuleiro">
            <Tabuleiro
              estado={estadoTabuleiro}
              orientacao={orientacao}
              selecionada={null}
              destinos={[]}
              alvosPoder={null}
              destaques={[]}
              setasAnalise={setas}
              setasFixas={setasFixas}
              podeArrastar={() => false}
              aoTocarCasa={SEM_ACAO}
              aoSoltar={SEM_ACAO}
            />
          </div>
          <div className="controles-replay">
            <button type="button" className="botao-icone" aria-label="Primeira jogada" onClick={() => ir(0)}>
              ⏮
            </button>
            <button type="button" className="botao-icone" aria-label="Jogada anterior" onClick={() => ir(posicao - 1)}>
              ◀
            </button>
            <button type="button" className="botao-icone" aria-label="Próxima jogada" onClick={() => ir(posicao + 1)}>
              ▶
            </button>
            <button type="button" className="botao botao-secundario botao-pequeno" onClick={proximoErro}>
              Próximo erro
            </button>
            <button type="button" className="botao-link" onClick={() => setSelecionada(null)}>
              Posição final
            </button>
          </div>
          {atual ? (
            <Detalhe jogada={atual} />
          ) : (
            <p className="dica">
              {final.resultado ? explicacaoResultado(final) : ""} Escolha uma jogada na lista ou no gráfico para ver a
              análise dela.
            </p>
          )}
        </div>

        <aside className="lateral replay-lateral">
          {chave.length > 0 && (
            <>
              <h2>Momentos-chave</h2>
              <ul className="momentos-chave">
                {chave.map((j) => (
                  <li key={j.indice}>
                    <button type="button" className="botao-link" onClick={() => setSelecionada(j.indice)}>
                      {j.numero}. {j.texto}
                    </button>{" "}
                    <Selo classificacao={j.classificacao} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2>Jogadas</h2>
          <ol className="lista-analise">
            {jogadas.map((j) => (
              <li key={j.indice}>
                <button
                  type="button"
                  className={`item-analise ${j.indice === selecionada ? "ativa" : ""}`}
                  onClick={() => setSelecionada(j.indice)}
                >
                  <span className={`bolinha bolinha-${j.cor}`} aria-hidden="true" />
                  <span className="item-texto">
                    {j.numero}. {j.texto}
                  </span>
                  {j.comentarios.some((c) => c.tipo === "surpresa") && <span title="Carta do adversário">🎭</span>}
                  {j.comentarios.some((c) => c.tipo === "oportunidade") && <span title="Momento para o poder">💡</span>}
                  <Selo classificacao={j.classificacao} curto />
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function Selo({ classificacao, curto = false }: { classificacao: Classificacao; curto?: boolean }) {
  return (
    <span className={`selo-analise selo-${classificacao}`} title={NOME_CLASSIFICACAO[classificacao]}>
      {SIMBOLO[classificacao]}
      {!curto && ` ${NOME_CLASSIFICACAO[classificacao]}`}
    </span>
  );
}

function Detalhe({ jogada: j }: { jogada: JogadaAnalisada }) {
  return (
    <section className={`detalhe-analise borda-${j.classificacao}`} aria-live="polite">
      <h3>
        {j.numero}. {j.texto} <Selo classificacao={j.classificacao} />
      </h3>
      <p className="dica">
        {NOME_COR[j.cor]} · avaliação {textoNota(j.notaJogada)}
        {!j.jogouAMelhor && ` (melhor: ${j.melhor.texto}, ${textoNota(j.notaMelhor)})`} · precisão {Math.round(j.precisao)}%
      </p>
      {j.comentarios.length === 0 ? (
        <p>{j.jogouAMelhor ? "Lance certo para a posição." : "Lance razoável."}</p>
      ) : (
        <ul className="comentarios-analise">
          {j.comentarios.map((c, i) => (
            <li key={i} className={`comentario-${c.tipo}`}>
              <span aria-hidden="true">{ICONE_COMENTARIO[c.tipo]}</span> {c.texto}
            </li>
          ))}
        </ul>
      )}
      {!j.jogouAMelhor && <p className="dica">Posição antes da jogada: seta laranja = o que foi jogado, seta verde = a melhor.</p>}
    </section>
  );
}

function ResumoDoLado({ cor, resumo, final }: { cor: Cor; resumo: ResumoLado | null; final: Estado }) {
  const poder = final.cartas[cor].poder;
  const desvantagem = final.cartas[cor].desvantagem;
  return (
    <div className="resumo-lado">
      <div className="resumo-topo">
        <strong>{NOME_COR[cor]}</strong>
        <span className="precisao">{resumo ? `${Math.round(resumo.precisao)}%` : "—"}</span>
        <span className="dica">precisão</span>
      </div>
      {resumo && (
        <>
          <ul className="contagem-analise">
            {ORDEM_CLASSIFICACAO.map((c) => (
              <li key={c}>
                <Selo classificacao={c} curto /> {NOME_CLASSIFICACAO[c]} <strong>{resumo.contagem[c]}</strong>
              </li>
            ))}
          </ul>
          <ul className="cartas-analise">
            <li>
              ⚡ Poder usado {resumo.poder.usos}× ({resumo.poder.bons} bem, {resumo.poder.ruins} mal)
              {resumo.poder.oportunidadesPerdidas > 0 && ` · 💡 ${resumo.poder.oportunidadesPerdidas} momento(s) perdido(s)`}
            </li>
            {desvantagem && <li>⛓ A desvantagem pesou em {resumo.desvantagemPesou} jogada(s)</li>}
            {resumo.surpresas > 0 && <li>🎭 Cartas do adversário surpreenderam {resumo.surpresas}×</li>}
          </ul>
        </>
      )}
      <div className="painel-cartas">
        <CartaVisual cartaId={poder} textoVazio={final.mao ? "Cartas da mão" : undefined} />
        <CartaVisual cartaId={desvantagem} />
      </div>
    </div>
  );
}

/** Gráfico da avaliação (do ponto de vista das brancas) ao longo das jogadas analisadas. */
function Grafico({
  jogadas,
  selecionada,
  aoEscolher,
}: {
  jogadas: JogadaAnalisada[];
  selecionada: number | null;
  aoEscolher(indice: number): void;
}) {
  if (jogadas.length < 2) return null;
  const L = 600;
  const A = 90;
  const ultimo = Math.max(...jogadas.map((j) => j.indice), 1);
  // Comprime as notas grandes (mate = topo/fundo).
  const y = (nota: number) => A / 2 - (A / 2 - 4) * Math.tanh(nota / 500);
  const x = (indice: number) => 6 + ((L - 12) * indice) / ultimo;
  const pontos = jogadas.map((j) => `${x(j.indice)},${y(j.avaliacaoBrancas)}`).join(" ");
  return (
    <figure className="grafico-analise">
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Avaliação ao longo da partida (acima = brancas melhor)">
        <rect x="0" y="0" width={L} height={A / 2} className="grafico-brancas" />
        <rect x="0" y={A / 2} width={L} height={A / 2} className="grafico-pretas" />
        <polyline points={pontos} className="grafico-linha" />
        {jogadas.map((j) => (
          <circle
            key={j.indice}
            cx={x(j.indice)}
            cy={y(j.avaliacaoBrancas)}
            r={j.indice === selecionada ? 6 : j.perda > 50 || j.classificacao === "brilhante" ? 4.5 : 2.5}
            className={`ponto-${j.classificacao} ${j.indice === selecionada ? "ponto-ativo" : ""}`}
            onClick={() => aoEscolher(j.indice)}
          >
            <title>
              {j.numero}. {j.texto} — {NOME_CLASSIFICACAO[j.classificacao]}
            </title>
          </circle>
        ))}
      </svg>
      <figcaption className="dica">Avaliação ao longo da partida (acima do meio = melhor para as brancas).</figcaption>
    </figure>
  );
}
