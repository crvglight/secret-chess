// Análise depois da partida: classifica cada jogada (melhor, bom, imprecisão, erro...),
// explica o que poderia ter sido diferente e olha para as cartas: o uso do poder,
// os momentos perdidos para usá-lo, o custo da desvantagem e as surpresas das cartas
// do adversário. Com a partida terminada, a análise vê as cartas dos dois lados.
import type { AcaoPartida } from "./protocolo.ts";
import { analisarJogadaFeita, melhorOpcao, NOTA_VITORIA, type OpcaoAnalisada } from "./ia/busca.ts";
import { obterCarta } from "./cartas/index.ts";
import { jogarCartaDaMao } from "./mao.ts";
import { aplicarLance, lancesLegais, passarVez, usarPoder } from "./regras.ts";
import type { Casa, Cor, Estado, Lance } from "./tipos.ts";

export type Classificacao = "brilhante" | "melhor" | "bom" | "imprecisao" | "erro" | "erro-grave";

export const NOME_CLASSIFICACAO: Record<Classificacao, string> = {
  brilhante: "Brilhante",
  melhor: "Melhor lance",
  bom: "Bom",
  imprecisao: "Imprecisão",
  erro: "Erro",
  "erro-grave": "Erro grave",
};

export const ORDEM_CLASSIFICACAO: Classificacao[] = ["brilhante", "melhor", "bom", "imprecisao", "erro", "erro-grave"];

/** Uma jogada completa: carta da mão e poder (se houver) e o lance. */
export interface Turno {
  cor: Cor;
  /** Estado antes da jogada e depois dela. */
  antes: Estado;
  depois: Estado;
  /** Índices na lista de estados da partida (a mesma de reconstruirPartida). */
  passoAntes: number;
  passoDepois: number;
  jogada: { carta: number | null; poder: { alvo: Casa | null } | null; lance: Lance };
}

export type TipoComentario = "melhor" | "poder" | "oportunidade" | "desvantagem" | "surpresa" | "carta-propria" | "mate";

export interface Comentario {
  tipo: TipoComentario;
  texto: string;
}

export interface JogadaAnalisada {
  /** Posição do turno na lista de turnos. */
  indice: number;
  cor: Cor;
  passoAntes: number;
  passoDepois: number;
  /** Número do lance (1, 2, 3...). */
  numero: number;
  texto: string;
  classificacao: Classificacao;
  /** Quanto a jogada ficou abaixo da melhor (centipeões, para quem jogou). */
  perda: number;
  /** Notas para quem jogou: a melhor possível e a da jogada feita. */
  notaMelhor: number;
  notaJogada: number;
  /** Avaliação da posição antes da jogada, do ponto de vista das brancas (para o gráfico). */
  avaliacaoBrancas: number;
  /** Precisão da jogada, de 0 a 100. */
  precisao: number;
  melhor: { texto: string; de: Casa; para: Casa; linha: string[] };
  jogouAMelhor: boolean;
  usouCarta: boolean;
  comentarios: Comentario[];
}

export interface ResumoLado {
  precisao: number;
  jogadas: number;
  contagem: Record<Classificacao, number>;
  poder: { usos: number; bons: number; ruins: number; oportunidadesPerdidas: number };
  /** Quantas vezes a desvantagem tirou um lance bom. */
  desvantagemPesou: number;
  /** Quantas vezes uma carta do adversário surpreendeu. */
  surpresas: number;
}

/** Diferenças (centipeões) que separam as classificações. */
const LIMITE = { melhor: 15, bom: 50, imprecisao: 120, erro: 300 };
/** Ganho que faz um uso de poder virar "brilhante" ou um momento perdido. */
const GANHO_PODER = 120;
const MATE = NOTA_VITORIA / 2;

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

