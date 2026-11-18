// Janela de análise ao vivo: abre com Alt+A na aba do jogo e pode ficar em outro monitor.
// Só existe no modo de desenvolvimento (pnpm dev); o build publicado não inclui este arquivo.
import { useEffect, useState } from "react";
import { corOposta, type Cor } from "@xadrez/engine";
import { Tabuleiro } from "../componentes/Tabuleiro.tsx";
import { NOME_COR } from "../textos.ts";
import { NOME_CANAL, type DadosPartida, type MensagemCanal } from "./canal.ts";
import type { LinhaAnalise, RespostaAnalise } from "./analise.worker.ts";

const VITORIA = 900_000;

/** +1.25 = vantagem de 1 peão e 1/4 para quem joga. */
function formatarNota(v: number): string {
  if (v > VITORIA) return "Vence";
  if (v < -VITORIA) return "Perde";
  const peoes = v / 100;
  return `${peoes > 0 ? "+" : ""}${peoes.toFixed(2)}`;
}

/** Quanto da barra fica para as brancas (0 a 100), a partir da nota de quem joga. */
function parteDasBrancas(nota: number, vez: Cor): number {
  const brancas = vez === "brancas" ? nota : -nota;
  return 50 + 50 * Math.tanh(brancas / 600);
}

interface Resultado {
  profundidade: number;
  tempoMs: number;
  lances: LinhaAnalise[];
}

const SEM_ACAO = () => {};

export default function JanelaAnalise() {
  const [dados, setDados] = useState<DadosPartida | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [status, setStatus] = useState<"esperando" | "analisando" | "pronto" | "erro">("esperando");
  const [erro, setErro] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);

  // Cronômetro: há quanto tempo a análise desta posição está rodando.
  useEffect(() => {
    if (status !== "analisando") return;
    const inicio = Date.now();
    setSegundos(0);
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status, dados?.estado]);

  useEffect(() => {
    document.title = "Análise ao vivo · Secret Chess";
    const canal = new BroadcastChannel(NOME_CANAL);
    canal.onmessage = (ev: MessageEvent<MensagemCanal>) => {
      if (ev.data.tipo === "estado") setDados({ estado: ev.data.estado, orientacao: ev.data.orientacao });
    };
    canal.postMessage({ tipo: "pedir" } satisfies MensagemCanal);
    return () => canal.close();
  }, []);

  // Uma análise nova (num worker novo) a cada posição; a anterior é encerrada.
  const estado = dados?.estado;
  useEffect(() => {
    if (!estado) return;
    setResultado(null);
    setErro(null);
    if (estado.resultado) {
      setStatus("pronto");
      return;
    }
    setStatus("analisando");
    const worker = new Worker(new URL("./analise.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<RespostaAnalise>) => {
      const r = ev.data;
      if (r.tipo === "parcial") setResultado(r);
      if (r.tipo === "fim") setStatus("pronto");
      if (r.tipo === "erro") {
        setErro(r.erro);
        setStatus("erro");
      }
    };
    worker.postMessage(estado);
    return () => worker.terminate();
  }, [estado]);

  if (!dados || !estado) {
    return (
      <main className="tela-analise tela-analise-vazia">
        <h1>Análise ao vivo</h1>
        <p className="dica">Abra uma partida na aba do jogo. Esta janela acompanha a posição sozinha.</p>
      </main>
    );
  }

  const melhor = resultado?.lances[0];
  const setas = resultado?.lances.slice(0, 3).map(({ de, para }) => ({ de, para })) ?? [];
  const brancas = melhor ? parteDasBrancas(melhor.avaliacao, estado.vez) : 50;
  const topo = dados.orientacao === "brancas" ? "pretas" : "brancas";

  let textoStatus: string;
  if (estado.resultado) textoStatus = "A partida terminou.";
  else if (status === "erro") textoStatus = erro ?? "Erro na análise";
  else if (!resultado) textoStatus = "Começando…";
  else
    textoStatus =
      status === "analisando"
        ? `Profundidade ${resultado.profundidade} · pensando há ${segundos} s…`
        : `Profundidade ${resultado.profundidade} · terminou em ${(resultado.tempoMs / 1000).toFixed(1)} s`;

  return (
    <main className="tela-analise">
      <header className="analise-topo">
        <h1>Análise ao vivo</h1>
        <span className="selo-dev">dev</span>
      </header>
      <p className="dica">
        Melhores lances para as <strong>{NOME_COR[estado.vez].toLowerCase()}</strong> · {textoStatus}
      </p>

      <div className="analise-mesa">
        <div
          className="barra-avaliacao"
          role="img"
          aria-label={`Avaliação: ${melhor ? formatarNota(melhor.avaliacao) : "?"} para as ${NOME_COR[estado.vez].toLowerCase()}`}
        >
          <div className={`barra-${topo}`} style={{ flexBasis: `${topo === "brancas" ? brancas : 100 - brancas}%` }} />
          <div className={`barra-${corOposta(topo)}`} style={{ flexGrow: 1 }} />
        </div>
        <div className="area-tabuleiro">
          <Tabuleiro
            estado={estado}
            orientacao={dados.orientacao}
            selecionada={null}
            destinos={[]}
            alvosPoder={null}
            destaques={[]}
            setasAnalise={setas}
            podeArrastar={() => false}
            aoTocarCasa={SEM_ACAO}
            aoSoltar={SEM_ACAO}
          />
        </div>
      </div>

      {resultado && (
        <ol className="analise-lista">
          {resultado.lances.map((l, i) => (
            <li key={`${l.texto}-${i}`} className={i === 0 ? "analise-melhor" : ""}>
              <span className="analise-nota">{formatarNota(l.avaliacao)}</span>
              <strong>{l.texto}</strong>
              {l.linha.length > 0 && <span className="analise-linha">{l.linha.join(" ")}</span>}
            </li>
          ))}
        </ol>
      )}
      <p className="dica">Usa só as cartas de quem joga. Botão direito desenha setas, como no jogo.</p>
    </main>
  );
}
