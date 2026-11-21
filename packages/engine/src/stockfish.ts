// Ponte com o Stockfish (que só conhece xadrez normal): monta o FEN da posição e
// traduz os lances UCI de volta. O Stockfish não vê cartas nem casas especiais;
// quem usa isto filtra os lances dele pelas regras do jogo (lancesLegais).
import { emXeque, lancesLegais } from "./regras.ts";
import { casaDoNome, corOposta, nomeCasa } from "./tabuleiro.ts";
import type { Cor, Estado, Lance, TipoPeca } from "./tipos.ts";

const LETRA_FEN: Record<TipoPeca, string> = { peao: "p", cavalo: "n", bispo: "b", torre: "r", dama: "q", rei: "k" };
const PROMOCAO_UCI: Record<string, TipoPeca> = { q: "dama", r: "torre", b: "bispo", n: "cavalo" };

/**
 * FEN da posição para o Stockfish, ou null quando ela não é uma posição de xadrez
 * normal que ele aceite (as cartas às vezes criam posições impossíveis, como
 * peão na primeira fileira ou mais de 16 peças de um lado).
 */
export function fenParaStockfish(estado: Estado): string | null {
  const t = estado.tabuleiro;
  const conta: Record<Cor, number> = { brancas: 0, pretas: 0 };
  const reis: Record<Cor, number> = { brancas: 0, pretas: 0 };
  const linhas: string[] = [];
  for (let fil = 7; fil >= 0; fil--) {
    let linha = "";
    let vazias = 0;
    for (let col = 0; col < 8; col++) {
      const p = t[fil * 8 + col];
      if (!p) {
        vazias++;
        continue;
      }
      if (p.tipo === "peao" && (fil === 0 || fil === 7)) return null;
      conta[p.cor]++;
      if (p.tipo === "rei") reis[p.cor]++;
      if (vazias) linha += vazias;
      vazias = 0;
      const letra = LETRA_FEN[p.tipo];
      linha += p.cor === "brancas" ? letra.toUpperCase() : letra;
    }
    if (vazias) linha += vazias;
    linhas.push(linha);
  }
  if (reis.brancas !== 1 || reis.pretas !== 1 || conta.brancas > 16 || conta.pretas > 16) return null;
  // Quem acabou de jogar não pode estar com o rei atacado (posição ilegal no xadrez normal).
  if (emXeque(estado, corOposta(estado.vez))) return null;

  // Roque: só com o rei e a torre nas casas de origem (o Stockfish confere isso).
  const em = (nome: string, tipo: TipoPeca, cor: Cor) => {
    const p = t[casaDoNome(nome)];
    return p?.tipo === tipo && p.cor === cor;
  };
  let roque = "";
  if (estado.roque.brancas.curto && em("e1", "rei", "brancas") && em("h1", "torre", "brancas")) roque += "K";
  if (estado.roque.brancas.longo && em("e1", "rei", "brancas") && em("a1", "torre", "brancas")) roque += "Q";
  if (estado.roque.pretas.curto && em("e8", "rei", "pretas") && em("h8", "torre", "pretas")) roque += "k";
  if (estado.roque.pretas.longo && em("e8", "rei", "pretas") && em("a8", "torre", "pretas")) roque += "q";

  const ep = estado.enPassant === null ? "-" : nomeCasa(estado.enPassant);
  const vez = estado.vez === "brancas" ? "w" : "b";
  const numero = Math.floor(estado.meioLance / 2) + 1;
  return `${linhas.join("/")} ${vez} ${roque || "-"} ${ep} ${Math.min(estado.semProgresso, 99)} ${numero}`;
}

/**
 * O lance do jogo que corresponde ao lance UCI do Stockfish (ex.: "e2e4", "e7e8q"),
 * se ele for permitido pelas regras e cartas da partida. Lances de poder não contam.
 */
export function lanceDoUci(estado: Estado, uci: string): Lance | null {
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci.trim());
  if (!m) return null;
  const de = casaDoNome(m[1]!);
  const para = casaDoNome(m[2]!);
  const promocao = m[3] ? PROMOCAO_UCI[m[3]] : undefined;
  return (
    lancesLegais(estado).find(
      (l) => !l.poder && !l.montada && l.de === de && l.para === para && (l.promocao ?? undefined) === promocao,
    ) ?? null
  );
}
