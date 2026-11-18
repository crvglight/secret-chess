import { useEffect, useRef, useState } from "react";
import { registrarFimDePartida, type AcaoPartida, type Novidades } from "../progresso.ts";
import {
  aplicarLance,
  corOposta,
  criarPartida,
  casaDoReiEmXeque,
  casasAtoladas,
  casasNaNevoa,
  casasNoTrampolim,
  casasVisiveis,
  ladosComVigia,
  cartasAbertas,
  disfarcesDasCartas,
  destaquesDasCartas,
  gerarLancesBase,
  infoPoder,
  jogarCartaDaMao,
  lancesDaCasa,
  lancesDePoderDaCasa,
  motivoBloqueio,
  obterCarta,
  obterEvento,
  sortearCartas,
  usarPoder,
  type Bloqueio,
  type Casa,
  type CartasDoJogador,
  type DestaqueNoTabuleiro,
  type Reacao,
  type Cor,
  type Estado,
  type Lance,
  type TipoPeca,
} from "@xadrez/engine";
import { EscolhaPromocao } from "../componentes/EscolhaPromocao.tsx";
import { SeletorVisual } from "../componentes/SeletorVisual.tsx";
import { FimDePartida } from "../componentes/FimDePartida.tsx";
import { PainelCaos } from "../componentes/PainelCaos.tsx";
import { PainelOnline } from "../componentes/PainelOnline.tsx";
import type { ReacaoRecebida } from "../online/useSala.ts";
import { PainelCasas } from "../componentes/PainelCasas.tsx";
import { PainelJogador } from "../componentes/PainelJogador.tsx";
import { Tabuleiro } from "../componentes/Tabuleiro.tsx";
import { analiseLiberada } from "../dev/liberacao.ts";
import { useIA } from "../ia/useIA.ts";
import { NOME_NIVEL, NOME_REGRAS, type ModoPartida } from "../modo.ts";
import { NOME_COR, numeroDoLance, tituloResultado } from "../textos.ts";

/**
 * Para testar cartas específicas: ?cartas=poderBrancas,desvBrancas,poderPretas,desvPretas
 * (ids das cartas, ex.: ?cartas=teleporte,prazo,armadilha,rei-preso). Sem isso, sorteia.
 */
function cartasDaUrl(): Record<Cor, { poder: string; desvantagem: string }> | null {
  const ids = new URLSearchParams(location.search).get("cartas")?.split(",");
  if (ids?.length !== 4) return null;
  try {
    ids.forEach(obterCarta);
  } catch {
    return null;
  }
  return {
    brancas: { poder: ids[0]!, desvantagem: ids[1]! },
    pretas: { poder: ids[2]!, desvantagem: ids[3]! },
  };
}

/** O que o transmissor da análise (só no modo de desenvolvimento) expõe. */
interface Transmissor {
  publicar(): void;
  parar(): void;
}

/** Tempo mínimo antes do lance da IA aparecer, para não parecer instantâneo. */
const ESPERA_MINIMA_IA = 450;

/**
 * O que aconteceu durante o lance e merece aviso na hora: um evento do Caos
 * começando ou o efeito de uma carta (ex.: armadilha disparou).
 */
function avisoDeCarta(antes: Estado, depois: Estado): string | null {
  const daCasa = depois.casas?.registro.slice(antes.casas?.registro.length ?? 0).at(-1);
  if (daCasa) return daCasa.texto;
  const evento = depois.caos?.registro.slice(antes.caos?.registro.length ?? 0).at(-1);
  if (evento) {
    const e = obterEvento(evento.id);
    return `Evento: ${e.nome}! ${e.descricao}`;
  }
  const novo = depois.eventos.slice(antes.eventos.length).at(-1);
  return novo ? `${obterCarta(novo.cartaId).nome}: ${novo.texto}` : null;
}

/** Peças possíveis na promoção deste lance (a forja só deixa cavalo e bispo). */
function opcoesDePromocao(estado: Estado, de: Casa, para: Casa): TipoPeca[] | undefined {
  const tipos = lancesDaCasa(estado, de)
    .filter((l) => l.para === para && l.promocao)
    .map((l) => l.promocao!);
  return tipos.length === 4 ? undefined : tipos;
}

