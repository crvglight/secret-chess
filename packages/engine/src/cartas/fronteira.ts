import { definirCarta } from "../carta.ts";
import { fileira, pecaCapturada } from "../tabuleiro.ts";

export default definirCarta({
  id: "fronteira",
  nome: "Fronteira",
  tipo: "desvantagem",
  peso: 3,
  descricao:
    "Suas peças (menos os peões) não podem entrar nas 2 últimas fileiras do adversário. Capturar o rei sempre pode.",

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const proibida = (c: number) => (dono === "brancas" ? fileira(c) >= 6 : fileira(c) <= 1);
    return lances.filter(
      (l) =>
        estado.tabuleiro[l.de]?.tipo === "peao" || !proibida(l.para) || pecaCapturada(estado, l)?.tipo === "rei",
    );
  },
});
