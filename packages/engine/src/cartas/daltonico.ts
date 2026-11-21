import { definirCarta } from "../carta.ts";
import { lancesDaPecaEm } from "../movimentos.ts";
import { corOposta, LETRA_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Lance, Peca } from "../tipos.ts";

/**
 * Daltônico: neste turno as peças "ficam da mesma cor": você move uma peça do
 * adversário (menos o rei), com o movimento normal dela, e ela pode capturar outra
 * peça dele. Gasta o lance; não pode deixar o seu rei em xeque.
 */
export default definirCarta({
  id: "daltonico",
  nome: "Daltônico",
  tipo: "poder",
  peso: 4,
  descricao:
    "Uma vez por partida, mova uma peça do adversário (menos o rei) como se fosse sua: ela pode até capturar outra peça dele.",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha uma peça do adversário e depois para onde ela vai",
    modo: "lance",
    lances({ estado, dono }) {
      const adversario = corOposta(dono);
      const t = estado.tabuleiro;
      const lances: Lance[] = [];
      t.forEach((p, de) => {
        if (!p || p.cor !== adversario || p.tipo === "rei") return;
        // Tabuleiro de mentira: as outras peças dele viram "suas" para ela poder capturá-las;
        // as suas viram "dele" (ela não captura peça sua).
        const virado = t.map((q, c): Peca | null =>
          !q || c === de ? q : { ...q, cor: q.cor === adversario ? dono : adversario },
        );
        for (const l of lancesDaPecaEm({ ...estado, tabuleiro: virado, enPassant: null }, de, p)) {
          const alvo = t[l.para];
          if (alvo && (alvo.cor !== adversario || alvo.tipo === "rei")) continue;
          // Sem lance especial (roque, en passant, duplo): só o movimento da peça.
          lances.push(l.promocao ? { de: l.de, para: l.para, promocao: l.promocao } : { de: l.de, para: l.para });
        }
      });
      return lances;
    },
    executar(ctx, lance) {
      const t = ctx.estado.tabuleiro;
      const peca = t[lance.de]!;
      const alvo = t[lance.para];
      t[lance.para] = lance.promocao ? { ...peca, tipo: lance.promocao } : peca;
      t[lance.de] = null;
      const texto = `${LETRA_PECA[peca.tipo] || "P"}${nomeCasa(lance.de)}${alvo ? "x" : "-"}${nomeCasa(lance.para)}`;
      ctx.registrar(`Daltônico: moveu a peça do adversário ${texto}`);
      return `${texto} (daltônico)`;
    },
  },
});
