import { definirCarta } from "../carta.ts";
import { pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "capturas-obrigatorias",
  nome: "Capturas obrigatórias",
  tipo: "desvantagem",
  peso: 4,
  descricao: "Se puder capturar alguma peça, você é obrigado a capturar.",
  // Roda depois dos outros filtros, para só contar as capturas que sobraram.
  ordemFiltro: 10,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const capturas = lances.filter((l) => !l.poder && pecaCapturada(estado, l));
    return capturas.length > 0 ? capturas : lances;
  },
});
