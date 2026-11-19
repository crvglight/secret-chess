import { alvosSugeridosParaIA, aplicarLance, cartasAbertas, aplicarLanceGerado, infoPoder, lancesLegais, usarPoder } from "../regras.ts";
import { corOposta, nomeCasa, pecaCapturada } from "../tabuleiro.ts";
import { obterCarta } from "../cartas/index.ts";
import { jogarCartaDaMao, travaDaMao } from "../mao.ts";
import type { Aleatorio } from "../sorteio.ts";
import type { Casa, Cor, Estado, Lance } from "../tipos.ts";
import { avaliar, VALOR_PECA } from "./avaliacao.ts";

export type NivelIA = "facil" | "medio" | "dificil";

export interface JogadaIA {
  /** Modo Mão de cartas: se não for null, jogue primeiro a carta com este índice da mão. */
  carta: number | null;
  /** Se não for null, use o poder (com este alvo) antes do lance. */
  poder: { alvo: Casa | null } | null;
  lance: Lance;
  /** Avaliação em centipeões para a IA (positivo = bom para ela). */
  avaliacao: number;
  profundidade: number;
}

interface ConfigNivel {
  profundidade: number;
  /** Profundidade máxima da busca só de capturas no fim da linha. */
  quiescencia: number;
  tempoMs: number;
  /** Escolhe ao acaso entre lances até esta distância do melhor. */
  folga: number;
  usaPoder: boolean;
}

export const NIVEIS: Record<NivelIA, ConfigNivel> = {
  facil: { profundidade: 1, quiescencia: 1, tempoMs: 500, folga: 150, usaPoder: false },
  medio: { profundidade: 3, quiescencia: 4, tempoMs: 1500, folga: 15, usaPoder: true },
  dificil: { profundidade: 4, quiescencia: 6, tempoMs: 4000, folga: 0, usaPoder: true },
};

/** Quanto o poder precisa melhorar a posição para valer a pena gastá-lo. */
const CUSTO_PODER = 60;
const VITORIA = 1_000_000;

class TempoEsgotado extends Error {
  constructor() {
    super("Tempo esgotado");
  }
}

/**
 * A IA só conhece as próprias cartas: as do adversário somem da cópia
 * que ela usa para pensar (o lance final sempre vem do estado real).
 */
export function ocultarCartasDe(estado: Estado, cor: Cor): Estado {
  // Desvantagem Espião: as cartas desse lado ficam abertas para o adversário.
  if (cartasAbertas(estado, cor)) return estado;
  return {
    ...estado,
    cartas: { ...estado.cartas, [cor]: { poder: null, desvantagem: null } },
    dadosCartas: { ...estado.dadosCartas, [cor]: { poder: {}, desvantagem: {} } },
    usosPoder: { ...estado.usosPoder, [cor]: 0 },
    ...(estado.mao
      ? {
          mao: {
            mao: { ...estado.mao.mao, [cor]: [] },
            baralho: { ...estado.mao.baralho, [cor]: [] },
            jogada: { ...estado.mao.jogada, [cor]: null },
          },
        }
      : {}),
  };
}

