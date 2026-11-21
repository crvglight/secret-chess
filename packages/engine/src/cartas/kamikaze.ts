import { definirCarta, ORDEM_FILTRO_FINAL } from "../carta.ts";
import { casaAtacada } from "../movimentos.ts";
import { corOposta, direcaoPeao } from "../tabuleiro.ts";
import type { Cor, Estado, Lance } from "../tipos.ts";

/** O lance (normal) deixa o rei adversário atacado? Conta só o xadrez normal, sem cartas. */
function daXeque(estado: Estado, lance: Lance, dono: Cor): boolean {
  const t = estado.tabuleiro.slice();
  const peca = t[lance.de]!;
  if (lance.especial === "en-passant") t[lance.para - 8 * direcaoPeao(peca.cor)] = null;
  t[lance.para] = lance.promocao ? { ...peca, tipo: lance.promocao } : peca;
  t[lance.de] = null;
  if (lance.especial === "roque-curto") [t[lance.de + 1], t[lance.de + 3]] = [t[lance.de + 3]!, null];
  if (lance.especial === "roque-longo") [t[lance.de - 1], t[lance.de - 4]] = [t[lance.de - 4]!, null];
  const rei = t.findIndex((p) => p?.tipo === "rei" && p.cor === corOposta(dono));
  return rei >= 0 && casaAtacada(t, rei, dono);
}

export default definirCarta({
  id: "kamikaze",
  nome: "Kamikaze",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Se você puder dar xeque no rei do adversário, você é obrigado a dar.",
  // Roda no fim, para só contar os xeques que são permitidos de verdade.
  ordemFiltro: ORDEM_FILTRO_FINAL,

  filtrarLances({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const xeques = lances.filter((l) => !l.poder && !l.montada && daXeque(estado, l, dono));
    return xeques.length > 0 ? xeques : lances;
  },
});
