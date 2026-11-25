import { definirCarta } from "../carta.ts";

interface Dados {
  semente: number;
}

/** Chance de ganhar um lance extra depois de cada lance seu. */
const CHANCE = 0.02;

/** Número fixo entre 0 e 1 a partir da semente e do lance (o replay e o online dão o mesmo). */
function sorte(semente: number, meioLance: number): number {
  let h = Math.imul(semente ^ (meioLance + 0x9e3779b9), 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export default definirCarta<Dados>({
  id: "odds",
  nome: "Odds",
  tipo: "poder",
  peso: 1,
  descricao: "Depois de cada lance seu, 2% de chance de jogar de novo.",
  dadosIniciais: () => ({ semente: Math.floor(Math.random() * 2 ** 31) }),

  aoMover(ctx, { jogador, antes }) {
    if (jogador !== ctx.dono || ctx.estado.resultado) return;
    if (sorte(ctx.dados.semente, antes.meioLance) < CHANCE) {
      ctx.estado.repetirVez = true;
      ctx.registrar("Odds: deu sorte e joga de novo!");
    }
  },
});