/** Capturas primeiro (vítima mais valiosa, atacante mais barato), depois promoções. */
function ordenar(estado: Estado, lances: Lance[]): Lance[] {
  const nota = (l: Lance) => {
    const vitima = pecaCapturada(estado, l);
    let n = 0;
    if (vitima) n += (vitima.tipo === "rei" ? 100_000 : VALOR_PECA[vitima.tipo] * 10) - VALOR_PECA[estado.tabuleiro[l.de]!.tipo];
    if (l.promocao) n += VALOR_PECA[l.promocao];
    return n;
  };
  return lances
    .map((l) => ({ l, n: nota(l) }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.l);
}

class Busca {
  nos = 0;
  /** Só depois da primeira profundidade completa o prazo pode interromper (senão não haveria jogada). */
  podeParar = false;
  constructor(
    private readonly config: ConfigNivel,
    private readonly prazo: number,
  ) {}

  private conferirTempo() {
    if (++this.nos % 256 === 0 && this.podeParar && Date.now() > this.prazo) throw new TempoEsgotado();
  }

  /** Nota de um estado já terminado, do ponto de vista de quem tem a vez nele. */
  private terminal(e: Estado, ply: number): number {
    const r = e.resultado!;
    if (r.vencedor === null) return 0;
    return r.vencedor === e.vez ? VITORIA - ply : -(VITORIA - ply);
  }

  /**
   * Valor de `filho` visto por quem jogava em `pai` (a vez pode continuar com o mesmo lado).
   * Se `linha` vier, recebe a continuação prevista (em texto) a partir de `filho`.
   */
  valorFilho(
    pai: Estado,
    filho: Estado,
    prof: number,
    alfa: number,
    beta: number,
    ply: number,
    linha: string[] | null = null,
  ): number {
    return filho.vez === pai.vez
      ? this.negamax(filho, prof, alfa, beta, ply, linha)
      : -this.negamax(filho, prof, -beta, -alfa, ply, linha);
  }

  negamax(e: Estado, prof: number, alfa: number, beta: number, ply: number, linha: string[] | null = null): number {
    this.conferirTempo();
    if (e.resultado) return this.terminal(e, ply);
    if (prof <= 0) return this.quiescencia(e, this.config.quiescencia, alfa, beta, ply);

    let melhor = -Infinity;
    const linhaFilho: string[] | null = linha ? [] : null;
    // Poderes só são considerados na raiz (montarOpcoes); aqui a busca ficaria cara demais.
    const legais = lancesLegais(e);
    const normais = legais.filter((l) => !l.poder);
    for (const l of ordenar(e, normais.length > 0 ? normais : legais)) {
      const filho = aplicarLanceGerado(e, l);
      if (linhaFilho) linhaFilho.length = 0;
      const v = this.valorFilho(e, filho, prof - 1, alfa, beta, ply + 1, linhaFilho);
      if (v > melhor) {
        melhor = v;
        if (linha) linha.splice(0, linha.length, filho.historico.at(-1)!.texto, ...linhaFilho!);
      }
      if (v > alfa) alfa = v;
      if (alfa >= beta) break;
    }
    return melhor;
  }

  /** Continua só com capturas, para não parar a conta no meio de uma troca. */
  private quiescencia(e: Estado, prof: number, alfa: number, beta: number, ply: number): number {
    this.conferirTempo();
    if (e.resultado) return this.terminal(e, ply);
    const parado = avaliar(e, e.vez);
    if (prof <= 0) return parado;
    if (parado >= beta) return parado;
    if (parado > alfa) alfa = parado;

    let melhor = parado;
    const capturas = lancesLegais(e).filter((l) => !l.poder && (pecaCapturada(e, l) || l.promocao));
    for (const l of ordenar(e, capturas)) {
      const filho = aplicarLanceGerado(e, l);
      const v =
        filho.vez === e.vez
          ? this.quiescencia(filho, prof - 1, alfa, beta, ply + 1)
          : -this.quiescencia(filho, prof - 1, -beta, -alfa, ply + 1);
      if (v > melhor) melhor = v;
      if (v > alfa) alfa = v;
      if (alfa >= beta) break;
    }
    return melhor;
  }
}

interface Opcao {
  /** Índice da carta da mão jogada antes (modo Mão de cartas). */
  carta: number | null;
  poder: { alvo: Casa | null } | null;
  /** Estado de onde o lance sai (depois do poder, se houver). */
  origem: Estado;
  lance: Lance;
  nota: number;
  /** Continuação prevista depois do lance (só preenchida quando a busca pede). */
  linha: string[];
}

/** Alvos de poder que valem a pena testar (limita o custo da busca). */
function alvosParaTestar(estado: Estado, cor: Cor, alvos: Casa[]): Casa[] {
  const sugeridos = alvosSugeridosParaIA(estado, cor);
  if (sugeridos) return sugeridos.filter((c) => alvos.includes(c));
  if (alvos.length <= 4) return alvos;
  // Muitos alvos (ex.: Escudo): só as peças próprias que o adversário pode capturar agora.
  const visao = ocultarCartasDe({ ...estado, vez: corOposta(cor) }, corOposta(cor));
  const atacadas = new Set(
    lancesLegais(visao)
      .map((l) => pecaCapturada(visao, l))
      .filter((p) => p && p.cor === cor)
      .map((p) => p!.id),
  );
  return alvos
    .filter((c) => {
      const p = estado.tabuleiro[c];
      return p && atacadas.has(p.id);
    })
    .sort((a, b) => VALOR_PECA[estado.tabuleiro[b]!.tipo] - VALOR_PECA[estado.tabuleiro[a]!.tipo])
    .slice(0, 3);
}

/** Quantos lances de poder (teleporte, troca...) a IA testa a fundo. */
const MAX_LANCES_DE_PODER = 12;

/** Opções que usam o poder em jogo (lances de poder, ou poder com alvo/imediato e depois um lance). */
function opcoesDoPoder(estado: Estado, carta: number | null): Opcao[] {
  const cor = estado.vez;
  const info = infoPoder(estado, cor);
  if (!info.disponivel) return [];
  const opcoes: Opcao[] = [];

  if (info.modo === "lance") {
    // Pode haver centenas: fica com os que melhoram mais a avaliação imediata.
    const melhores = lancesLegais(estado)
      .filter((l) => l.poder)
      .map((lance) => ({ lance, nota: avaliar(aplicarLanceGerado(estado, lance), cor) }))
      .sort((a, b) => b.nota - a.nota)
      .slice(0, MAX_LANCES_DE_PODER);
    for (const { lance } of melhores) opcoes.push({ carta, poder: null, origem: estado, lance, nota: 0, linha: [] });
    return opcoes;
  }

  const alvos = info.modo === "alvo" ? alvosParaTestar(estado, cor, info.alvos) : [null];
  for (const alvo of alvos) {
    const origem = usarPoder(estado, alvo);
    for (const lance of lancesLegais(origem)) {
      if (!lance.poder) opcoes.push({ carta, poder: { alvo }, origem, lance, nota: 0, linha: [] });
    }
  }
  return opcoes;
}

const chaveLance = (l: Lance) => `${l.de}-${l.para}-${l.promocao ?? ""}`;

function montarOpcoes(estado: Estado, config: ConfigNivel): Opcao[] {
  const opcoes: Opcao[] = lancesLegais(estado)
    .filter((l) => !l.poder)
    .map((lance) => ({ carta: null, poder: null, origem: estado, lance, nota: 0, linha: [] }));
  if (!config.usaPoder) return opcoes;
  opcoes.push(...opcoesDoPoder(estado, null));

  // Modo Mão de cartas: testa jogar cada carta da mão.
  if (estado.mao && !travaDaMao(estado)) {
    const normais = new Set(opcoes.filter((o) => !o.poder && !o.lance.poder).map((o) => chaveLance(o.lance)));
    estado.mao.mao[estado.vez].forEach((id, indice) => {
      const comCarta = jogarCartaDaMao(estado, indice);
      if (obterCarta(id).acaoAtiva) {
        opcoes.push(...opcoesDoPoder(comCarta, indice));
      } else {
        // Carta de efeito contínuo: só interessam os lances novos que ela libera.
        for (const lance of lancesLegais(comCarta)) {
          if (!lance.poder && !normais.has(chaveLance(lance))) {
            opcoes.push({ carta: indice, poder: null, origem: comCarta, lance, nota: 0, linha: [] });
          }
        }
      }
    });
  }
  return opcoes;
}

/**
 * Dá nota a todas as opções de quem tem a vez, da melhor para a pior.
 * As notas dentro de `config.folga` do melhor são exatas; as outras são só limites.
 */
function buscarOpcoes(
  estado: Estado,
  config: ConfigNivel,
  tempoMs: number,
  extras: {
    /** Monta a continuação prevista de cada opção (custa um pouco mais). */
    comLinha?: boolean;
    /** Chamado a cada profundidade completa, com as opções já ordenadas. */
    aoCompletar?(opcoes: Opcao[], profundidade: number): void;
    /** Quanto descontar das opções que gastam carta ou poder (padrão: CUSTO_PODER). */
    custoPoder?: number;
    /** Pensa com as cartas dos dois lados à mostra (análise depois da partida). */
    verTudo?: boolean;
  } = {},
): { opcoes: Opcao[]; profundidade: number } {
  if (estado.resultado) throw new Error("A partida já terminou");
  const cor = estado.vez;
  const busca = new Busca(config, Date.now() + tempoMs);

  let opcoes = montarOpcoes(estado, config);
  if (opcoes.length === 0) throw new Error("Sem lances legais");

  let profundidadeFeita = 0;
  // Aprofundamento iterativo: se o tempo acabar, fica com a última profundidade completa.
  for (let prof = 1; prof <= config.profundidade; prof++) {
    try {
      let alfa = -Infinity;
      const resultados = opcoes.map((op) => {
        const base = extras.verTudo ? op.origem : ocultarCartasDe(op.origem, corOposta(cor));
        const filho = aplicarLanceGerado(base, op.lance);
        const linha: string[] | null = extras.comLinha ? [] : null;
        // A janela começa logo abaixo de `melhor - folga`: toda nota que fica dentro da folga
        // é exata; as de fora são só limites (por isso o "- 1", para um limite não empatar com o melhor).
        const custo = op.carta !== null || op.poder || op.lance.poder ? (extras.custoPoder ?? CUSTO_PODER) : 0;
        const v =
          busca.valorFilho(op.origem, filho, prof - 1, alfa - config.folga + custo - 1, Infinity, 1, linha) - custo;
        if (v > alfa) alfa = v;
        return { nota: v, linha: linha ?? [] };
      });
      opcoes = opcoes.map((op, i) => ({ ...op, ...resultados[i]! })).sort((a, b) => b.nota - a.nota);
      profundidadeFeita = prof;
      busca.podeParar = true;
      extras.aoCompletar?.(opcoes, prof);
    } catch (erro) {
      if (erro instanceof TempoEsgotado) break;
      throw erro;
    }
  }
  return { opcoes, profundidade: profundidadeFeita };
}

/** Escolhe a jogada da IA para quem tem a vez em `estado`. */
export function escolherJogada(
  estado: Estado,
  nivel: NivelIA,
  opcoesExtras: { rng?: Aleatorio; tempoMs?: number } = {},
): JogadaIA {
  const config = NIVEIS[nivel];
  const rng = opcoesExtras.rng ?? Math.random;
  const { opcoes, profundidade: profundidadeFeita } = buscarOpcoes(
    estado,
    config,
    opcoesExtras.tempoMs ?? config.tempoMs,
  );

  const melhor = opcoes[0]!.nota;
  // Com mate à vista não há sorteio: vai no mate mais rápido (a folga faria um
  // "mate em 2" empatar com o "mate em 1").
  const folga = melhor > VITORIA / 2 ? 0 : config.folga;
  const candidatas = opcoes.filter((op) => op.nota >= melhor - folga);
  const escolhida = candidatas[Math.floor(rng() * candidatas.length)]!;
  return {
    carta: escolhida.carta,
    poder: escolhida.poder,
    lance: escolhida.lance,
    avaliacao: escolhida.nota,
    profundidade: profundidadeFeita,
  };
}

/** Configuração do analisador: mais fundo que o difícil e com notas exatas num leque largo. */
const ANALISE: ConfigNivel = { profundidade: 6, quiescencia: 6, tempoMs: 4000, folga: 500, usaPoder: true };

export interface LanceAnalisado {
  carta: number | null;
  poder: { alvo: Casa | null } | null;
  lance: Lance;
  /** Centipeões do ponto de vista de quem tem a vez (positivo = bom para ele). */
  avaliacao: number;
  /** A sequência mais provável depois do lance, em texto (ex.: ["e7-e5", "Cg1-f3"]). */
  linha: string[];
}

export interface Analise {
  profundidade: number;
  lances: LanceAnalisado[];
}

/** Texto curto de uma jogada (com a carta da mão e o poder, se houver). */
export function textoJogada(
  estado: Estado,
  poder: { alvo: Casa | null } | null,
  lance: Lance,
  carta: number | null = null,
): string {
  const comCarta = carta === null ? estado : jogarCartaDaMao(estado, carta);
  const antes = poder ? usarPoder(comCarta, poder.alvo) : comCarta;
  const depois = aplicarLanceGerado(antes, lance);
  let texto = depois.historico.at(-1)!.texto;
  if (poder) texto = poder.alvo === null ? `poder + ${texto}` : `poder em ${nomeCasa(poder.alvo)} + ${texto}`;
  if (carta !== null) texto = `${obterCarta(estado.mao!.mao[estado.vez][carta]!).nome}: ${texto}`;
  return texto;
}

/** Aplica uma jogada completa (carta da mão, poder e lance) e devolve o estado novo. */
export function executarJogada(estado: Estado, j: Pick<JogadaIA, "carta" | "poder" | "lance">): Estado {
  const comCarta = j.carta === null ? estado : jogarCartaDaMao(estado, j.carta);
  const antes = j.poder ? usarPoder(comCarta, j.poder.alvo) : comCarta;
  return aplicarLance(antes, j.lance);
}

function montarAnalise(opcoes: Opcao[], profundidade: number, quantidade: number): Analise {
  const melhor = opcoes[0]!.nota;
  const lances = opcoes
    .filter((op) => op.nota >= melhor - ANALISE.folga)
    .slice(0, quantidade)
    // `linha` é a continuação prevista depois do lance da opção.
    .map((op) => ({ carta: op.carta, poder: op.poder, lance: op.lance, avaliacao: op.nota, linha: op.linha }));
  return { profundidade, lances };
}

/**
 * Analisa a posição para quem tem a vez: as `quantidade` melhores jogadas,
 * cada uma com a nota e a continuação prevista. Usa só as cartas de quem joga
 * (a continuação não enxerga as cartas do adversário, então não entrega segredos).
 */
export function analisarPosicao(estado: Estado, opcoes: { tempoMs?: number; quantidade?: number } = {}): Analise {
  const { tempoMs = ANALISE.tempoMs, quantidade = 5 } = opcoes;
  const { opcoes: todas, profundidade } = buscarOpcoes(estado, ANALISE, tempoMs, { comLinha: true });
  return montarAnalise(todas, profundidade, quantidade);
}

/**
 * Análise ao vivo: vai aprofundando sem parar e chama `aoAtualizar` a cada
 * profundidade completa (como a análise infinita do Stockfish). Termina ao chegar
 * em `profundidadeMax` ou `tempoMaxMs`; para parar antes, encerre o Web Worker.
 */
export function analisarAoVivo(
  estado: Estado,
  aoAtualizar: (analise: Analise) => void,
  opcoes: { quantidade?: number; profundidadeMax?: number; tempoMaxMs?: number } = {},
): void {
  const { quantidade = 5, profundidadeMax = 30, tempoMaxMs = 10 * 60_000 } = opcoes;
  buscarOpcoes(estado, { ...ANALISE, profundidade: profundidadeMax }, tempoMaxMs, {
    comLinha: true,
    aoCompletar: (todas, profundidade) => aoAtualizar(montarAnalise(todas, profundidade, quantidade)),
  });
}

// ---------------------------------------------------------------------------
// Análise depois da partida
// ---------------------------------------------------------------------------

/** Pensa um pouco mais raso que o difícil (são muitas posições), com todas as cartas à mostra. */
const POS_JOGO: ConfigNivel = { profundidade: 3, quiescencia: 4, tempoMs: 500, folga: 300, usaPoder: true };

export interface OpcaoAnalisada {
  carta: number | null;
  poder: { alvo: Casa | null } | null;
  lance: Lance;
  /** Centipeões para quem jogou (acima de VITORIA / 2 = mate). */
  nota: number;
  texto: string;
  linha: string[];
}

export interface ResultadoJogadaFeita {
  profundidade: number;
  /** A melhor opção da posição (com ou sem cartas). */
  melhor: OpcaoAnalisada;
  /** A melhor opção sem gastar carta nem poder (null se toda opção usa carta). */
  melhorSemCartas: OpcaoAnalisada | null;
  /** A melhor opção que usa carta da mão ou poder (null se não havia). */
  melhorComCartas: OpcaoAnalisada | null;
  /** Nota exata (mesma profundidade) do que foi jogado. */
  jogada: { nota: number; texto: string; linha: string[] };
}

export const NOTA_VITORIA = VITORIA;

/** Acha o lance legal igual ao gravado (o online não grava o tipo especial do lance). */
function lanceLegalIgual(estado: Estado, lance: Lance): Lance {
  const legais = lancesLegais(estado);
  const igual = (l: Lance, promocao: Lance["promocao"]) =>
    l.de === lance.de && l.para === lance.para && (l.promocao ?? null) === (promocao ?? null) && (l.poder ?? null) === (lance.poder ?? null);
  const achado = legais.find((l) => igual(l, lance.promocao)) ?? legais.find((l) => igual(l, "dama"));
  if (!achado) throw new Error(`Lance ilegal: ${nomeCasa(lance.de)}-${nomeCasa(lance.para)}`);
  return achado;
}

const usaCarta = (o: { carta: number | null; poder: unknown; lance: Lance }) => o.carta !== null || !!o.poder || !!o.lance.poder;

/**
 * Analisa uma jogada já feita em `estado` (a posição antes dela): a melhor opção
 * que havia e a nota exata do que foi jogado, as duas na mesma profundidade.
 * As cartas dos dois lados ficam à mostra (a partida já acabou).
 */
export function analisarJogadaFeita(
  estado: Estado,
  jogada: Pick<JogadaIA, "carta" | "poder" | "lance">,
  tempoMs = POS_JOGO.tempoMs,
): ResultadoJogadaFeita {
  const { opcoes, profundidade } = buscarOpcoes(estado, POS_JOGO, tempoMs, { comLinha: true, custoPoder: 0, verTudo: true });
  const analisada = (op: Opcao): OpcaoAnalisada => ({
    carta: op.carta,
    poder: op.poder,
    lance: op.lance,
    nota: op.nota,
    texto: textoJogada(estado, op.poder, op.lance, op.carta),
    linha: op.linha,
  });
  const semCartas = opcoes.find((o) => !usaCarta(o));
  const comCartas = opcoes.find((o) => usaCarta(o));

  // A jogada feita, avaliada até a mesma profundidade e sem janela (nota exata).
  const comCarta = jogada.carta === null ? estado : jogarCartaDaMao(estado, jogada.carta);
  const antes = jogada.poder ? usarPoder(comCarta, jogada.poder.alvo) : comCarta;
  const lance = lanceLegalIgual(antes, jogada.lance);
  const filho = aplicarLanceGerado(antes, lance);
  const linha: string[] = [];
  const nota = new Busca(POS_JOGO, Infinity).valorFilho(antes, filho, Math.max(0, profundidade - 1), -Infinity, Infinity, 1, linha);

  return {
    profundidade,
    melhor: analisada(opcoes[0]!),
    melhorSemCartas: semCartas ? analisada(semCartas) : null,
    melhorComCartas: comCartas ? analisada(comCartas) : null,
    jogada: { nota, texto: textoJogada(estado, jogada.poder, lance, jogada.carta), linha },
  };
}

/** Só a melhor opção da posição (usada para medir o custo de uma desvantagem). */
export function melhorOpcao(estado: Estado, tempoMs = POS_JOGO.tempoMs): OpcaoAnalisada {
  const { opcoes } = buscarOpcoes(estado, POS_JOGO, tempoMs, { comLinha: true, custoPoder: 0, verTudo: true });
  const op = opcoes[0]!;
  return { carta: op.carta, poder: op.poder, lance: op.lance, nota: op.nota, texto: textoJogada(estado, op.poder, op.lance, op.carta), linha: op.linha };
}