/** Divide as ações em jogadas (carta + poder + lance) e refaz os estados. */
export function turnosDaPartida(inicial: Estado, acoes: readonly AcaoPartida[]): Turno[] {
  const turnos: Turno[] = [];
  let estado = inicial;
  let passo = 0;
  let aberto: { antes: Estado; passoAntes: number; carta: number | null; poder: { alvo: Casa | null } | null } | null = null;
  for (const a of acoes) {
    // Vez perdida (Multitasking): não é uma jogada para analisar.
    if (a.tipo === "passar") {
      try {
        estado = passarVez(estado);
      } catch {
        break;
      }
      passo++;
      aberto = null;
      continue;
    }
    if (!aberto) aberto = { antes: estado, passoAntes: passo, carta: null, poder: null };
    try {
      if (a.tipo === "carta") {
        aberto.carta = a.indice;
        estado = jogarCartaDaMao(estado, a.indice);
      } else if (a.tipo === "poder") {
        aberto.poder = { alvo: a.alvo };
        estado = usarPoder(estado, a.alvo);
      } else {
        estado = aplicarLance(estado, a.lance);
      }
    } catch {
      break; // ação que não vale mais (regra mudou numa versão nova)
    }
    passo++;
    if (a.tipo === "lance") {
      turnos.push({
        cor: aberto.antes.vez,
        antes: aberto.antes,
        depois: estado,
        passoAntes: aberto.passoAntes,
        passoDepois: passo,
        jogada: { carta: aberto.carta, poder: aberto.poder, lance: a.lance },
      });
      aberto = null;
    }
  }
  return turnos;
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

/** Nota em texto: "+1,3", "−0,4", "mate em 2", "leva mate em 3". */
export function textoNota(nota: number): string {
  if (nota > MATE) return `mate em ${Math.ceil((NOTA_VITORIA - nota) / 2)}`;
  if (nota < -MATE) return `leva mate em ${Math.ceil((NOTA_VITORIA + nota) / 2)}`;
  const v = (nota / 100).toFixed(1).replace(".", ",");
  return nota > 0 ? `+${v}` : nota < 0 ? v.replace("-", "−") : "0,0";
}

/** Nota limitada (mates viram ±2000) para conta de perda e precisão. */
const limitar = (nota: number) => Math.max(-2000, Math.min(2000, nota));

/** Chance de vitória (0–100) para uma nota em centipeões. */
const chance = (nota: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * limitar(nota))) - 1);

function precisaoDa(notaMelhor: number, notaJogada: number): number {
  const queda = Math.max(0, chance(notaMelhor) - chance(notaJogada));
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * queda) - 3.1669));
}

const nomeDaCarta = (id: string | null | undefined) => (id ? obterCarta(id).nome : "poder");

/** Qual poder a jogada usou (carta da mão ou o poder da partida). */
function poderUsado(antes: Estado, o: { carta: number | null }): string {
  if (o.carta !== null) return nomeDaCarta(antes.mao?.mao[antes.vez][o.carta]);
  return nomeDaCarta(antes.cartas[antes.vez].poder);
}

const sequencia = (linha: string[]) => (linha.length > 0 ? ` Continuação provável: ${linha.slice(0, 4).join(", ")}.` : "");

// ---------------------------------------------------------------------------
// Uma jogada
// ---------------------------------------------------------------------------

/** O mesmo estado sem a desvantagem de quem joga (para medir quanto ela custou). */
function semDesvantagem(estado: Estado): Estado {
  const cor = estado.vez;
  return {
    ...estado,
    cartas: { ...estado.cartas, [cor]: { ...estado.cartas[cor], desvantagem: null } },
    dadosCartas: { ...estado.dadosCartas, [cor]: { ...estado.dadosCartas[cor], desvantagem: {} } },
  };
}

const chaveLance = (l: Lance) => `${l.de}-${l.para}-${l.promocao ?? ""}`;

/** A desvantagem muda os lances possíveis nesta posição? (Só então vale medir o custo.) */
function desvantagemMudaLances(estado: Estado): boolean {
  if (!estado.cartas[estado.vez].desvantagem) return false;
  const com = new Set(lancesLegais(estado).map(chaveLance));
  const sem = lancesLegais(semDesvantagem(estado)).map(chaveLance);
  return sem.length !== com.size || sem.some((k) => !com.has(k));
}

