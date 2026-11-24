import { useEffect, useRef, useState, type ReactNode } from "react";
import { corOposta, ERRO_SALA_CHEIA, type Cor, type VistaSala } from "@xadrez/engine";
import { CartaVisual } from "../componentes/CartaVisual.tsx";
import { NOME_REGRAS, type ModoPartida } from "../modo.ts";
import { ENDERECO_SERVIDOR, lerToken, ONLINE_DISPONIVEL } from "../online/conexao.ts";
import { useSala } from "../online/useSala.ts";
import { registrarFimDePartida, type Novidades } from "../progresso.ts";
import { NOME_COR } from "../textos.ts";
import { Partida } from "./Partida.tsx";

export function TelaOnline({ codigo, assistir = false, aoSair }: { codigo: string; assistir?: boolean; aoSair(): void }) {
  if (!ONLINE_DISPONIVEL) {
    return (
      <Cartaz titulo="Online ainda não disponível" aoSair={aoSair}>
        <p className="subtitulo">Esta versão do site ainda não tem o servidor das partidas online.</p>
      </Cartaz>
    );
  }
  return <EscolherComoEntrar codigo={codigo} assistir={assistir} aoSair={aoSair} />;
}

/**
 * Quem chega pelo link (ou pelo código) escolhe entre jogar e assistir. Quem criou a sala
 * ou já é jogador dela (tem o token guardado) entra direto.
 */
function EscolherComoEntrar({ codigo, assistir, aoSair }: { codigo: string; assistir: boolean; aoSair(): void }) {
  const [jogar, setJogar] = useState(() => !!lerToken(codigo));
  if (assistir || jogar) return <SalaConectada codigo={codigo} assistir={assistir} aoSair={aoSair} />;
  return (
    <Cartaz titulo={`Sala ${codigo}`} aoSair={aoSair}>
      <p className="subtitulo">Como você quer entrar?</p>
      <div className="escolha-entrada">
        <button type="button" className="botao" onClick={() => setJogar(true)}>
          ♟ Jogar
        </button>
        <button type="button" className="botao botao-secundario" onClick={() => (location.hash = `#assistir-${codigo}`)}>
          👁 Assistir
        </button>
      </div>
      <p className="dica">Se a sala já tiver dois jogadores, você ainda pode assistir.</p>
    </Cartaz>
  );
}

/** Link para alguém só assistir à sala. */
export const linkParaAssistir = (codigo: string) => `${location.origin}${location.pathname}#assistir-${codigo}`;

