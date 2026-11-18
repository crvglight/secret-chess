// Casas especiais (opção de partida, vale em qualquer modo). Cada partida sorteia
// alguns tipos; as casas ficam na metade das brancas e são espelhadas (giro de 180°)
// na das pretas, então os dois lados têm as mesmas chances.
import { MAO_MAXIMA } from "./mao.ts";
import { VIZINHOS } from "./movimentos.ts";
import type { Aleatorio } from "./sorteio.ts";
import { casa, coluna, dentro, fileira, NOME_PECA, nomeCasa, ultimaFileira } from "./tabuleiro.ts";
import type { Casa, CasaEspecial, Cor, Estado, Lance, Peca, TipoCasaEspecial, TipoPeca } from "./tipos.ts";

/** Meios-lances em que a muralha fica de pé (10 lances de cada lado). */
export const DURACAO_MURALHA = 20;
/** O vulcão entra em erupção a cada tantos meios-lances (6 lances de cada lado). */
export const INTERVALO_VULCAO = 12;
/** Meios-lances parada na areia até afundar (2 rodadas). */
export const TEMPO_AREIA = 4;
/** Quantos tipos de casa cada partida sorteia. */
export const TIPOS_POR_PARTIDA = 4;

export const DESCRICAO_CASA: Record<TipoCasaEspecial, { nome: string; descricao: string }> = {
  portal: { nome: "Portal", descricao: "A peça que para num portal sai no outro, se ele estiver livre." },
  lama: { nome: "Lama", descricao: "A peça que para aqui fica atolada e não se move na próxima vez do dono." },
  bau: { nome: "Baú", descricao: "Quem para aqui ganha +1 uso do poder (na Mão de cartas, compra uma carta)." },
  muralha: { nome: "Muralha", descricao: "Ninguém para nem passa aqui nos primeiros 10 lances de cada lado." },
  gelo: { nome: "Gelo", descricao: "A peça escorrega e anda mais 1 casa na mesma direção, se estiver livre." },
  trampolim: { nome: "Trampolim", descricao: "No próximo lance, a peça também pode pular 2 casas em qualquer direção." },
  vigia: { nome: "Torre de vigia", descricao: "Com uma peça sua aqui, você vê armadilhas, bombas e ilusões do adversário." },
  santuario: { nome: "Santuário", descricao: "A peça aqui não pode ser capturada (menos o rei)." },
  forja: { nome: "Forja", descricao: "O peão que entra aqui vira cavalo ou bispo, à sua escolha." },
  vulcao: { nome: "Vulcão", descricao: "A cada 6 lances de cada lado, destrói as peças nele e em volta (menos os reis)." },
  esteira: { nome: "Esteira", descricao: "No fim de cada rodada, empurra a peça 1 casa para o lado (se estiver livre)." },
  espelho: { nome: "Espelho", descricao: "A peça que para aqui troca de lugar com a que estiver no outro espelho." },
  areia: { nome: "Areia movediça", descricao: "A peça que fica 2 rodadas aqui afunda e some (menos o rei)." },
  altar: { nome: "Altar", descricao: "A peça que entra aqui é sacrificada e dá +1 uso do poder (o rei não entra)." },
  nevoa: { nome: "Névoa", descricao: "As peças do dono desta metade, aqui e em volta, ficam escondidas do adversário." },
  sorte: { nome: "Casa da sorte", descricao: "Sorteia na hora: +1 uso do poder, peça atolada ou nada. Depois some." },
};

export const TIPOS_DE_CASA = Object.keys(DESCRICAO_CASA) as TipoCasaEspecial[];

/** A casa espelhada (giro de 180°): a correspondente do outro lado. */
const espelho = (c: Casa): Casa => 63 - c;
const naMetadeDasBrancas = (c: Casa) => fileira(c) <= 3;