function textoBloqueio(b: Bloqueio, vez: Cor): string {
  if (b.xeque) return "Seu rei está em xeque: este lance não tira o rei do xeque.";
  if (b.casa) return `A casa especial “${b.nome}” impede este lance.`;
  if (b.evento) return `O evento “${b.nome}” impede este lance.`;
  return b.dono === vez
    ? `Sua carta “${b.nome}” impede este lance.`
    : "Uma carta do adversário impede este lance.";
}

/** O que a partida online entrega para esta tela (o estado e as regras ficam no servidor). */
export interface ControleOnline {
  /** O estado como este jogador pode ver. */
  estado: Estado;
  destaques: DestaqueNoTabuleiro[];
  enviar(acao: AcaoPartida): void;
  nomes: Record<Cor, string>;
  /** Tempo de cada lado quando a vista chegou (recebidoEm = Date.now() na chegada). */
  relogio: { restante: Record<Cor, number>; correndo: Cor | null; recebidoEm: number } | null;
  /** Último lance recusado pelo servidor (o id muda a cada recusa). */
  recusa: { texto: string; id: number } | null;
  adversarioConectado: boolean;
  revanchePedida: Record<Cor, boolean>;
  aoRevanche(): void;
  aoDesistir(): void;
  aoReagir(r: Reacao): void;
  reacoes: ReacaoRecebida[];
  novidades: Novidades | null;
}

interface Props {
  modo: ModoPartida;
  /** Partida online: o estado vem do servidor e as ações vão para ele. */
  online?: ControleOnline;
  /** Cartas já escolhidas (modo Draft). Sem isso, sorteia. */
  cartas?: Record<Cor, CartasDoJogador>;
  aoSair(): void;
  /** Se vier, a revanche é decidida fora (ex.: o Draft escolhe cartas de novo). */
  aoRevanche?(): void;
}

