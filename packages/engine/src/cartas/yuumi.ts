import { definirCarta } from "../carta.ts";
import { lancesDaPecaEm } from "../movimentos.ts";
import { casa, coluna, corOposta, dentro, direcaoPeao, fileira, ultimaFileira } from "../tabuleiro.ts";
import type { Casa, Estado, Lance, Peca } from "../tipos.ts";

/**
 * Yuumi: uma peça sua (menos o rei) pode subir de carona em outra peça sua (menos o rei).
 * As duas ficam na mesma casa: clicar na de baixo move as duas juntas; clicar na de
 * cima faz só ela descer e andar. Se a de baixo for capturada, as duas morrem juntas.
 * O motor cuida da execução (lance.montada); esta carta só cria os lances.
 */
export default definirCarta({
  id: "yuumi",
  nome: "Yuumi",
  tipo: "poder",
  peso: 3,
  descricao:
    "Uma peça sua (menos o rei) pode subir de carona em outra peça sua: as duas andam juntas e a de cima pode descer quando quiser. Se a de baixo for capturada, as duas caem.",

  // Subir na carona nunca captura: só quem já está em cima (e pode descer capturando) conta.
  lancesExtrasAtacam: ({ estado, dono }) =>
    !!estado.montadas && estado.tabuleiro.some((p) => p?.cor === dono && !!estado.montadas![p.id]),

  adicionarLances({ estado, dono }, jogador) {
    if (jogador !== dono) return [];
    const t = estado.tabuleiro;
    const temCarona = (p: Peca) => !!estado.montadas?.[p.id];
    const lances: Lance[] = [];

    // Quem pode levar carona: peça sua, menos o rei, que ainda não leva ninguém.
    const bases = new Set<Casa>();
    t.forEach((p, c) => {
      if (p && p.cor === dono && p.tipo !== "rei" && !temCarona(p)) bases.add(c);
    });

    // 1) Subir: a peça anda (do jeito dela) até a casa de uma base.
    for (const de of bases) {
      const peca = t[de]!;
      // Tabuleiro de mentira: as outras bases viram "inimigas" para o gerador alcançá-las.
      const outras = t.map((p, c): Peca | null => (p && c !== de && bases.has(c) ? { ...p, cor: corOposta(dono) } : p));
      const alcance = lancesDaPecaEm({ ...estado, tabuleiro: outras, enPassant: null }, de, peca);
      const destinos = new Set(alcance.filter((l) => bases.has(l.para) && !l.promocao).map((l) => l.para));
      // O peão também sobe na peça bem à frente dele.
      if (peca.tipo === "peao") {
        const frente = casa(coluna(de), fileira(de) + direcaoPeao(dono));
        if (dentro(coluna(de), fileira(de) + direcaoPeao(dono)) && bases.has(frente) && fileira(frente) !== ultimaFileira(dono)) {
          destinos.add(frente);
        }
      }
      for (const para of destinos) lances.push({ de, para, montada: "montar" });
    }

    // 2) Descer: a peça de cima anda sozinha, saindo da casa da base.
    t.forEach((base, de) => {
      const cima = base && base.cor === dono ? estado.montadas?.[base.id] : undefined;
      if (!cima) return;
      const comCima: Estado = { ...estado, tabuleiro: t.map((p, c) => (c === de ? cima : p)) };
      for (const l of lancesDaPecaEm(comCima, de, cima)) {
        if (l.especial === "en-passant") continue;
        lances.push({ ...l, montada: "descer" });
      }
    });
    return lances;
  },
});