/**
 * Sorteia as casas especiais: `quantos` tipos diferentes, um de cada nas fileiras 3 e 4
 * (metade das brancas), espelhado nas fileiras 5 e 6. Os dois portais formam um par.
 */
export function sortearCasas(
  rng: Aleatorio = Math.random,
  tipos: readonly TipoCasaEspecial[] = TIPOS_DE_CASA,
  quantos = TIPOS_POR_PARTIDA,
): { lista: CasaEspecial[] } {
  const livres: Casa[] = [];
  for (let fil = 2; fil <= 3; fil++) for (let col = 0; col < 8; col++) livres.push(casa(col, fil));
  const tirar = <T,>(lista: T[]) => lista.splice(Math.floor(rng() * lista.length), 1)[0]!;

  const disponiveis = [...tipos];
  const lista: CasaEspecial[] = [];
  for (let i = 0; i < quantos && disponiveis.length > 0; i++) {
    const tipo = tirar(disponiveis);
    const c = tirar(livres);
    if (tipo === "esteira") {
      // Espelhada: a das brancas empurra para um lado e a das pretas para o outro.
      const direcao = coluna(c) < 4 ? 1 : -1;
      lista.push({ casa: c, tipo, direcao }, { casa: espelho(c), tipo, direcao: direcao === 1 ? -1 : 1 });
    } else {
      lista.push({ casa: c, tipo }, { casa: espelho(c), tipo });
    }
  }
  return { lista };
}

export function casaEspecialEm(estado: Estado, c: Casa): CasaEspecial | undefined {
  return estado.casas?.lista.find((e) => e.casa === c);
}

const casasDoTipo = (estado: Estado, tipo: TipoCasaEspecial) =>
  estado.casas?.lista.filter((e) => e.tipo === tipo).map((e) => e.casa) ?? [];

export const muralhaDePe = (estado: Estado) => !!estado.casas && estado.meioLance < DURACAO_MURALHA;

/** Casas entre a origem e o destino de um lance em linha reta ou diagonal (sem as pontas). */
function casasNoCaminho(de: Casa, para: Casa): Casa[] {
  const dc = Math.sign(coluna(para) - coluna(de));
  const df = Math.sign(fileira(para) - fileira(de));
  const retoOuDiagonal =
    coluna(de) === coluna(para) ||
    fileira(de) === fileira(para) ||
    Math.abs(coluna(para) - coluna(de)) === Math.abs(fileira(para) - fileira(de));
  if (!retoOuDiagonal) return []; // salto de cavalo
  const caminho: Casa[] = [];
  let c = coluna(de) + dc;
  let f = fileira(de) + df;
  while (casa(c, f) !== para) {
    caminho.push(casa(c, f));
    c += dc;
    f += df;
  }
  return caminho;
}

/** Por que as casas especiais impedem este lance (null = não impedem). */
export function bloqueioDaCasa(estado: Estado, lance: Lance): TipoCasaEspecial | null {
  const casas = estado.casas;
  if (!casas) return null;
  const peca = estado.tabuleiro[lance.de];
  if (peca && casas.presas.some((p) => p.pecaId === peca.id && estado.meioLance < p.ate)) return "lama";
  if (muralhaDePe(estado)) {
    const muros = casasDoTipo(estado, "muralha");
    if (muros.includes(lance.para)) return "muralha";
    if (!lance.poder && casasNoCaminho(lance.de, lance.para).some((c) => muros.includes(c))) return "muralha";
  }
  const alvo = estado.tabuleiro[lance.para];
  if (alvo && alvo.tipo !== "rei" && casasDoTipo(estado, "santuario").includes(lance.para)) return "santuario";
  if (peca?.tipo === "rei" && casasDoTipo(estado, "altar").includes(lance.para)) return "altar";
  return null;
}

/** As casas criam lances novos agora (trampolim)? Importa para a conta do xeque. */
export function casasCriamLances(estado: Estado): boolean {
  return !!estado.casas?.trampolim?.some((t) => estado.meioLance < t.ate);
}

