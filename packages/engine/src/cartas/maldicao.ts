import { definirCarta } from "../carta.ts";
import { casasDasPecas, NOME_PECA, nomeCasa } from "../tabuleiro.ts";

const INTERVALO = 10;

export default definirCarta({
  id: "maldicao",
  nome: "Maldição",
  tipo: "desvantagem",
  peso: 4,
  descricao: `A cada ${INTERVALO} lances seus, uma peça sua (menos o rei) some do tabuleiro.`,

  aoMover(ctx, { jogador }) {
    const feitos = ctx.estado.lancesFeitos[ctx.dono];
    if (jogador !== ctx.dono || feitos % INTERVALO !== 0) return;
    const candidatas = casasDasPecas(ctx.estado, ctx.dono).filter((c) => ctx.estado.tabuleiro[c]!.tipo !== "rei");
    if (candidatas.length === 0) return;
    // Escolha "sorteada" mas reproduzível (a IA e o servidor chegam no mesmo resultado).
    const c = candidatas[(feitos * 7 + candidatas.length * 3) % candidatas.length]!;
    const peca = ctx.estado.tabuleiro[c]!;
    ctx.estado.tabuleiro[c] = null;
    ctx.registrar(`A maldição levou o ${NOME_PECA[peca.tipo]} de ${nomeCasa(c)}`);
  },

  resumo: ({ estado, dono }) => `Próxima maldição em ${INTERVALO - (estado.lancesFeitos[dono] % INTERVALO)} lance(s)`,
});
