import { definirCarta } from "../carta.ts";
import { casaDoNome, nomeCasa } from "../tabuleiro.ts";

interface Dados {
  usada: boolean;
}

export default definirCarta<Dados>({
  id: "dama-imortal",
  nome: "Dama imortal",
  tipo: "poder",
  peso: 4,
  descricao: "Uma vez por partida, se sua dama for capturada, ela volta para a casa inicial dela (se estiver vazia).",
  dadosIniciais: () => ({ usada: false }),

  aoMover(ctx, { captura }) {
    if (ctx.dados.usada || captura?.tipo !== "dama" || captura.cor !== ctx.dono) return;
    const casa = casaDoNome(ctx.dono === "brancas" ? "d1" : "d8");
    if (ctx.estado.tabuleiro[casa]) return;
    ctx.estado.tabuleiro[casa] = captura;
    ctx.dados.usada = true;
    ctx.registrar(`A dama voltou para ${nomeCasa(casa)}`);
  },

  resumo: ({ dados }) => (dados.usada ? "Já foi usada" : "Pronta"),
});