export function Partida({ modo, cartas, aoSair, aoRevanche, online }: Props) {
  const novaPartida = () =>
    criarPartida({
      cartas: cartas ?? cartasDaUrl() ?? sortearCartas(),
      // Mão de cartas: os poderes vêm da mão; a desvantagem sorteada continua.
      ...(modo.regras === "mao" ? { maoDeCartas: {} } : {}),
      ...(modo.regras === "caos" ? { caos: {} } : {}),
      ...(modo.casasEspeciais ? { casasEspeciais: modo.casasEspeciais === "todas" ? { quantos: 16 } : {} } : {}),
    });
  const contraIA = modo.tipo === "ia";
  // Contra a IA e no online, só um lado é jogado nesta tela.
  const corHumano: Cor | null = modo.tipo === "local" ? null : modo.corHumano;
  // Contra a IA, as cartas do humano ficam sempre à mostra. Na partida local, começam viradas.
  const visiveisIniciais: Record<Cor, boolean> = {
    brancas: corHumano === "brancas",
    pretas: corHumano === "pretas",
  };

  // O estado inicial e as ações ficam guardados para o replay e o histórico.
  const [inicial, setInicial] = useState<Estado>(novaPartida);
  const [estadoLocal, setEstadoBruto] = useState<Estado>(inicial);
  const estado = online?.estado ?? estadoLocal;
  const acoes = useRef<AcaoPartida[]>([]);
  const salvo = useRef(false);
  const [novidades, setNovidades] = useState<Novidades | null>(null);
  /** Troca o estado e anota a ação que levou a ele. */
  const setEstado = (novo: Estado, acao: AcaoPartida) => {
    // Online: quem decide é o servidor; o estado novo chega na próxima vista.
    if (online) {
      online.enviar(acao);
      return;
    }
    acoes.current.push(acao);
    setEstadoBruto(novo);
  };

  // Fim de partida: estatísticas, desbloqueio, conquistas e histórico (uma vez só).
  useEffect(() => {
    if (online || !estado.resultado || salvo.current) return;
    salvo.current = true;
    setNovidades(registrarFimDePartida(modo, inicial, acoes.current, estado));
  }, [estado, inicial, modo, online]);
  const [selecionada, setSelecionada] = useState<Casa | null>(null);
  const [modoPoder, setModoPoder] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [promocao, setPromocao] = useState<{ de: Casa; para: Casa } | null>(null);
  const [visiveis, setVisiveis] = useState(visiveisIniciais);
  const [orientacao, setOrientacao] = useState<Cor>(corHumano ?? "brancas");
  const [fimFechado, setFimFechado] = useState(false);
  const [mostrarVisual, setMostrarVisual] = useState(false);

  // Esc fecha a janela do visual.
  useEffect(() => {
    if (!mostrarVisual) return;
    const aoTeclar = (ev: KeyboardEvent) => ev.key === "Escape" && setMostrarVisual(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [mostrarVisual]);
  const pedirJogada = useIA();

  // Análise ao vivo: Alt+A abre a janela de análise, que acompanha esta partida.
  // Vale no `pnpm dev` e, no site publicado, só no navegador liberado pela chave
  // secreta (dev/liberacao.ts). Sem a chave, o código da análise nem é baixado.
  const partidaAtual = useRef({ estado, orientacao });
  const transmissor = useRef<Transmissor | null>(null);
  useEffect(() => {
    partidaAtual.current = { estado, orientacao };
    transmissor.current?.publicar();
  }, [estado, orientacao]);
  useEffect(() => {
    let cancelado = false;
    void analiseLiberada().then(async (pode) => {
      if (!pode || cancelado) return;
      const { iniciarTransmissor } = await import("../dev/transmissor.ts");
      if (!cancelado) transmissor.current = iniciarTransmissor(() => partidaAtual.current);
    });
    return () => {
      cancelado = true;
      transmissor.current?.parar();
      transmissor.current = null;
    };
  }, []);

  // Vez do outro lado (IA ou adversário online): este navegador não mexe.
  const vezDoOutro = corHumano !== null && estado.vez !== corHumano && !estado.resultado;

  // Online: avisa o lance que o servidor recusou.
  const idRecusa = online?.recusa?.id;
  useEffect(() => {
    if (online?.recusa) setAviso(online.recusa.texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRecusa]);

  // Relógio (online): atualiza a tela enquanto um relógio corre.
  const [agora, setAgora] = useState(() => Date.now());
  const correndo = online?.relogio?.correndo ?? null;
  const recebidoEm = online?.relogio?.recebidoEm ?? 0;
  useEffect(() => {
    setAgora(Date.now()); // a vista acabou de chegar: o "agora" não pode ficar para trás
    if (!correndo) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [correndo, recebidoEm]);
  const tempoDe = (cor: Cor): number | null => {
    const r = online?.relogio;
    if (!r) return null;
    const passou = Math.max(0, agora - r.recebidoEm);
    return Math.max(0, r.restante[cor] - (r.correndo === cor ? passou : 0));
  };
  const reiEmXeque = casaDoReiEmXeque(estado);
  const poder = modoPoder ? infoPoder(estado) : null;
  // Poder em forma de lance (teleporte, troca): primeiro escolhe a peça, depois o destino.
  const poderDeLance = poder?.modo === "lance";
  let destinos: Lance[] = [];
  if (selecionada !== null && !modoPoder) destinos = lancesDaCasa(estado, selecionada);
  if (selecionada !== null && poderDeLance) destinos = lancesDePoderDaCasa(estado, selecionada);
  const alvosPoder = poder && !(poderDeLance && selecionada !== null) ? poder.alvos : null;

  // Destaques das cartas: os secretos (armadilha) só para quem pode ver as cartas daquele lado.
  // Quem está na tela vê as cartas deste lado? (Espião deixa as cartas abertas para todos.)
  const veCartasDe = (cor: Cor) =>
    estado.resultado !== null || cartasAbertas(estado, cor) || (corHumano ? cor === corHumano : visiveis[cor]);
  // Torre de vigia: o lado adversário de quem está nela vê os segredos dele.
  const vigias = ladosComVigia(estado);
  const veSegredosDe = (cor: Cor) => veCartasDe(cor) || vigias.has(corOposta(cor));
  // Névoa: as peças de um lado ficam escondidas de quem joga do outro lado.
  // Contra a IA, quem olha é o humano; na partida local, quem tem a vez.
  const olhando: Cor = corHumano ?? estado.vez;
  const escondidas = new Set<Casa>();
  if (!estado.resultado) {
    for (const [c, dono] of casasNaNevoa(estado)) {
      if (dono !== olhando && estado.tabuleiro[c]?.cor === dono) escondidas.add(c);
    }
  }
  // Ilusão: a peça disfarçada aparece como peão para quem não vê as cartas do dono.
  const disfarces = new Map(
    disfarcesDasCartas(estado)
      .filter((d) => !veSegredosDe(d.dono))
      .map((d) => [d.casa, d.tipo] as const),
  );
  const destaques = [
    // Online, o servidor manda os destaques que este jogador pode ver.
    ...(online ? online.destaques : destaquesDasCartas(estado).filter((d) => d.publico || veSegredosDe(d.dono))),
    ...casasAtoladas(estado).map((casa) => ({ casa, rotulo: "Atolada" })),
    ...casasNoTrampolim(estado).map((casa) => ({ casa, rotulo: "Trampolim" })),
  ];

  // Quando é a vez da IA, pede a jogada ao Web Worker.
  useEffect(() => {
    if (modo.tipo !== "ia" || estado.vez === modo.corHumano || estado.resultado) return;
    let cancelado = false;
    const inicio = Date.now();
    pedirJogada(estado, modo.nivel)
      .then((jogada) => {
        const espera = Math.max(0, ESPERA_MINIMA_IA - (Date.now() - inicio));
        setTimeout(() => {
          if (cancelado) return;
          const comCarta = jogada.carta === null ? estado : jogarCartaDaMao(estado, jogada.carta);
          const depoisDoPoder = jogada.poder ? usarPoder(comCarta, jogada.poder.alvo) : comCarta;
          const novo = aplicarLance(depoisDoPoder, jogada.lance);
          if (jogada.carta !== null) acoes.current.push({ tipo: "carta", indice: jogada.carta });
          if (jogada.poder) acoes.current.push({ tipo: "poder", alvo: jogada.poder.alvo });
          // A IA nunca é online: grava a ação e troca o estado direto.
          acoes.current.push({ tipo: "lance", lance: jogada.lance });
          setEstadoBruto(novo);
          let avisoIA: string | null = null;
          if (jogada.carta !== null) avisoIA = "A IA jogou uma carta da mão!";
          else if (jogada.poder || jogada.lance.poder) avisoIA = "A IA usou o poder dela!";
          setAviso(avisoDeCarta(depoisDoPoder, novo) ?? avisoIA);
        }, espera);
      })
      .catch((erro: Error) => {
        if (!cancelado) setAviso(`A IA travou: ${erro.message}`);
      });
    return () => {
      cancelado = true;
    };
  }, [estado, modo, pedirJogada]);

  function reiniciar() {
    if (aoRevanche) {
      aoRevanche();
      return;
    }
    const nova = novaPartida();
    setInicial(nova);
    setEstadoBruto(nova);
    acoes.current = [];
    salvo.current = false;
    setNovidades(null);
    setSelecionada(null);
    setModoPoder(false);
    setAviso(null);
    setPromocao(null);
    setVisiveis(visiveisIniciais);
    setFimFechado(false);
  }

  function efetivar(lance: Lance) {
    const novo = aplicarLance(estado, lance);
    setEstado(novo, { tipo: "lance", lance });
    setSelecionada(null);
    setPromocao(null);
    setModoPoder(false);
    if (!novo.resultado && novo.vez === estado.vez) {
      setAviso("Você joga de novo!");
      return;
    }
    setAviso(avisoDeCarta(estado, novo));
    if (!corHumano) setVisiveis(visiveisIniciais);
  }

  function tentarLance(de: Casa, para: Casa) {
    const opcoes = lancesDaCasa(estado, de).filter((l) => l.para === para);
    if (opcoes.length === 0) {
      const bloqueio = motivoBloqueio(estado, de, para);
      setAviso(bloqueio ? textoBloqueio(bloqueio, estado.vez) : null);
      setSelecionada(null);
      return;
    }
    if (opcoes.some((l) => l.promocao)) {
      setPromocao({ de, para });
      return;
    }
    efetivar(opcoes[0]!);
  }

  /** Ao escolher uma peça sem lances, explica se é uma carta que a trava. */
  function selecionar(c: Casa) {
    setSelecionada(c);
    if (lancesDaCasa(estado, c).length > 0) {
      setAviso(null);
      return;
    }
    const base = gerarLancesBase(estado, estado.vez).filter((l) => l.de === c);
    const bloqueio = base.map((l) => motivoBloqueio(estado, l.de, l.para)).find((b) => b !== null);
    setAviso(bloqueio ? textoBloqueio(bloqueio, estado.vez) : "Esta peça não tem lances agora.");
  }

  function aoTocarCasa(c: Casa) {
    if (estado.resultado || vezDoOutro) return;
    if (modoPoder && poderDeLance) {
      const lance = destinos.find((l) => l.para === c);
      if (lance) efetivar(lance);
      else if (poder?.alvos.includes(c)) setSelecionada(c);
      return;
    }
    if (modoPoder) {
      if (alvosPoder?.includes(c)) {
        setEstado(usarPoder(estado, c), { tipo: "poder", alvo: c });
        setModoPoder(false);
        setAviso("Poder usado! Agora faça o seu lance.");
      }
      return;
    }
    const peca = estado.tabuleiro[c];
    if (peca?.cor === estado.vez) {
      if (c !== selecionada) selecionar(c);
      return;
    }
    if (selecionada !== null) tentarLance(selecionada, c);
  }

  function aoJogarCarta(indice: number) {
    const id = estado.mao?.mao[estado.vez][indice];
    if (!id) return;
    setEstado(jogarCartaDaMao(estado, indice), { tipo: "carta", indice });
    setSelecionada(null);
    setAviso(
      obterCarta(id).acaoAtiva
        ? `${obterCarta(id).nome} em jogo: aperte "Usar poder" e depois faça seu lance.`
        : `${obterCarta(id).nome} em jogo nesta rodada. Faça seu lance.`,
    );
  }

  function aoUsarPoder() {
    const info = infoPoder(estado);
    if (!info.disponivel) return;
    if (info.modo === "alvo" || info.modo === "lance") {
      setModoPoder(true);
      setSelecionada(null);
      setAviso(info.instrucao);
    } else {
      setEstado(usarPoder(estado), { tipo: "poder", alvo: null });
      setAviso("Poder usado! Agora faça o seu lance.");
    }
  }

  const nomeDoLado = (cor: Cor) => {
    if (modo.tipo === "local") return NOME_COR[cor];
    if (online) return cor === modo.corHumano ? `Você (${NOME_COR[cor].toLowerCase()})` : `${online.nomes[cor]} (${NOME_COR[cor].toLowerCase()})`;
    if (modo.tipo !== "ia") return NOME_COR[cor];
    return cor === modo.corHumano ? `Você (${NOME_COR[cor].toLowerCase()})` : `IA ${NOME_NIVEL[modo.nivel].toLowerCase()} (${NOME_COR[cor].toLowerCase()})`;
  };

  const painel = (cor: Cor) => (
    <PainelJogador
      estado={estado}
      cor={cor}
      nome={nomeDoLado(cor)}
      controlavel={!corHumano || cor === corHumano}
      tempo={tempoDe(cor)}
      relogioCorrendo={online?.relogio?.correndo === cor}
      cartasVisiveis={visiveis[cor] || estado.resultado !== null || cartasAbertas(estado, cor)}
      modoPoder={modoPoder && estado.vez === cor}
      aoAlternarCartas={() => setVisiveis((v) => ({ ...v, [cor]: !v[cor] }))}
      aoUsarPoder={aoUsarPoder}
      aoJogarCarta={aoJogarCarta}
      aoCancelarPoder={() => {
        setModoPoder(false);
        setSelecionada(null);
        setAviso(null);
      }}
    />
  );

  let textoAviso: string;
  if (estado.resultado) textoAviso = tituloResultado(estado);
  else if (aviso) textoAviso = aviso;
  else if (vezDoOutro) textoAviso = contraIA ? "A IA está pensando…" : "Vez do adversário…";
  else if (corHumano) textoAviso = "Sua vez";
  else textoAviso = `Vez das ${NOME_COR[estado.vez].toLowerCase()}`;

  return (
    <div className="tela-partida">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoSair}>
          ← Início
        </button>
        <span className="barra-titulo">
          {modo.tipo === "local"
            ? "Partida local"
            : modo.tipo === "ia"
              ? `Contra a IA (${NOME_NIVEL[modo.nivel].toLowerCase()})`
              : `Online · sala ${modo.codigo}`}
          {modo.regras !== "padrao" && ` · ${NOME_REGRAS[modo.regras]}`}
          {modo.casasEspeciais && " · Casas especiais"}
        </span>
        <span className="barra-acoes">
          <button type="button" className="botao-link" onClick={() => setOrientacao(corOposta)}>
            Girar tabuleiro
          </button>
          <button
            type="button"
            className="botao-icone"
            onClick={() => setMostrarVisual(true)}
            aria-label="Mudar o visual do tabuleiro e das peças"
            title="Mudar o visual"
          >
            ⚙
          </button>
        </span>
      </header>

      <div className="mesa">
        <div className="coluna-tabuleiro">
          {painel(corOposta(orientacao))}
          <div className="area-tabuleiro">
            <Tabuleiro
              estado={estado}
              orientacao={orientacao}
              selecionada={selecionada}
              destinos={destinos}
              alvosPoder={alvosPoder}
              destaques={destaques}
              reiEmXeque={reiEmXeque}
              casasEspeciais={casasVisiveis(estado)}
              disfarces={disfarces}
              escondidas={escondidas}
              podeArrastar={(c) =>
                !modoPoder && !estado.resultado && !vezDoOutro && estado.tabuleiro[c]?.cor === estado.vez
              }
              aoTocarCasa={aoTocarCasa}
              aoSoltar={tentarLance}
            />
          </div>
          {reiEmXeque !== null && (
            <p className="aviso-xeque" role="alert">
              Xeque! {corHumano && estado.vez !== corHumano
                ? contraIA
                  ? "O rei da IA"
                  : "O rei do adversário"
                : `O rei das ${NOME_COR[estado.vez].toLowerCase()}`}{" "}
              está ameaçado: mova o rei, capture quem ataca ou bloqueie.
            </p>
          )}
          <p className="aviso" role="status" aria-live="polite">
            {textoAviso}
          </p>
          {painel(orientacao)}
        </div>

        <aside className="lateral">
          {online && <PainelOnline online={online} minhaCor={corHumano!} fim={!!estado.resultado} />}
          <PainelCaos estado={estado} />
          <PainelCasas estado={estado} />
          <h2>Lances</h2>
          <Historico estado={estado} />
          <p className="dica">Botão direito: arraste para desenhar setas ou clique para marcar casas.</p>
          {estado.resultado && fimFechado && (
            <button type="button" className="botao" onClick={() => setFimFechado(false)}>
              Ver resultado
            </button>
          )}
        </aside>
      </div>

      {mostrarVisual && (
        <div
          className="sobreposicao"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-visual"
          onClick={(ev) => ev.target === ev.currentTarget && setMostrarVisual(false)}
        >
          <div className="janela janela-visual">
            <h2 id="titulo-visual">Visual</h2>
            <SeletorVisual />
            <button type="button" className="botao" onClick={() => setMostrarVisual(false)}>
              Pronto
            </button>
          </div>
        </div>
      )}

      {promocao && (
        <EscolhaPromocao
          cor={estado.vez}
          opcoes={opcoesDePromocao(estado, promocao.de, promocao.para)}
          aoEscolher={(tipo: TipoPeca) => efetivar({ ...promocao, promocao: tipo })}
          aoCancelar={() => {
            setPromocao(null);
            setSelecionada(null);
          }}
        />
      )}

      {estado.resultado && !fimFechado && (
        <FimDePartida
          estado={estado}
          aoRevanche={reiniciar}
          aoNovaPartida={aoSair}
          aoFechar={() => setFimFechado(true)}
          novidades={online ? online.novidades : novidades}
          revanche={online ? { pedida: online.revanchePedida, minhaCor: corHumano! } : undefined}
        />
      )}
    </div>
  );
}

function Historico({ estado }: { estado: Estado }) {
  if (estado.historico.length === 0) return <p className="dica">Nenhum lance ainda.</p>;
  return (
    <ol className="historico">
      {estado.historico.map((r, i) => (
        <li key={i} className={`lance-${r.cor}`}>
          <span className="historico-numero">{numeroDoLance(i + 1)}.</span>
          <span className={`bolinha bolinha-${r.cor}`} aria-hidden="true" />
          {r.texto}
        </li>
      ))}
    </ol>
  );
}
