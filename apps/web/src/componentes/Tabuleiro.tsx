import { useEffect, useId, useRef, useState } from "react";
import {
  casa,
  coluna,
  fileira,
  type Casa,
  type CasaEspecial,
  type Cor,
  type Estado,
  type Lance,
  type Peca,
  type Espiada,
  type Raridade,
  type TipoPeca,
} from "@xadrez/engine";
import { DesenhoCasa } from "./IconeCasa.tsx";
import { useVisual } from "../visual.tsx";
import { PecaSvg } from "./PecaSvg.tsx";

const LADO = 100;

interface Props {
  estado: Estado;
  orientacao: Cor;
  selecionada: Casa | null;
  destinos: Lance[];
  /** Casas que podem receber o poder (modo "Usar poder"). */
  alvosPoder: Casa[] | null;
  /** Casas marcadas pelas cartas (peça protegida, congelada, armadilha...). */
  destaques: { casa: Casa; rotulo: string; estilo?: "contorno" }[];
  /** Setas das melhores jogadas (painel de análise, só no modo de desenvolvimento). */
  setasAnalise?: { de: Casa; para: Casa }[];
  /** Setas laranja fixas (ex.: o lance jogado, na análise da partida). */
  setasFixas?: { de: Casa; para: Casa }[];
  /** Casa do rei em xeque (fica vermelha). */
  reiEmXeque?: Casa | null;
  /** Casas especiais (portal, lama, baú, muralha). */
  casasEspeciais?: CasaEspecial[];
  /** Peças que devem aparecer com outro tipo (carta Ilusão). */
  disfarces?: ReadonlyMap<Casa, TipoPeca>;
  /** Peças na névoa para quem está olhando: aparecem como "?" (casa especial Névoa). */
  misteriosas?: ReadonlySet<Casa>;
  /** Caronas (poder Yuumi): casa da peça de baixo → a peça que está em cima (é ela que anda). */
  montadas?: ReadonlyMap<Casa, Peca>;
  /** Desenha todas as peças desta cor (poder Daltônico em uso). */
  corUnica?: Cor;
  /** Caixas de airdrop no tabuleiro (só a raridade aparece). */
  caixas?: { casa: Casa; raridade: Raridade }[];
  /** Avisa quando as setas e marcações (botão direito) mudam (poder Wallhack do adversário). */
  aoMudarAnotacoes?(setas: { de: Casa; para: Casa }[], marcas: Casa[]): void;
  /** Wallhack: o que o adversário está olhando (desenhado em roxo). */
  espiada?: Espiada | null;
  podeArrastar(casa: Casa): boolean;
  aoTocarCasa(casa: Casa): void;
  aoSoltar(de: Casa, para: Casa): void;
}

interface Arraste {
  de: Casa;
  x: number;
  y: number;
  moveu: boolean;
}

/** Seta de análise desenhada com o botão direito. */
interface Seta {
  de: Casa;
  para: Casa;
}

const BOTAO_ESQUERDO = 0;
const BOTAO_DIREITO = 2;