/** Analisa um turno. `tempoMs` é o tempo de busca por posição. */
export function analisarTurno(turno: Turno, indice: number, tempoMs = 500): JogadaAnalisada {
  const { antes, depois, cor, jogada } = turno;
  const r = analisarJogadaFeita(antes, jogada, tempoMs);
  const usou = jogada.carta !== null || !!jogada.poder || !!jogada.lance.poder;
  // A melhor nunca fica abaixo da jogada feita (a jogada pode ter ficado fora das opções testadas).
  const notaMelhor = Math.max(r.melhor.nota, r.jogada.nota);
  const melhor: OpcaoAnalisada = r.jogada.nota > r.melhor.nota ? { ...r.melhor, nota: r.jogada.nota, texto: r.jogada.texto, lance: jogada.lance, linha: r.jogada.linha } : r.melhor;
  const perda = Math.max(0, limitar(notaMelhor) - limitar(r.jogada.nota));
  const jogouAMelhor = perda <= LIMITE.melhor;
  const comentarios: Comentario[] = [];

  let classificacao: Classificacao =
    perda <= LIMITE.melhor ? "melhor" : perda <= LIMITE.bom ? "bom" : perda <= LIMITE.imprecisao ? "imprecisao" : perda <= LIMITE.erro ? "erro" : "erro-grave";

  // Mate perdido / mate dado.
  if (notaMelhor > MATE && r.jogada.nota <= MATE) {
    comentarios.push({ tipo: "mate", texto: `Havia ${textoNota(notaMelhor)}: ${melhor.texto}.${sequencia(melhor.linha)}` });
    if (classificacao === "melhor" || classificacao === "bom") classificacao = "imprecisao";
  } else if (r.jogada.nota > MATE && depois.resultado?.motivo !== "xeque-mate") {
    comentarios.push({ tipo: "mate", texto: `Encaminhou ${textoNota(r.jogada.nota)}.` });
  }

  // Cartas: uso do poder e momentos perdidos.
  if (usou) {
    const nome = poderUsado(antes, jogada);
    const ganho = r.melhorSemCartas ? r.jogada.nota - r.melhorSemCartas.nota : 0;
    if (jogouAMelhor && r.melhorSemCartas && ganho >= GANHO_PODER) {
      classificacao = "brilhante";
      comentarios.push({ tipo: "poder", texto: `Ótimo uso de ${nome}: valeu ${textoNota(ganho).replace("+", "")} a mais que o melhor lance comum.` });
    } else if (perda > LIMITE.imprecisao) {
      const comum = r.melhorSemCartas && r.melhorSemCartas.nota >= r.jogada.nota + LIMITE.bom;
      comentarios.push({
        tipo: "poder",
        texto: comum
          ? `Usar ${nome} aqui não compensou: o lance comum ${r.melhorSemCartas!.texto} era melhor e ainda guardava a carta.`
          : `Usar ${nome} desse jeito não compensou.`,
      });
    } else if (r.melhorSemCartas && ganho < LIMITE.melhor && antes.cartas[cor].poder && jogada.carta === null) {
      comentarios.push({ tipo: "poder", texto: `${nome} não fez diferença aqui: dava para guardar o poder para um momento melhor.` });
    } else if (jogouAMelhor) {
      comentarios.push({ tipo: "poder", texto: `Bom momento para usar ${nome}.` });
    }
  } else if (r.melhorComCartas && r.melhorComCartas.nota - r.jogada.nota >= GANHO_PODER && r.melhorComCartas.nota >= notaMelhor - LIMITE.bom) {
    const nome = poderUsado(antes, r.melhorComCartas);
    comentarios.push({
      tipo: "oportunidade",
      texto: `Momento perdido para ${nome}: ${r.melhorComCartas.texto} (${textoNota(r.melhorComCartas.nota)}).${sequencia(r.melhorComCartas.linha)}`,
    });
  }

  // O que poderia ter sido diferente (quando não foi um lance bom e o comentário de cima não disse).
  if (perda > LIMITE.bom && !comentarios.some((c) => c.tipo === "mate" || c.tipo === "oportunidade")) {
    comentarios.push({ tipo: "melhor", texto: `Melhor era ${melhor.texto} (${textoNota(notaMelhor)}; a jogada feita ficou em ${textoNota(r.jogada.nota)}).${sequencia(melhor.linha)}` });
  }

  // Desvantagem: quanto ela custou nesta posição.
  const desvantagem = antes.cartas[cor].desvantagem;
  if (desvantagem && desvantagemMudaLances(antes)) {
    try {
      const livre = melhorOpcao(semDesvantagem(antes), tempoMs);
      const custo = limitar(livre.nota) - limitar(notaMelhor);
      if (custo >= 100) {
        comentarios.push({
          tipo: "desvantagem",
          texto: `${nomeDaCarta(desvantagem)} pesou aqui: sem ela, ${livre.texto} valeria ${textoNota(livre.nota)}.`,
        });
      }
    } catch {
      // Sem lances sem a desvantagem: nada a dizer.
    }
  }

  // Cartas que entraram em ação nesta jogada.
  for (const e of depois.eventos.slice(antes.eventos.length)) {
    if (e.texto.startsWith("Jogou a carta")) continue;
    const nome = nomeDaCarta(e.cartaId);
    if (e.cor !== cor) comentarios.push({ tipo: "surpresa", texto: `Surpresa do adversário — ${nome}: ${e.texto}` });
    else comentarios.push({ tipo: "carta-propria", texto: `Sua carta ${nome}: ${e.texto}` });
  }

  return {
    indice,
    cor,
    passoAntes: turno.passoAntes,
    passoDepois: turno.passoDepois,
    numero: Math.floor(antes.meioLance / 2) + 1,
    texto: r.jogada.texto,
    classificacao,
    perda,
    notaMelhor,
    notaJogada: r.jogada.nota,
    avaliacaoBrancas: cor === "brancas" ? notaMelhor : -notaMelhor,
    precisao: precisaoDa(notaMelhor, r.jogada.nota),
    melhor: { texto: melhor.texto, de: melhor.lance.de, para: melhor.lance.para, linha: melhor.linha },
    jogouAMelhor,
    usouCarta: usou,
    comentarios,
  };
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export function resumirLado(jogadas: readonly JogadaAnalisada[], cor: Cor): ResumoLado | null {
  const minhas = jogadas.filter((j) => j.cor === cor);
  if (minhas.length === 0) return null;
  const contagem = Object.fromEntries(ORDEM_CLASSIFICACAO.map((c) => [c, 0])) as Record<Classificacao, number>;
  for (const j of minhas) contagem[j.classificacao]++;
  const tem = (j: JogadaAnalisada, tipo: TipoComentario) => j.comentarios.some((c) => c.tipo === tipo);
  const usos = minhas.filter((j) => j.usouCarta);
  return {
    precisao: minhas.reduce((s, j) => s + j.precisao, 0) / minhas.length,
    jogadas: minhas.length,
    contagem,
    poder: {
      usos: usos.length,
      bons: usos.filter((j) => j.perda <= LIMITE.bom).length,
      ruins: usos.filter((j) => j.perda > LIMITE.imprecisao).length,
      oportunidadesPerdidas: minhas.filter((j) => tem(j, "oportunidade")).length,
    },
    desvantagemPesou: minhas.filter((j) => tem(j, "desvantagem")).length,
    surpresas: minhas.filter((j) => tem(j, "surpresa")).length,
  };
}

/** Os momentos que mais mudaram a partida (maiores perdas), na ordem em que aconteceram. */
export function momentosChave(jogadas: readonly JogadaAnalisada[], quantos = 3): JogadaAnalisada[] {
  return [...jogadas]
    .filter((j) => j.perda > LIMITE.bom)
    .sort((a, b) => b.perda - a.perda)
    .slice(0, quantos)
    .sort((a, b) => a.indice - b.indice);
}
