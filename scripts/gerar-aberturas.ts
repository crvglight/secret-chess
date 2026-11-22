// Gera apps/web/src/aberturas/aberturas.json a partir da base de aberturas do Lichess
// (https://github.com/lichess-org/chess-openings, licença CC0 / domínio público).
//
// Uso: pnpm --filter @xadrez/server exec tsx ../../scripts/gerar-aberturas.ts
// (baixa os 5 arquivos a.tsv ... e.tsv e converte cada abertura para a sequência de
// lances em casas, ex.: "e2e4 e7e5 g1f3", usando o próprio motor do jogo.)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { aplicarLanceGerado, criarPartida, lancesLegais, nomeCasa, type Estado, type Lance, type TipoPeca } from "../packages/engine/src/index.ts";

const BASE = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/";
const SAIDA = fileURLToPath(new URL("../apps/web/src/aberturas/aberturas.json", import.meta.url));

const LETRA: Record<string, TipoPeca> = { N: "cavalo", B: "bispo", R: "torre", Q: "dama", K: "rei" };

/** Acha o lance legal que corresponde ao SAN (ex.: "Nbd7", "exd5", "O-O", "e8=Q+"). */
function lanceDoSan(estado: Estado, san: string): Lance {
  const limpo = san.replace(/[+#!?]/g, "");
  const legais = lancesLegais(estado);
  if (limpo === "O-O" || limpo === "O-O-O") {
    const l = legais.find((x) => x.especial === (limpo === "O-O" ? "roque-curto" : "roque-longo"));
    if (!l) throw new Error(`Roque impossível: ${san}`);
    return l;
  }
  const m = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQ]))?$/.exec(limpo);
  if (!m) throw new Error(`SAN não entendido: ${san}`);
  const [, peca, coluna, fileira, destino, promo] = m;
  const tipo: TipoPeca = peca ? LETRA[peca]! : "peao";
  const candidatos = legais.filter((l) => {
    const p = estado.tabuleiro[l.de];
    const de = nomeCasa(l.de);
    return (
      p?.tipo === tipo &&
      nomeCasa(l.para) === destino &&
      (!coluna || de[0] === coluna) &&
      (!fileira || de[1] === fileira) &&
      (promo ? l.promocao === LETRA[promo] : !l.promocao)
    );
  });
  if (candidatos.length !== 1) throw new Error(`SAN ambíguo ou impossível: ${san} (${candidatos.length})`);
  return candidatos[0]!;
}

const aberturas: Record<string, [string, string]> = {};
let total = 0;
for (const letra of ["a", "b", "c", "d", "e"]) {
  const resposta = await fetch(`${BASE}${letra}.tsv`);
  if (!resposta.ok) throw new Error(`Não baixou ${letra}.tsv`);
  const linhas = (await resposta.text()).trim().split("\n").slice(1);
  for (const linha of linhas) {
    const [eco, nome, pgn] = linha.split("\t");
    let estado = criarPartida();
    const uci: string[] = [];
    for (const san of pgn!.split(/\s+/).filter((t) => !/^\d+\.$/.test(t))) {
      const l = lanceDoSan(estado, san);
      uci.push(nomeCasa(l.de) + nomeCasa(l.para));
      estado = aplicarLanceGerado(estado, l);
    }
    aberturas[uci.join(" ")] = [eco!, nome!];
    total++;
  }
}
writeFileSync(SAIDA, JSON.stringify(aberturas));
console.log(`${total} aberturas → ${Object.keys(aberturas).length} sequências em ${SAIDA}`);
