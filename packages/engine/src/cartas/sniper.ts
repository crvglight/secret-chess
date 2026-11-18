import { definirCarta } from "../carta.ts";
import { DIAGONAIS, deslizar, RETAS } from "../movimentos.ts";
import { casasDasPecas, LETRA_PECA, NOME_PECA, nomeCasa } from "../tabuleiro.ts";
import type { Lance } from "../tipos.ts";

export default definirCarta({
  id: "sniper",
  nome: "Sniper",
  tipo: "poder",
  peso: 4,
  descricao: "Uma vez por partida, um bispo ou uma torre sua captura a distância, sem sair do lugar.",

  acaoAtiva: {
    usos: 1,
    instrucao: "Escolha o bispo ou a torre e depois a peça que ele vai acertar",
    modo: "lance",
    lances({ estado, dono }) {
      const t = estado.tabuleiro;
      const lances: Lance[] = [];
      const capturas = (direcoes: typeof RETAS, de: number) => {
        const todos: Lance[] = [];
        deslizar(t, de, dono, direcoes, todos);
        for (const l of todos) if (t[l.para]) lances.push(l);
      };
      for (const de of casasDasPecas(estado, dono, "bispo")) capturas(DIAGONAIS, de);
      for (const de of casasDasPecas(estado, dono, "torre")) capturas(RETAS, de);
      return lances;
    },
    executar(ctx, lance) {
      const atirador = ctx.estado.tabuleiro[lance.de]!;
      const alvo = ctx.estado.tabuleiro[lance.para]!;
      ctx.estado.tabuleiro[lance.para] = null;
      ctx.registrar(`O ${NOME_PECA[atirador.tipo]} de ${nomeCasa(lance.de)} acertou o ${NOME_PECA[alvo.tipo]} em ${nomeCasa(lance.para)}`);
      return `${LETRA_PECA[atirador.tipo]}${nomeCasa(lance.de)}⌖${nomeCasa(lance.para)} (sniper)`;
    },
  },
});
