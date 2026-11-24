import { useMemo, useState } from "react";
import { obterCarta } from "@xadrez/engine";
import { CartaVisual } from "../componentes/CartaVisual.tsx";
import { AnalisePartida } from "./AnalisePartida.tsx";
import { Tabuleiro } from "../componentes/Tabuleiro.tsx";
import { NOME_NIVEL, NOME_REGRAS } from "../modo.ts";
import {
  alternarAmigo,
  CONQUISTAS,
  jogadoresEnfrentados,
  lerProgresso,
  reconstruirPartida,
  textoVencedor,
  type PartidaSalva,
  type Progresso as DadosProgresso,
} from "../progresso.ts";
import { explicacaoResultado, NOME_COR } from "../textos.ts";

type Aba = "conquistas" | "historico" | "jogadores" | "estatisticas";

const ABAS: { id: Aba; nome: string }[] = [
  { id: "conquistas", nome: "Conquistas" },
  { id: "historico", nome: "Histórico" },
  { id: "jogadores", nome: "Jogadores" },
  { id: "estatisticas", nome: "Estatísticas" },
];

const SEM_ACAO = () => {};

export function Progresso({ aoVoltar }: { aoVoltar(): void }) {
  const [progresso, setProgresso] = useState(lerProgresso);
  const [aba, setAba] = useState<Aba>("conquistas");
  /** Histórico só das partidas contra este jogador (null = todas). */
  const [filtro, setFiltro] = useState<string | null>(null);
  const [revendo, setRevendo] = useState<PartidaSalva | null>(null);
  const [analisando, setAnalisando] = useState<PartidaSalva | null>(null);
  const paraAnalise = useMemo(
    () =>
      analisando && {
        inicial: analisando.inicial,
        acoes: analisando.acoes,
        cores: analisando.modo.tipo === "local" ? (["brancas", "pretas"] as const).slice() : [analisando.modo.corHumano],
        orientacao: analisando.modo.tipo === "local" ? ("brancas" as const) : analisando.modo.corHumano,
        titulo: descricaoModo(analisando),
      },
    [analisando],
  );

  if (paraAnalise) return <AnalisePartida partida={paraAnalise} aoVoltar={() => setAnalisando(null)} />;
  if (revendo) return <Replay partida={revendo} aoVoltar={() => setRevendo(null)} aoAnalisar={() => setAnalisando(revendo)} />;

  return (
    <div className="tela-progresso">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoVoltar}>
          ← Início
        </button>
        <span className="barra-titulo">Progresso</span>
        <span />
      </header>

      <nav className="abas" role="tablist" aria-label="Seções do progresso">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            className={aba === a.id ? "ativa" : ""}
            onClick={() => setAba(a.id)}
          >
            {a.nome}
          </button>
        ))}
      </nav>

      <section className="conteudo-aba" role="tabpanel">
        {aba === "conquistas" && <Conquistas progresso={progresso} />}
        {aba === "historico" && (
          <Historico
            progresso={progresso}
            filtro={filtro}
            aoLimparFiltro={() => setFiltro(null)}
            aoRever={setRevendo}
            aoAnalisar={setAnalisando}
          />
        )}
        {aba === "jogadores" && (
          <Jogadores
            progresso={progresso}
            aoAlternarAmigo={(nome) => setProgresso(alternarAmigo(nome))}
            aoVerPartidas={(nome) => {
              setFiltro(nome);
              setAba("historico");
            }}
          />
        )}
        {aba === "estatisticas" && <Estatisticas progresso={progresso} />}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Conquistas({ progresso }: { progresso: DadosProgresso }) {
  const feitas = CONQUISTAS.filter((c) => progresso.conquistas[c.id]).length;
  return (
    <>
      <p className="subtitulo">
        {feitas} de {CONQUISTAS.length} conquistas. Elas contam nas partidas contra a IA e online.
      </p>
      <ul className="lista-conquistas">
        {CONQUISTAS.map((c) => {
          const quando = progresso.conquistas[c.id];
          return (
            <li key={c.id} className={quando ? "feita" : ""}>
              <span className="trofeu" aria-hidden="true">
                {quando ? "🏆" : "🔒"}
              </span>
              <span>
                <strong>{c.nome}</strong>
                <span className="dica">
                  {c.descricao}
                  {quando && ` Conquistada em ${new Date(quando).toLocaleDateString("pt-BR")}.`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function descricaoModo(p: PartidaSalva): string {
  const quem =
    p.modo.tipo === "ia" ? `contra a IA (${NOME_NIVEL[p.modo.nivel].toLowerCase()})` : p.modo.tipo === "online" ? "online" : "local";
  const regras = p.modo.regras !== "padrao" ? ` · ${NOME_REGRAS[p.modo.regras]}` : "";
  const casas = (p.modo.casasEspeciais ? " · Casas especiais" : "") + (p.modo.airdrops ? " · Airdrops" : "");
  return `Partida ${quem}${regras}${casas}`;
}

function Historico({
  progresso,
  filtro,
  aoLimparFiltro,
  aoRever,
  aoAnalisar,
}: {
  progresso: DadosProgresso;
  filtro: string | null;
  aoLimparFiltro(): void;
  aoRever(p: PartidaSalva): void;
  aoAnalisar(p: PartidaSalva): void;
}) {
  if (progresso.partidas.length === 0) {
    return <p className="subtitulo">Nenhuma partida terminada ainda. Jogue uma e ela aparece aqui.</p>;
  }
  const partidas = filtro ? progresso.partidas.filter((p) => p.modo.tipo === "online" && p.adversario === filtro) : progresso.partidas;
  return (
    <>
    {filtro && (
      <p className="filtro-historico">
        Partidas contra <strong>{filtro}</strong>{" "}
        <button type="button" className="botao-link" onClick={aoLimparFiltro}>
          ver todas
        </button>
      </p>
    )}
    <ul className="lista-partidas">
      {partidas.map((p) => (
        <li key={p.id}>
          <span>
            <strong>{textoVencedor(p)}</strong> · {descricaoModo(p)}
            {p.adversario && p.modo.tipo === "online" && <> · contra <strong>{p.adversario}</strong></>}
            <span className="dica">
              {new Date(p.data).toLocaleString("pt-BR")} · {Math.ceil(p.meioLances / 2)} lances
            </span>
          </span>
          <span className="botoes-partida">
            <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => aoRever(p)}>
              Rever
            </button>
            <button type="button" className="botao botao-pequeno" onClick={() => aoAnalisar(p)}>
              Analisar
            </button>
          </span>
        </li>
      ))}
    </ul>
    </>
  );
}

function Estatisticas({ progresso }: { progresso: DadosProgresso }) {
  const linhas = Object.entries(progresso.estatisticas)
    .filter(([id]) => {
      try {
        obterCarta(id);
        return true;
      } catch {
        return false; // carta criada que foi apagada
      }
    })
    .map(([id, e]) => ({ carta: obterCarta(id), ...e, taxa: e.vitorias / e.jogos }))
    .sort((a, b) => b.jogos - a.jogos || b.taxa - a.taxa);

  if (linhas.length === 0) return <p className="subtitulo">As estatísticas aparecem depois da primeira partida.</p>;
  return (
    <>
      <p className="subtitulo">
        Taxa de vitória de quem tinha cada carta (partidas locais e contra a IA). Poder com taxa muito alta ou
        desvantagem com taxa muito baixa pode pedir um peso maior.
      </p>
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Carta</th>
              <th>Tipo</th>
              <th>Peso</th>
              <th>Partidas</th>
              <th>Vitórias</th>
              <th>Taxa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.carta.id}>
                <td>{l.carta.nome}</td>
                <td>{l.carta.tipo === "poder" ? "Poder" : "Desvantagem"}</td>
                <td>{l.carta.peso}</td>
                <td>{l.jogos}</td>
                <td>{l.vitorias}</td>
                <td>
                  {Math.round(l.taxa * 100)}%{l.jogos < 5 && <span className="dica"> (poucos dados)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

function Replay({ partida, aoVoltar, aoAnalisar }: { partida: PartidaSalva; aoVoltar(): void; aoAnalisar(): void }) {
  const estados = useMemo(() => reconstruirPartida(partida), [partida]);
  const [passo, setPasso] = useState(estados.length - 1);
  const estado = estados[passo]!;
  const final = estados[estados.length - 1]!;
  const orientacao = partida.modo.tipo === "ia" ? partida.modo.corHumano : "brancas";

  return (
    <div className="tela-progresso">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoVoltar}>
          ← Histórico
        </button>
        <span className="barra-titulo">{descricaoModo(partida)}</span>
        <span className="barra-acoes">
          <button type="button" className="botao botao-pequeno" onClick={aoAnalisar}>
            🔍 Analisar
          </button>
        </span>
      </header>

      <div className="replay">
        <div className="replay-tabuleiro">
          <div className="area-tabuleiro">
            <Tabuleiro
              estado={estado}
              orientacao={orientacao}
              selecionada={null}
              destinos={[]}
              alvosPoder={null}
              destaques={[]}
              podeArrastar={() => false}
              aoTocarCasa={SEM_ACAO}
              aoSoltar={SEM_ACAO}
            />
          </div>
          <div className="controles-replay">
            <button type="button" className="botao-icone" aria-label="Início" onClick={() => setPasso(0)}>
              ⏮
            </button>
            <button type="button" className="botao-icone" aria-label="Voltar" onClick={() => setPasso(Math.max(0, passo - 1))}>
              ◀
            </button>
            <input
              type="range"
              min={0}
              max={estados.length - 1}
              value={passo}
              aria-label="Momento da partida"
              onChange={(e) => setPasso(Number(e.target.value))}
            />
            <button
              type="button"
              className="botao-icone"
              aria-label="Avançar"
              onClick={() => setPasso(Math.min(estados.length - 1, passo + 1))}
            >
              ▶
            </button>
            <button type="button" className="botao-icone" aria-label="Fim" onClick={() => setPasso(estados.length - 1)}>
              ⏭
            </button>
          </div>
          <p className="dica">
            Passo {passo} de {estados.length - 1}
            {final.resultado && ` · ${explicacaoResultado(final)}`}
          </p>
        </div>

        <aside className="lateral replay-lateral">
          <h2>Cartas</h2>
          {(["brancas", "pretas"] as const).map((cor) => (
            <div key={cor} className="replay-cartas">
              <strong>{NOME_COR[cor]}</strong>
              <div className="painel-cartas">
                <CartaVisual cartaId={final.cartas[cor].poder} textoVazio={final.mao ? "Cartas da mão" : undefined} />
                <CartaVisual cartaId={final.cartas[cor].desvantagem} />
              </div>
            </div>
          ))}
          <h2>Lances</h2>
          <ol className="historico">
            {final.historico.map((r, i) => (
              <li key={i} className={i < estado.historico.length ? "" : "futuro"}>
                <span className={`bolinha bolinha-${r.cor}`} aria-hidden="true" />
                {r.texto}
              </li>
            ))}
          </ol>
          {final.eventos.length > 0 && (
            <>
              <h2>Momentos das cartas</h2>
              <ul className="momentos">
                {final.eventos.map((e, i) => (
                  <li key={i}>
                    {NOME_COR[e.cor]}: {e.texto}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Adversários online que você já enfrentou, com o placar; dá para marcar amigos. */
function Jogadores({
  progresso,
  aoAlternarAmigo,
  aoVerPartidas,
}: {
  progresso: DadosProgresso;
  aoAlternarAmigo(nome: string): void;
  aoVerPartidas(nome: string): void;
}) {
  const jogadores = jogadoresEnfrentados(progresso);
  if (jogadores.length === 0) {
    return <p className="subtitulo">Você ainda não terminou nenhuma partida online. Os adversários aparecem aqui.</p>;
  }
  return (
    <>
      <p className="subtitulo">Quem você já enfrentou online. Marque ⭐ para deixar seus amigos no topo da lista.</p>
      <ul className="lista-jogadores">
        {jogadores.map((j) => (
          <li key={j.nome} className={j.amigo ? "amigo" : ""}>
            <button
              type="button"
              className="botao-estrela"
              aria-pressed={j.amigo}
              aria-label={j.amigo ? `Tirar ${j.nome} dos amigos` : `Marcar ${j.nome} como amigo`}
              onClick={() => aoAlternarAmigo(j.nome)}
            >
              {j.amigo ? "⭐" : "☆"}
            </button>
            <span className="jogador-info">
              <strong>{j.nome}</strong>
              <span className="dica">
                {j.partidas} partida(s) · {j.vitorias}V {j.derrotas}D {j.empates}E
                {j.ultima > 0 && ` · última em ${new Date(j.ultima).toLocaleDateString("pt-BR")}`}
              </span>
            </span>
            {j.partidas > 0 && (
              <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => aoVerPartidas(j.nome)}>
                Ver partidas
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