export function Tabuleiro(props: Props) {
  const { estado, orientacao, selecionada, destinos, alvosPoder } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const [setas, setSetas] = useState<Seta[]>([]);
  const [marcas, setMarcas] = useState<Casa[]>([]);
  const aoMudarAnotacoes = props.aoMudarAnotacoes;
  useEffect(() => {
    aoMudarAnotacoes?.(setas, marcas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setas, marcas]);
  const [desenho, setDesenho] = useState<Seta | null>(null);
  // A peça solta pelo arrasto não desliza de novo da casa de origem.
  const [semAnimacao, setSemAnimacao] = useState<number | null>(null);
  const { visual } = useVisual();

  const posicao = (c: Casa) =>
    orientacao === "brancas"
      ? { x: coluna(c) * LADO, y: (7 - fileira(c)) * LADO }
      : { x: (7 - coluna(c)) * LADO, y: fileira(c) * LADO };

  function pontoSvg(ev: React.PointerEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function casaNoPonto(x: number, y: number): Casa | null {
    if (x < 0 || y < 0 || x >= 8 * LADO || y >= 8 * LADO) return null;
    const cx = Math.floor(x / LADO);
    const cy = Math.floor(y / LADO);
    return orientacao === "brancas" ? casa(cx, 7 - cy) : casa(7 - cx, cy);
  }

  function aoApertar(ev: React.PointerEvent<SVGSVGElement>) {
    const { x, y } = pontoSvg(ev);
    const c = casaNoPonto(x, y);
    if (c === null) return;
    if (ev.button === BOTAO_DIREITO) {
      ev.currentTarget.setPointerCapture(ev.pointerId);
      setDesenho({ de: c, para: c });
      return;
    }
    if (ev.button !== BOTAO_ESQUERDO) return;
    setSetas([]);
    setMarcas([]);
    setSemAnimacao(null);
    const arrastavel = props.podeArrastar(c);
    props.aoTocarCasa(c);
    if (arrastavel) {
      ev.currentTarget.setPointerCapture(ev.pointerId);
      setArraste({ de: c, x, y, moveu: false });
    }
  }

  function aoMover(ev: React.PointerEvent) {
    if (desenho) {
      const { x, y } = pontoSvg(ev);
      const c = casaNoPonto(x, y);
      if (c !== null && c !== desenho.para) setDesenho({ ...desenho, para: c });
      return;
    }
    if (!arraste) return;
    const { x, y } = pontoSvg(ev);
    const moveu = arraste.moveu || Math.hypot(x - arraste.x, y - arraste.y) > 8;
    setArraste({ ...arraste, x, y, moveu });
  }

  function aoLargar(ev: React.PointerEvent) {
    if (desenho) {
      const { de, para } = desenho;
      setDesenho(null);
      // Desenhar de novo a mesma seta ou marca apaga.
      if (de === para) {
        setMarcas((m) => (m.includes(de) ? m.filter((c) => c !== de) : [...m, de]));
      } else {
        setSetas((s) =>
          s.some((a) => a.de === de && a.para === para)
            ? s.filter((a) => a.de !== de || a.para !== para)
            : [...s, { de, para }],
        );
      }
      return;
    }
    if (!arraste) return;
    const { x, y } = pontoSvg(ev);
    const para = casaNoPonto(x, y);
    setArraste(null);
    if (arraste.moveu && para !== null && para !== arraste.de) {
      setSemAnimacao(estado.tabuleiro[arraste.de]?.id ?? null);
      props.aoSoltar(arraste.de, para);
    }
  }

  const ultimo = estado.historico.at(-1)?.lance;
  const casas = Array.from({ length: 64 }, (_, i) => i);

  return (
    <svg
      ref={svgRef}
      className="tabuleiro"
      viewBox={`0 0 ${8 * LADO} ${8 * LADO}`}
      onPointerDown={aoApertar}
      onPointerMove={aoMover}
      onPointerUp={aoLargar}
      onPointerCancel={() => {
        setArraste(null);
        setDesenho(null);
      }}
      onContextMenu={(ev) => ev.preventDefault()}
      role="grid"
      aria-label="Tabuleiro"
    >
      <defs>
        <marker id="ponta-seta" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="ponta-seta" />
        </marker>
        <marker id="ponta-seta-ia" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="ponta-seta-ia" />
        </marker>
        <marker id="ponta-seta-espiada" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="ponta-seta-espiada" />
        </marker>
      </defs>
      {casas.map((c) => {
        const { x, y } = posicao(c);
        const clara = (coluna(c) + fileira(c)) % 2 === 1;
        const classes = [
          "casa",
          clara ? "casa-clara" : "casa-escura",
          visual.ultimoLance && ultimo && (ultimo.de === c || ultimo.para === c) ? "casa-ultimo" : "",
          selecionada === c ? "casa-selecionada" : "",
          props.reiEmXeque === c ? "casa-xeque" : "",
        ].join(" ");
        return <rect key={c} className={classes} x={x} y={y} width={LADO} height={LADO} />;
      })}

      <Texturas />

      {props.casasEspeciais?.map((e) => {
        const { x, y } = posicao(e.casa);
        return (
          <g key={`casa-${e.casa}`} transform={`translate(${x + 12} ${y + 12}) scale(0.76)`} aria-hidden="true">
            <DesenhoCasa tipo={e.tipo} direcao={e.direcao} />
          </g>
        );
      })}

      {props.caixas?.map((cx) => {
        const { x, y } = posicao(cx.casa);
        return (
          <g key={`caixa-${cx.casa}`} transform={`translate(${x} ${y})`} aria-label={`Caixa ${cx.raridade}`}>
            <DesenhoCaixa raridade={cx.raridade} />
          </g>
        );
      })}

      {visual.coordenadas && <Coordenadas orientacao={orientacao} />}

      {alvosPoder?.map((c) => {
        const { x, y } = posicao(c);
        return <rect key={`alvo-${c}`} className="alvo-poder" x={x + 4} y={y + 4} width={LADO - 8} height={LADO - 8} rx={10} />;
      })}

      {props.destaques.map((d) => {
        const { x, y } = posicao(d.casa);
        if (d.estilo === "contorno") {
          return <rect key={`dest-${d.casa}-${d.rotulo}`} className="contorno-cinza" x={x + 4} y={y + 4} width={LADO - 8} height={LADO - 8} rx={10} aria-label={d.rotulo} />;
        }
        return (
          <g key={`dest-${d.casa}-${d.rotulo}`} className="destaque-carta" aria-label={`${d.rotulo}`}>
            <rect x={x + 3} y={y + 3} width={LADO - 6} height={LADO - 6} rx={8} />
            <text x={x + LADO / 2} y={y + LADO - 8} textAnchor="middle">
              {d.rotulo}
            </text>
          </g>
        );
      })}

      {estado.tabuleiro.map((p, c) => {
        if (!p) return null;
        const { x, y } = posicao(c);
        const arrastando = arraste?.moveu && arraste.de === c;
        return (
          <g
            key={p.id}
            className={`peca-no-tabuleiro ${p.id === semAnimacao ? "sem-animacao" : ""}`}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            opacity={arrastando ? 0.3 : 1}
          >
            {(() => {
              const base = props.misteriosas?.has(c) ? (
                <PecaMisteriosa cor={p.cor} />
              ) : (
                <PecaSvg tipo={props.disfarces?.get(c) ?? p.tipo} cor={props.corUnica ?? p.cor} />
              );
              const cima = props.montadas?.get(c);
              if (!cima) return base;
              // Carona: a de baixo um pouco menor embaixo à esquerda, a de cima no canto de cima.
              return (
                <>
                  <g transform="translate(0 16) scale(0.78)">{base}</g>
                  <g className="peca-carona" transform="translate(46 -2) scale(0.56)">
                    <circle cx="50" cy="50" r="46" className="aro-carona" />
                    <PecaSvg tipo={cima.tipo} cor={props.corUnica ?? cima.cor} />
                  </g>
                </>
              );
            })()}
          </g>
        );
      })}

      {visual.lancesPossiveis &&
        destinos.map((l) => {
        const { x, y } = posicao(l.para);
        const captura = estado.tabuleiro[l.para] || l.especial === "en-passant";
        if (l.montada === "montar") {
          return <circle key={`d-${l.para}-carona`} className="marca-carona" cx={x + 50} cy={y + 50} r={40} />;
        }
        return captura ? (
          <circle key={`d-${l.para}-${l.promocao ?? ""}`} className="marca-captura" cx={x + 50} cy={y + 50} r={44} />
        ) : (
          <circle key={`d-${l.para}-${l.promocao ?? ""}`} className="marca-lance" cx={x + 50} cy={y + 50} r={15} />
        );
      })}

      {props.espiada && (
        <g className="espiada" aria-hidden="true">
          {props.espiada.selecionada !== null &&
            (() => {
              const { x, y } = posicao(props.espiada.selecionada);
              return <rect className="casa-espiada" x={x + 3} y={y + 3} width={LADO - 6} height={LADO - 6} rx={8} />;
            })()}
          {props.espiada.marcas.map((c) => {
            const { x, y } = posicao(c);
            return <circle key={`em-${c}`} className="marca-espiada" cx={x + 50} cy={y + 50} r={44} />;
          })}
          {props.espiada.setas.map((s, i) => (
            <polyline key={`es-${s.de}-${s.para}-${i}`} className="seta-espiada" points={pontosSeta(posicao(s.de), posicao(s.para))} markerEnd="url(#ponta-seta-espiada)" />
          ))}
        </g>
      )}

      <g className="anotacoes" aria-hidden="true">
        {props.setasAnalise?.map((s, i) => (
          <polyline
            key={`ia-${s.de}-${s.para}`}
            className="seta-ia"
            opacity={i === 0 ? 0.9 : 0.45}
            points={pontosSeta(posicao(s.de), posicao(s.para))}
            markerEnd="url(#ponta-seta-ia)"
          />
        ))}
        {marcas.map((c) => {
          const { x, y } = posicao(c);
          return <circle key={`m-${c}`} className="marca-analise" cx={x + 50} cy={y + 50} r={44} />;
        })}
        {[...(props.setasFixas ?? []), ...setas, ...(desenho && desenho.de !== desenho.para ? [desenho] : [])].map((s, i) => (
          <polyline
            key={`s-${s.de}-${s.para}-${i}`}
            className="seta-analise"
            points={pontosSeta(posicao(s.de), posicao(s.para))}
            markerEnd="url(#ponta-seta)"
          />
        ))}
      </g>

      {arraste?.moveu &&
        (() => {
          // Na casa de uma carona, quem sai arrastada é a peça de cima.
          const p = props.montadas?.get(arraste.de) ?? estado.tabuleiro[arraste.de];
          return p ? (
            <g transform={`translate(${arraste.x - 50} ${arraste.y - 55})`} className="peca-arrastada">
              <PecaSvg tipo={p.tipo} cor={p.cor} />
            </g>
          ) : null;
        })()}
    </svg>
  );
}

/**
 * Pontos da seta entre os centros de duas casas. Lance de cavalo vira seta em L
 * (primeiro o lado maior). A ponta (marker) é acrescentada depois do último ponto.
 */
function pontosSeta(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const inicio = { x: a.x + LADO / 2, y: a.y + LADO / 2 };
  const fim = { x: b.x + LADO / 2, y: b.y + LADO / 2 };
  const dx = Math.abs(fim.x - inicio.x) / LADO;
  const dy = Math.abs(fim.y - inicio.y) / LADO;
  const emL = (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
  const pontos = emL
    ? [inicio, dx > dy ? { x: fim.x, y: inicio.y } : { x: inicio.x, y: fim.y }, fim]
    : [inicio, fim];

  // Afasta o começo do centro da casa e recua o fim para a ponta terminar perto do centro.
  const recuar = (de: { x: number; y: number }, para: { x: number; y: number }, d: number) => {
    const len = Math.hypot(para.x - de.x, para.y - de.y);
    return { x: de.x + ((para.x - de.x) * d) / len, y: de.y + ((para.y - de.y) * d) / len };
  };
  const n = pontos.length;
  pontos[0] = recuar(pontos[0]!, pontos[1]!, 28);
  pontos[n - 1] = recuar(pontos[n - 1]!, pontos[n - 2]!, 40);
  return pontos.map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Textura de cada tema por cima das casas (veios, ondas, rachaduras, hachuras, cristais, grade).
 * O CSS mostra só a do tema atual (data-tabuleiro no <html>).
 */
function Texturas() {
  const id = useId().replace(/:/g, "");
  const tamanho = 8 * LADO;
  return (
    <g className="texturas" aria-hidden="true">
      <defs>
        <pattern id={`${id}-madeira`} width={tamanho} height="60" patternUnits="userSpaceOnUse">
          <path
            d="M0 12 C 200 4, 400 22, 800 10 M0 34 C 250 44, 500 26, 800 38 M0 52 C 300 46, 520 58, 800 50"
            fill="none"
            stroke="rgba(70, 35, 10, 0.12)"
            strokeWidth="3"
          />
        </pattern>
        <pattern id={`${id}-marmore`} width="400" height="400" patternUnits="userSpaceOnUse">
          <path
            d="M-20 60 C 80 20, 140 140, 260 90 S 380 160, 420 120 M40 420 C 90 300, 200 330, 230 220 S 330 120, 420 60 M-10 300 C 60 260, 120 280, 170 240"
            fill="none"
            stroke="rgba(70, 80, 95, 0.2)"
            strokeWidth="2.5"
          />
        </pattern>
        <pattern id={`${id}-oceano`} width="200" height="50" patternUnits="userSpaceOnUse">
          <path
            d="M0 25 C 25 10, 50 10, 75 25 S 125 40, 150 25 S 200 10, 225 25"
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="3"
          />
        </pattern>
        <pattern id={`${id}-lava`} width="400" height="400" patternUnits="userSpaceOnUse">
          <path
            d="M0 80 L60 110 L90 90 L160 140 L210 120 L260 170 L330 150 L400 190 M120 400 L150 330 L130 280 L180 230 L170 170 M300 0 L280 60 L320 110 L300 160 M0 300 L50 280 L90 320 L140 300"
            fill="none"
            stroke="rgba(255, 120, 30, 0.55)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </pattern>
        <pattern id={`${id}-papel`} width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M-2 16 L16 -2" stroke="rgba(40, 40, 60, 0.14)" strokeWidth="1.5" />
        </pattern>
        <pattern id={`${id}-gelo`} width="160" height="160" patternUnits="userSpaceOnUse">
          <path
            d="M40 40 l20 20 m-20 0 l20 -20 m-10 -4 v28 m-14 -14 h28 M120 110 l14 14 m-14 0 l14 -14 m-7 -3 v20 m-10 -10 h20"
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1.5"
          />
        </pattern>
        <pattern id={`${id}-neon`} width={LADO} height={LADO} patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width={LADO - 2} height={LADO - 2} fill="none" stroke="rgba(0, 240, 255, 0.35)" strokeWidth="2" />
        </pattern>
      </defs>
      {(["madeira", "marmore", "neon", "oceano", "lava", "papel", "gelo"] as const).map((tema) => (
        <rect key={tema} className={`textura textura-${tema}`} width={tamanho} height={tamanho} fill={`url(#${id}-${tema})`} />
      ))}
    </g>
  );
}

function Coordenadas({ orientacao }: { orientacao: Cor }) {
  const colunas = "abcdefgh".split("");
  const ordemCol = orientacao === "brancas" ? colunas : [...colunas].reverse();
  const ordemFil = orientacao === "brancas" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <g className="coordenadas" aria-hidden="true">
      {ordemCol.map((letra, i) => (
        <text key={letra} x={i * LADO + LADO - 6} y={8 * LADO - 6} textAnchor="end">
          {letra}
        </text>
      ))}
      {ordemFil.map((n, i) => (
        <text key={n} x={6} y={i * LADO + 20}>
          {n}
        </text>
      ))}
    </g>
  );
}

/** Peça na névoa: o adversário vê que há uma peça, na cor dela, mas não qual. */
function PecaMisteriosa({ cor }: { cor: Cor }) {
  return (
    <g className={`peca peca-${cor} peca-misteriosa`} aria-label="Peça escondida na névoa">
      <circle cx={50} cy={52} r={32} strokeWidth={3} />
      <text x={50} y={66} textAnchor="middle">
        ?
      </text>
    </g>
  );
}

const COR_CAIXA: Record<Raridade, { corpo: string; borda: string }> = {
  comum: { corpo: "#a3a8ae", borda: "#4b4f55" },
  rara: { corpo: "#4f9be0", borda: "#1d4f80" },
  lendaria: { corpo: "#f2c94c", borda: "#8a6a12" },
};

/** Caixa de airdrop (paraquedas + caixote) num quadro de 100 x 100. */
export function DesenhoCaixa({ raridade }: { raridade: Raridade }) {
  const { corpo, borda } = COR_CAIXA[raridade];
  return (
    <g className={`caixa-airdrop caixa-${raridade}`}>
      {/* Paraquedas */}
      <path d="M26 30 C 30 10, 70 10, 74 30 Z" fill="#f1f1f1" stroke={borda} strokeWidth="2" opacity="0.9" />
      <path d="M28 30 L42 52 M50 30 L50 52 M72 30 L58 52" stroke={borda} strokeWidth="1.5" />
      {/* Caixote */}
      <rect x="30" y="50" width="40" height="34" rx="4" fill={corpo} stroke={borda} strokeWidth="3" />
      <path d="M30 62 H70 M50 50 V84" stroke={borda} strokeWidth="2.5" />
      <text x="50" y="80" textAnchor="middle" fontSize="16" fontWeight="800" fill={borda}>
        ?
      </text>
    </g>
  );
}