/** Lances extras dados pelas casas: pulos de 2 casas de quem passou pelo trampolim. */
export function lancesExtrasDasCasas(estado: Estado, cor: Cor): Lance[] {
  const ativos = estado.casas?.trampolim?.filter((t) => estado.meioLance < t.ate) ?? [];
  const lances: Lance[] = [];
  for (const t of ativos) {
    const de = estado.tabuleiro.findIndex((p) => p?.id === t.pecaId);
    if (de < 0 || estado.tabuleiro[de]!.cor !== cor) continue;
    for (const [dc, df] of VIZINHOS) {
      const col = coluna(de) + 2 * dc;
      const fil = fileira(de) + 2 * df;
      if (!dentro(col, fil)) continue;
      const para = casa(col, fil);
      const ocupante = estado.tabuleiro[para];
      if (ocupante?.cor === cor) continue;
      // Peão pulando para a última fileira promove a dama.
      const promove = estado.tabuleiro[de]!.tipo === "peao" && fil === ultimaFileira(cor);
      lances.push(promove ? { de, para, promocao: "dama" } : { de, para });
    }
  }
  return lances;
}

/**
 * Ajusta a lista final de lances: tira o que lama, muralha, santuário e altar impedem,
 * e transforma em escolha (cavalo ou bispo) o lance de peão que entra na forja.
 */
export function filtrarPorCasas(estado: Estado, lances: Lance[]): Lance[] {
  if (!estado.casas) return lances;
  const forjas = casasDoTipo(estado, "forja");
  return lances
    .filter((l) => !bloqueioDaCasa(estado, l))
    .flatMap((l): Lance[] => {
      const peao = estado.tabuleiro[l.de]?.tipo === "peao";
      if (!peao || l.poder || l.promocao || !forjas.includes(l.para)) return [l];
      return (["cavalo", "bispo"] as TipoPeca[]).map((promocao) => ({ ...l, promocao }));
    });
}

/** Dá +1 uso do poder (ou uma carta, na Mão de cartas). Devolve o texto do que aconteceu. */
function recarregar(estado: Estado, cor: Cor): string {
  const mao = estado.mao;
  if (mao) {
    if (mao.mao[cor].length < MAO_MAXIMA && mao.baralho[cor].length > 0) {
      mao.mao[cor].push(mao.baralho[cor].shift()!);
      return "comprou uma carta";
    }
    return "mas a mão estava cheia";
  }
  if (estado.cartas[cor].poder) {
    estado.usosPoder[cor]++;
    return "+1 uso do poder";
  }
  return "mas não tinha poder para recarregar";
}

/**
 * Efeito da casa onde a peça parou (o estado já é uma cópia e o lance já foi feito).
 * `meioLanceDoLance` é o índice do lance (0 = primeiro lance das brancas).
 */
