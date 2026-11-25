import { definirCarta } from "../carta.ts";
import { casaAtacada } from "../movimentos.ts";
import { aplicarLanceGerado } from "../regras.ts";
import { corOposta, direcaoPeao } from "../tabuleiro.ts";
import type { Cor, Estado, Lance } from "../tipos.ts";

/** O lance deixa o rei adversário atacado (xadrez normal, sem cartas)? Atalho barato antes da conta cheia. */
function daXeque(estado: Estado, lance: Lance, dono: Cor): boolean {
  const t = estado.tabuleiro.slice();
  const peca = t[lance.de];
  if (!peca) return false;
  if (lance.especial === "en-passant") t[lance.para - 8 * direcaoPeao(peca.cor)] = null;
  t[lance.para] = lance.promocao ? { ...peca, tipo: lance.promocao } : peca;
  t[lance.de] = null;
  const rei = t.findIndex((p) => p?.tipo === "rei" && p.cor === corOposta(dono));
  return rei >= 0 && casaAtacada(t, rei, dono);
}

/** Femme Fatale: só a sua dama pode dar o xeque-mate. */
export default definirCarta({
  id: "femme-fatale",
  nome: "Femme Fatale",
  tipo: "desvantagem",
  peso: 3,
  descricao: "Você só pode dar xeque-mate no rei adversário com a sua dama.",

  // Só entre os lances legais: tira os xeques-mates que não são da dama (nunca deixa sem lance).
  filtrarLegais({ estado, dono }, lances, jogador) {
    if (jogador !== dono) return lances;
    const permitidos = lances.filter((l) => {
      if (estado.tabuleiro[l.de]?.tipo === "dama" && !l.montada) return true;
      if (!l.poder && !l.montada && !daXeque(estado, l, dono)) return true;
      const depois = aplicarLanceGerado(estado, l);
      return !(depois.resultado?.motivo === "xeque-mate" && depois.resultado.vencedor === dono);
    });
    return permitidos.length > 0 ? permitidos : lances;
  },
});