function SalaConectada({ codigo, assistir, aoSair }: { codigo: string; assistir: boolean; aoSair(): void }) {
  const sala = useSala(codigo, assistir);
  const v = sala.vista;
  const [novidades, setNovidades] = useState<Novidades | null>(null);
  const salvo = useRef(false);

  // Fim da partida: guarda no histórico (com o estado inicial e as ações completos).
  // Quem só assistiu não guarda nada.
  useEffect(() => {
    if (!v || v.espectador) return;
    if (v.fase !== "fim") {
      salvo.current = false;
      return;
    }
    if (salvo.current || !v.final || !v.estado) return;
    salvo.current = true;
    const adversario = v.jogadores[corOposta(v.minhaCor)]?.apelido;
    setNovidades(registrarFimDePartida(modoDa(v), v.final.inicial, v.final.acoes, v.estado, adversario));
  }, [v]);

  if (sala.erro && !v) {
    return (
      <Cartaz titulo="Não deu para entrar na sala" aoSair={aoSair}>
        <p className="subtitulo">{sala.erro}</p>
        {sala.erro === ERRO_SALA_CHEIA && (
          <button type="button" className="botao" onClick={() => (location.hash = `#assistir-${codigo}`)}>
            👁 Assistir a partida
          </button>
        )}
        <p className="dica">Servidor: {ENDERECO_SERVIDOR}. Para jogar, ele precisa estar rodando (pnpm dev).</p>
      </Cartaz>
    );
  }
  if (!v) {
    return (
      <Cartaz titulo="Conectando…" aoSair={aoSair}>
        <p className="subtitulo">{assistir ? "Abrindo a partida da" : "Entrando na"} sala {codigo}.</p>
      </Cartaz>
    );
  }
  if (v.espectador && v.fase === "draft" && v.draftEspectador) {
    return <DraftEspectador vista={v} aoSair={aoSair} />;
  }
  if (v.espectador && (v.fase === "aguardando" || v.fase === "draft")) {
    return (
      <Cartaz titulo="Assistindo à sala" aoSair={aoSair}>
        <p className="subtitulo">{resumoConfig(v)}</p>
        <p className="esperando">
          <span className="pontinhos" aria-hidden="true" />{" "}
          {v.fase === "draft" ? "Os jogadores estão escolhendo as cartas…" : "Esperando o segundo jogador entrar…"}
        </p>
      </Cartaz>
    );
  }
  if (v.fase === "aguardando") return <Aguardando vista={v} aoSair={aoSair} />;
  if (v.fase === "draft") return <DraftOnline vista={v} escolher={sala.escolherDraft} rerolar={sala.rerolarDraft} aoSair={aoSair} />;
  if (!v.estado) return null;

  const adversario = corOposta(v.minhaCor);
  const nome = (c: Cor) => v.jogadores[c]?.apelido ?? "Adversário";
  // A sala sumiu do servidor (ele reiniciou, ou a sala expirou): a partida não continua.
  const salaPerdida = sala.erro !== null && v.fase !== "fim";
  return (
    <>
      {salaPerdida && (
        <div className="sobreposicao" role="alertdialog" aria-modal="true" aria-labelledby="titulo-sala-perdida">
          <div className="janela">
            <h2 id="titulo-sala-perdida">A partida foi interrompida</h2>
            <p className="subtitulo">
              O servidor reiniciou e esta sala deixou de existir, então os lances não chegam mais ao adversário.
              Desculpe! Crie uma sala nova para jogar de novo.
            </p>
            <p className="dica">{sala.erro}</p>
            <button type="button" className="botao" onClick={aoSair}>
              Voltar ao início
            </button>
          </div>
        </div>
      )}
      {/* Na revanche (as cores trocam), a chave muda e a tela da partida recomeça do zero. */}
      <Partida
      key={`${v.numeroPartida}-${v.minhaCor}`}
      modo={modoDa(v)}
      aoSair={aoSair}
      aoRevanche={sala.revanche}
      online={{
        estado: v.estado,
        destaques: v.destaques,
        enviar: sala.enviar,
        nomes: { brancas: nome("brancas"), pretas: nome("pretas") },
        relogio: v.relogio ? { ...v.relogio, recebidoEm: sala.recebidaEm } : null,
        recusa: sala.recusa,
        adversarioConectado: !!v.jogadores[adversario]?.conectado,
        espectador: v.espectador,
        espectadores: v.espectadores,
        conectados: { brancas: !!v.jogadores.brancas?.conectado, pretas: !!v.jogadores.pretas?.conectado },
        linkAssistir: linkParaAssistir(v.codigo),
        final: v.final,
        aoVirarEspectador: sala.virarEspectador,
        revanchePedida: v.revanchePedida,
        aoRevanche: sala.revanche,
        aoDesistir: sala.desistir,
        aoReagir: sala.reagir,
        reacoes: sala.reacoes,
        novidades,
      }}
    />
    </>
  );
}

function modoDa(v: VistaSala): ModoPartida {
  return {
    tipo: "online",
    corHumano: v.minhaCor,
    codigo: v.codigo,
    regras: v.config.regras,
    casasEspeciais: v.config.casasEspeciais,
    airdrops: v.config.airdrops === true,
  };
}

function resumoConfig(v: VistaSala): string {
  const tempo = v.config.minutos ? `${v.config.minutos} min para cada lado` : "sem relógio";
  return `${NOME_REGRAS[v.config.regras]} · ${tempo}${v.config.airdrops ? " · airdrops" : ""}${v.config.casasEspeciais ? " · casas especiais" : ""}`;
}

function Cartaz({ titulo, aoSair, children }: { titulo: string; aoSair(): void; children: ReactNode }) {
  return (
    <main className="tela-sala">
      <h1>{titulo}</h1>
      {children}
      <button type="button" className="botao-link" onClick={aoSair}>
        ← Voltar ao início
      </button>
    </main>
  );
}

function Aguardando({ vista, aoSair }: { vista: VistaSala; aoSair(): void }) {
  const link = `${location.origin}${location.pathname}#sala-${vista.codigo}`;
  const [copiado, setCopiado] = useState(false);
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Cartaz titulo="Sala criada!" aoSair={aoSair}>
      <p className="subtitulo">
        Você joga com as <strong>{NOME_COR[vista.minhaCor].toLowerCase()}</strong>. Mande o link para o seu amigo; a
        partida começa assim que ele entrar.
      </p>
      <div className="link-sala">
        <code>{link}</code>
        <button type="button" className="botao" onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
      </div>
      <p className="codigo-sala">
        Código: <strong>{vista.codigo}</strong>
      </p>
      <p className="dica">{resumoConfig(vista)}</p>
      {local && (
        <p className="dica aviso-rede">
          O endereço tem “localhost”: ele só funciona neste computador. Para alguém na mesma rede Wi-Fi, troque
          “localhost” pelo IP do computador (o Vite mostra em “Network” quando roda com --host).
        </p>
      )}
      <p className="esperando">
        <span className="pontinhos" aria-hidden="true" /> Esperando o amigo entrar…
      </p>
    </Cartaz>
  );
}

