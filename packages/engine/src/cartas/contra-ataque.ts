import { definirCarta } from "../carta.ts";
import { VALOR_PECA } from "../ia/avaliacao.ts";
import { NOME_PECA, nomeCasa, ultimaFileira, fileira } from "../tabuleiro.ts";

interface Dados {
  usado: boolean;
}

export default definirCarta<Dados>({
  id: "contra-ataque",
  nome: "Contra-ataque",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, quando o adversário capturar uma peça sua, a sua peça mais barata que alcança captura de volta na hora, de graça.",
  dadosIniciais: () => ({ usado: false }),

  aoMover(ctx, { jogador, lance, captura }) {
    if (ctx.dados.usado || jogador === ctx.dono || captura?.cor !== ctx.dono) return;
    const t = ctx.estado.tabuleiro;
    const alvo = t[lance.para];
    if (!alvo || alvo.cor === ctx.dono) return; // a peça que capturou já saiu (ex.: portal)

    // Quem do dono pode capturar a peça que acabou de capturar? A mais barata vai.
    const atacantes = ctx
      .lancesLegais(ctx.dono)
      .filter((l) => l.para === lance.para && !l.poder)
      .sort((a, b) => VALOR_PECA[t[a.de]!.tipo] - VALOR_PECA[t[b.de]!.tipo]);
    const golpe = atacantes[0];
    if (!golpe) return;

    const peca = t[golpe.de]!;
    const promove = peca.tipo === "peao" && fileira(golpe.para) === ultimaFileira(ctx.dono);
    t[golpe.para] = promove ? { ...peca, tipo: "dama" } : peca;
    t[golpe.de] = null;
    ctx.dados.usado = true;
    ctx.registrar(`Contra-ataque: o ${NOME_PECA[peca.tipo]} capturou o ${NOME_PECA[alvo.tipo]} em ${nomeCasa(golpe.para)}`);
  },

  resumo: ({ dados }) => (dados.usado ? "Já foi usado" : "Pronto para revidar"),
});
