import { definirCarta } from "../carta.ts";
import { casaAtacada } from "../movimentos.ts";
import { corOposta } from "../tabuleiro.ts";

/** A cada quantos lances seus vem o "lance só de peão" (o 7º, o 14º, o 21º...). */
const CICLO = 7;

/**
 * CLT: depois de 6 lances seus, o 7º é só de peão. Fora disso se você estiver
 * em xeque ou se nenhum peão puder andar.
 */
export default definirCarta({
  id: "clt",
  nome: "CLT",
  tipo: "desvantagem",
  peso: 2,
  descricao:
    "A cada 6 lances seus, no 7º você só pode mover peões (menos se estiver em xeque ou se nenhum peão puder andar).",

  // Obrigação: só entre os lances legais (nunca deixa o jogador sem lance).
  filtrarLegais({ estado, dono }, lances, jogador) {
    if (jogador !== dono || (estado.lancesFeitos[dono] + 1) % CICLO !== 0) return lances;
    const rei = estado.tabuleiro.findIndex((p) => p?.tipo === "rei" && p.cor === dono);
    if (rei >= 0 && casaAtacada(estado.tabuleiro, rei, corOposta(dono))) return lances;
    const dePeao = lances.filter((l) => {
      const p = estado.tabuleiro[l.de];
      return !l.montada && p?.cor === dono && p.tipo === "peao";
    });
    return dePeao.length > 0 ? dePeao : lances;
  },

  resumo: ({ estado, dono }) => {
    const falta = CICLO - ((estado.lancesFeitos[dono] + 1) % CICLO || CICLO);
    return falta === 0 ? "este lance é só de peão" : `lance só de peão daqui a ${falta + 1}`;
  },
});
