import { definirCarta } from "../carta.ts";
import { casaAtacada } from "../movimentos.ts";
import { corOposta } from "../tabuleiro.ts";

/** Covarde: em xeque, você tem que mover o rei (se ele não puder andar, vale qualquer lance que salve). */
export default definirCarta({
  id: "covarde",
  nome: "Covarde",
  tipo: "desvantagem",
  peso: 2,
  descricao: "Quando estiver em xeque, você tem que mover o seu rei (se ele não tiver para onde ir, vale outro lance).",

  filtrarLegais({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const rei = estado.tabuleiro.findIndex((p) => p?.tipo === "rei" && p.cor === dono);
    if (rei < 0 || !casaAtacada(estado.tabuleiro, rei, corOposta(dono))) return lances;
    const doRei = lances.filter((l) => l.de === rei && !l.montada);
    return doRei.length > 0 ? doRei : lances;
  },
});