export function aplicarCasaEspecial(estado: Estado, lance: Lance, cor: Cor, meioLanceDoLance: number): void {
  const casas = estado.casas;
  if (!casas || lance.poder) return;
  const t = estado.tabuleiro;
  const destino = lance.para;
  const especial = casaEspecialEm(estado, destino);
  const peca = t[destino];
  if (!especial || !peca || peca.cor !== cor) return;
  const registrar = (texto: string) => casas.registro.push({ meioLance: meioLanceDoLance, cor, texto });
  const nome = (p: Peca) => NOME_PECA[p.tipo];
  const sumir = () => (casas.lista = casas.lista.filter((e) => e !== especial));
  const atolar = () => (casas.presas = [...casas.presas, { pecaId: peca.id, ate: meioLanceDoLance + 3 }]);

  switch (especial.tipo) {
    case "portal": {
      const outro = casas.lista.find((e) => e.tipo === "portal" && e.casa !== destino);
      if (!outro || t[outro.casa]) return;
      t[outro.casa] = peca;
      t[destino] = null;
      registrar(`O ${nome(peca)} entrou no portal de ${nomeCasa(destino)} e saiu em ${nomeCasa(outro.casa)}`);
      return;
    }
    case "lama":
      // Atolada até depois da próxima vez do dono (que começa 2 meios-lances depois).
      atolar();
      registrar(`O ${nome(peca)} atolou na lama em ${nomeCasa(destino)}`);
      return;
    case "bau":
      sumir();
      registrar(`Abriu o baú em ${nomeCasa(destino)}: ${recarregar(estado, cor)}`);
      return;
    case "gelo": {
      const dc = Math.sign(coluna(destino) - coluna(lance.de));
      const df = Math.sign(fileira(destino) - fileira(lance.de));
      const col = coluna(destino) + dc;
      const fil = fileira(destino) + df;
      if (!dentro(col, fil) || t[casa(col, fil)]) return;
      const para = casa(col, fil);
      const promove = peca.tipo === "peao" && fil === ultimaFileira(cor);
      t[para] = promove ? { ...peca, tipo: "dama" } : peca;
      t[destino] = null;
      registrar(`O ${nome(peca)} escorregou no gelo até ${nomeCasa(para)}`);
      return;
    }
    case "trampolim":
      casas.trampolim = [...(casas.trampolim ?? []), { pecaId: peca.id, ate: meioLanceDoLance + 3 }];
      registrar(`O ${nome(peca)} subiu no trampolim: no próximo lance pode pular 2 casas`);
      return;
    case "espelho": {
      const outro = espelho(destino);
      const vizinho = t[outro];
      if (!vizinho) return;
      t[outro] = peca;
      t[destino] = vizinho;
      registrar(`O espelho trocou o ${nome(peca)} de ${nomeCasa(destino)} com o ${nome(vizinho)} de ${nomeCasa(outro)}`);
      return;
    }
    case "areia":
      if (peca.tipo === "rei") return;
      casas.areia = [...(casas.areia ?? []), { pecaId: peca.id, casa: destino, desde: meioLanceDoLance + 1 }];
      registrar(`O ${nome(peca)} pisou na areia movediça em ${nomeCasa(destino)}`);
      return;
    case "altar":
      t[destino] = null;
      registrar(`Sacrificou o ${nome(peca)} no altar: ${recarregar(estado, cor)}`);
      return;
    case "sorte": {
      sumir();
      // "Sorteio" reproduzível: a IA e o servidor chegam no mesmo resultado.
      const r = (meioLanceDoLance * 13 + destino * 7) % 4;
      if (r <= 1) registrar(`Casa da sorte: ${recarregar(estado, cor)}`);
      else if (r === 2) {
        atolar();
        registrar(`Casa da sorte: azar! O ${nome(peca)} ficou atolado`);
      } else registrar("Casa da sorte: nada aconteceu");
      return;
    }
    default:
      // muralha, vigia, santuário, forja, vulcão, esteira e névoa agem em outros momentos.
      return;
  }
}