function DraftOnline({
  vista,
  escolher,
  rerolar,
  aoSair,
}: {
  vista: VistaSala;
  escolher(e: { poder: string; desvantagem: string }): void;
  rerolar(): void;
  aoSair(): void;
}) {
  const [poder, setPoder] = useState<string | null>(null);
  const [desvantagem, setDesvantagem] = useState<string | null>(null);
  const jaEscolhi = vista.draftEscolhido[vista.minhaCor];
  const oferta = vista.oferta;
  // Depois do re-roll as opções mudam: limpa o que estava marcado.
  const chaveOferta = oferta ? [...oferta.poderes, ...oferta.desvantagens].join() : "";
  useEffect(() => {
    setPoder(null);
    setDesvantagem(null);
  }, [chaveOferta]);

  if (jaEscolhi || !oferta) {
    return (
      <Cartaz titulo="Cartas escolhidas!" aoSair={aoSair}>
        <p className="esperando">
          <span className="pontinhos" aria-hidden="true" /> Esperando o adversário escolher as dele…
        </p>
      </Cartaz>
    );
  }

  const grupo = (titulo: string, ids: string[], atual: string | null, mudar: (id: string) => void) => (
    <>
      <h2>{titulo}</h2>
      <div className="draft-opcoes" role="radiogroup" aria-label={titulo}>
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={atual === id}
            className={`draft-carta ${atual === id ? "escolhida" : ""}`}
            onClick={() => mudar(id)}
          >
            <CartaVisual cartaId={id} />
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="tela-draft">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoSair}>
          ← Início
        </button>
        <span className="barra-titulo">Draft online · sala {vista.codigo}</span>
        <span />
      </header>
      <section className="draft-escolha">
        <h1>Escolha suas cartas</h1>
        <p className="subtitulo">
          O seu poder e a desvantagem que o adversário vai ter. Ele recebeu opções com os mesmos pesos e, ao mesmo
          tempo, escolhe a sua desvantagem.
        </p>
        {grupo("Poder", oferta.poderes, poder, setPoder)}
        {grupo("Desvantagem para o adversário", oferta.desvantagens, desvantagem, setDesvantagem)}
        <div className="acoes">
          <button
            type="button"
            className="botao botao-secundario"
            disabled={!vista.rerollDisponivel}
            onClick={rerolar}
            title="Troca as 6 opções por outras do mesmo peso (só uma vez)"
          >
            {vista.rerollDisponivel ? "🎲 Re-roll (1×)" : "Re-roll usado"}
          </button>
          <button
            type="button"
            className="botao"
            disabled={!poder || !desvantagem}
            onClick={() => poder && desvantagem && escolher({ poder, desvantagem })}
          >
            Confirmar
          </button>
        </div>
      </section>
    </div>
  );
}

/** Draft para quem assiste: as opções dos dois jogadores e o que cada um confirmou. */
function DraftEspectador({ vista, aoSair }: { vista: VistaSala; aoSair(): void }) {
  const d = vista.draftEspectador!;
  const nome = (c: Cor) => vista.jogadores[c]?.apelido ?? NOME_COR[c];
  const linha = (titulo: string, ids: string[], escolhida: string | null | undefined) => (
    <>
      <h3>{titulo}</h3>
      <div className="draft-opcoes">
        {ids.map((id) => (
          <div key={id} className={`draft-carta ${escolhida === id ? "escolhida" : escolhida ? "descartada" : ""}`}>
            <CartaVisual cartaId={id} />
          </div>
        ))}
      </div>
    </>
  );
  return (
    <div className="tela-draft">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoSair}>
          ← Início
        </button>
        <span className="barra-titulo">Assistindo ao Draft · sala {vista.codigo}</span>
        <span />
      </header>
      <section className="draft-espectador">
        {(["brancas", "pretas"] as const).map((cor) => {
          const escolha = d.escolhas[cor];
          return (
            <div key={cor} className="draft-lado">
              <h2>
                {nome(cor)} ({NOME_COR[cor].toLowerCase()}){" "}
                <span className={`selo-draft ${escolha ? "pronto" : ""}`}>{escolha ? "✓ escolheu" : "escolhendo…"}</span>
              </h2>
              {linha("Poder", d.ofertas[cor].poderes, escolha?.poder)}
              {linha("Desvantagem para o adversário", d.ofertas[cor].desvantagens, escolha?.desvantagem)}
            </div>
          );
        })}
      </section>
    </div>
  );
}
