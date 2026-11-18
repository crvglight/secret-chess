import { definirCarta } from "../carta.ts";
import { corOposta, NOME_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Cor, Estado, TipoPeca } from "../tipos.ts";

/** Da mais valiosa para a menos: a dama não volta, e o peão não cabe na primeira fileira. */
const QUEM_VOLTA: TipoPeca[] = ["torre", "bispo", "cavalo"];

/** O tipo mais valioso que o dono perdeu (e pode voltar), ou null. */
function quemVolta(estado: Estado, dono: Cor): TipoPeca | null {
  const perdidas = estado.historico
    .filter((r) => r.cor === corOposta(dono) && r.captura)
    .map((r) => r.captura!);
  return QUEM_VOLTA.find((t) => perdidas.includes(t)) ?? null;
}

const primeiraFileira = (dono: Cor) => (dono === "brancas" ? [0, 1, 2, 3, 4, 5, 6, 7] : [56, 57, 58, 59, 60, 61, 62, 63]);

export default definirCarta({
  id: "necromante",
  nome: "Necromante",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma vez por partida, traga de volta a sua peça capturada mais valiosa (torre, bispo ou cavalo) para uma casa vazia da sua primeira fileira.",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha a casa vazia da primeira fileira onde a peça volta",
    modo: "alvo",
    bloqueio: ({ estado, dono }) => (quemVolta(estado, dono) ? null : "Nenhuma peça sua capturada pode voltar"),
    alvosValidos: ({ estado, dono }) => primeiraFileira(dono).filter((c) => !estado.tabuleiro[c]),
    usar(ctx, alvo) {
      const tipo = quemVolta(ctx.estado, ctx.dono)!;
      // Id novo e único: nenhuma peça do tabuleiro (nem das já capturadas) passa de 1000.
      ctx.estado.tabuleiro[alvo] = { id: 1000 + ctx.estado.meioLance * 4, tipo, cor: ctx.dono };
      ctx.registrar(`Trouxe de volta um ${NOME_PECA[tipo]} em ${nomeCasa(alvo)}`);
    },
  },
});
