import { definirCarta } from "../carta.ts";
import { fileira } from "../tabuleiro.ts";
import type { Casa, Cor, Estado } from "../tipos.ts";

interface Dados {
  semente: number;
}

/** A cada quantos lances seus as casas sem sinal são sorteadas de novo. */
const CICLO = 5;
const CASAS_SEM_SINAL = 3;

function sorte(semente: number, n: number, i: number): number {
  let h = Math.imul(semente ^ (n * 31 + i + 0x9e3779b9), 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Qual "rodada de sinal" vale agora (muda a cada 5 lances de quem tem a carta). */
const janela = (estado: Estado, dono: Cor) => Math.floor(estado.lancesFeitos[dono] / CICLO);

/**
 * As 3 casas sem sinal: sorteadas no meio do tabuleiro (3ª a 6ª fileira), sempre as mesmas
 * durante os 5 lances (replay e online dão o mesmo resultado).
 */
export function casasSemSinal(estado: Estado, dono: Cor, semente: number): Casa[] {
  const meio = Array.from({ length: 64 }, (_, c) => c).filter((c) => fileira(c) >= 2 && fileira(c) <= 5);
  const escolhidas: Casa[] = [];
  for (let i = 0; escolhidas.length < CASAS_SEM_SINAL; i++) {
    escolhidas.push(meio.splice(Math.floor(sorte(semente, janela(estado, dono), i) * meio.length), 1)[0]!);
  }
  return escolhidas;
}

/** Voanet: sempre há 3 casas em que suas peças não podem entrar; elas mudam a cada 5 lances seus. */
export default definirCarta<Dados>({
  id: "voanet",
  nome: "Voanet",
  tipo: "desvantagem",
  peso: 3,
  descricao:
    "Sempre há 3 casas do meio do tabuleiro que “não carregam”: suas peças não podem ir para elas. A cada 5 lances seus, elas são sorteadas de novo.",
  dadosIniciais: () => ({ semente: Math.floor(Math.random() * 2 ** 31) }),

  // Só entre os lances legais: nunca deixa você sem lance.
  filtrarLegais({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono) return lances;
    const bloqueadas = new Set(casasSemSinal(estado, dono, dados.semente));
    const restantes = lances.filter((l) => !bloqueadas.has(l.para));
    return restantes.length > 0 ? restantes : lances;
  },

  destaques: ({ estado, dono, dados }) =>
    estado.resultado ? [] : casasSemSinal(estado, dono, dados.semente).map((casa) => ({ casa, publico: true, rotulo: "Sem sinal" })),

  resumo: ({ estado, dono }) => {
    const faltam = CICLO - (estado.lancesFeitos[dono] % CICLO);
    return `casas sorteadas de novo em ${faltam} lance(s)`;
  },
});
