import { definirCarta } from "../carta.ts";

const LIMITE = 6;

interface Dados {
  semMoverRei: number;
}

export default definirCarta<Dados>({
  id: "rei-impaciente",
  nome: "Rei impaciente",
  tipo: "desvantagem",
  peso: 3,
  descricao: `Seu rei precisa se mover pelo menos uma vez a cada ${LIMITE} lances seus. No ${LIMITE}º lance sem mexer o rei, só ele pode jogar; se ele não tiver lance, você perde.`,
  dadosIniciais: () => ({ semMoverRei: 0 }),

  filtrarLances({ estado, dono, dados }, lances, jogador) {
    if (jogador !== dono || dados.semMoverRei < LIMITE - 1) return lances;
    return lances.filter((l) => !l.poder && estado.tabuleiro[l.de]?.tipo === "rei");
  },

  aoMover(ctx, { jogador, peca }) {
    if (jogador === ctx.dono) ctx.dados.semMoverRei = peca.tipo === "rei" ? 0 : ctx.dados.semMoverRei + 1;
  },

  resumo: ({ dados }) =>
    dados.semMoverRei >= LIMITE - 1 ? "Agora só o rei pode jogar!" : `Mova o rei em até ${LIMITE - dados.semMoverRei} lance(s)`,
});
