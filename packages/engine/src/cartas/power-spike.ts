import { definirCarta } from "../carta.ts";
import { NOME_PECA, nomeCasa } from "../tabuleiro.ts";
import type { TipoPeca } from "../tipos.ts";

/** Em qual lance seu o Power Spike acontece. */
const LANCE = 25;
const TIPOS: TipoPeca[] = ["cavalo", "bispo", "torre"];

function sorte(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Power Spike: no seu 25º lance, dois peões seus viram cavalo, bispo ou torre (ao acaso). */
export default definirCarta({
  id: "power-spike",
  nome: "Power Spike",
  tipo: "poder",
  peso: 2,
  descricao: "Quando chegar o seu 25º lance, dois peões seus são promovidos ao acaso para cavalo, bispo ou torre.",

  inicioDoTurno(ctx, vez) {
    if (vez !== ctx.dono || ctx.estado.lancesFeitos[ctx.dono] !== LANCE - 1) return;
    const t = ctx.estado.tabuleiro;
    const peoes = t.map((p, c) => (p?.tipo === "peao" && p.cor === ctx.dono ? c : -1)).filter((c) => c >= 0);
    const textos: string[] = [];
    for (let i = 0; i < 2 && peoes.length > 0; i++) {
      const s = sorte(ctx.estado.meioLance * 7 + i);
      const casa = peoes.splice(Math.floor(s * peoes.length), 1)[0]!;
      const tipo = TIPOS[Math.floor(sorte(ctx.estado.meioLance * 13 + i) * TIPOS.length)]!;
      t[casa] = { ...t[casa]!, tipo };
      textos.push(`${nomeCasa(casa)} virou ${NOME_PECA[tipo]}`);
    }
    if (textos.length > 0) ctx.registrar(`Power Spike: ${textos.join(" e ")}`);
  },

  resumo: ({ estado, dono }) => {
    const faltam = LANCE - 1 - estado.lancesFeitos[dono];
    return faltam > 0 ? `promove 2 peões daqui a ${faltam} lance(s)` : faltam === 0 ? "promove 2 peões agora" : "já promoveu";
  },
});