/** Depois de cada lance: vulcão, esteira e areia movediça (o estado já é uma cópia). */
export function passoDasCasas(estado: Estado): void {
  const casas = estado.casas;
  if (!casas) return;
  const t = estado.tabuleiro;
  const m = estado.meioLance;
  const registrar = (texto: string) => casas.registro.push({ meioLance: m - 1, cor: estado.vez, texto });

  // Vulcão: erupção a cada INTERVALO_VULCAO meios-lances.
  if (m > 0 && m % INTERVALO_VULCAO === 0) {
    for (const centro of casasDoTipo(estado, "vulcao")) {
      let destruidas = 0;
      const atingir = (c: Casa) => {
        const p = t[c];
        if (p && p.tipo !== "rei") {
          t[c] = null;
          destruidas++;
        }
      };
      atingir(centro);
      for (const [dc, df] of VIZINHOS) {
        if (dentro(coluna(centro) + dc, fileira(centro) + df)) atingir(casa(coluna(centro) + dc, fileira(centro) + df));
      }
      registrar(`O vulcão de ${nomeCasa(centro)} entrou em erupção e destruiu ${destruidas} peça(s)`);
    }
  }

  // Esteira: no fim de cada rodada (depois do lance das pretas).
  if (m > 0 && m % 2 === 0) {
    for (const e of casas.lista.filter((x) => x.tipo === "esteira")) {
      const p = t[e.casa];
      const col = coluna(e.casa) + (e.direcao ?? 1);
      if (!p || !dentro(col, fileira(e.casa))) continue;
      const para = casa(col, fileira(e.casa));
      if (t[para]) continue;
      t[para] = p;
      t[e.casa] = null;
      registrar(`A esteira empurrou o ${NOME_PECA[p.tipo]} para ${nomeCasa(para)}`);
    }
  }

  // Areia movediça: quem continua lá há TEMPO_AREIA meios-lances afunda.
  if (casas.areia?.length) {
    const ficam: typeof casas.areia = [];
    for (const a of casas.areia) {
      if (t[a.casa]?.id !== a.pecaId) continue; // saiu a tempo
      if (m - a.desde >= TEMPO_AREIA) {
        registrar(`O ${NOME_PECA[t[a.casa]!.tipo]} afundou na areia movediça em ${nomeCasa(a.casa)}`);
        t[a.casa] = null;
      } else ficam.push(a);
    }
    casas.areia = ficam;
  }
}

/** Casas especiais visíveis agora (a muralha some quando cai). */
export function casasVisiveis(estado: Estado): CasaEspecial[] {
  if (!estado.casas) return [];
  return estado.casas.lista.filter((e) => e.tipo !== "muralha" || muralhaDePe(estado));
}

/** Casas das peças atoladas na lama agora. */
export function casasAtoladas(estado: Estado): Casa[] {
  if (!estado.casas) return [];
  return estado.casas.presas
    .filter((p) => estado.meioLance < p.ate)
    .map((p) => estado.tabuleiro.findIndex((x) => x?.id === p.pecaId))
    .filter((c) => c >= 0);
}

/** Casas das peças que podem pular pelo trampolim agora. */
export function casasNoTrampolim(estado: Estado): Casa[] {
  return (estado.casas?.trampolim ?? [])
    .filter((p) => estado.meioLance < p.ate)
    .map((p) => estado.tabuleiro.findIndex((x) => x?.id === p.pecaId))
    .filter((c) => c >= 0);
}

/** Lados com uma peça própria numa torre de vigia (veem os segredos do adversário). */
export function ladosComVigia(estado: Estado): Set<Cor> {
  const lados = new Set<Cor>();
  for (const c of casasDoTipo(estado, "vigia")) {
    const p = estado.tabuleiro[c];
    if (p) lados.add(p.cor);
  }
  return lados;
}

/**
 * Névoa: casas (a névoa e as vizinhas) onde as peças do dono daquela metade
 * ficam escondidas do adversário. Devolve, para cada casa, de quem são as peças escondidas.
 */
export function casasNaNevoa(estado: Estado): Map<Casa, Cor> {
  const mapa = new Map<Casa, Cor>();
  for (const c of casasDoTipo(estado, "nevoa")) {
    const dono: Cor = naMetadeDasBrancas(c) ? "brancas" : "pretas";
    mapa.set(c, dono);
    for (const [dc, df] of VIZINHOS) {
      if (dentro(coluna(c) + dc, fileira(c) + df)) mapa.set(casa(coluna(c) + dc, fileira(c) + df), dono);
    }
  }
  return mapa;
}

/** Meios-lances até a próxima erupção do vulcão. */
export function proximaErupcao(estado: Estado): number {
  return INTERVALO_VULCAO - (estado.meioLance % INTERVALO_VULCAO);
}
