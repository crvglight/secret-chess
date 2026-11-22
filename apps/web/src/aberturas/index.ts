// Nome da abertura que está sendo jogada (como no chess.com).
// Base: lichess-org/chess-openings (CC0). Gerada por scripts/gerar-aberturas.ts.
import { useEffect, useState } from "react";
import { nomeCasa, type RegistroLance } from "@xadrez/engine";

type Base = Record<string, [eco: string, nome: string]>;

export interface Abertura {
  eco: string;
  nome: string;
}

let carregando: Promise<Base> | null = null;
/** A base (400 KB) só é baixada quando alguém joga uma partida. */
function carregarBase(): Promise<Base> {
  carregando ??= import("./aberturas.json").then((m) => m.default as unknown as Base);
  return carregando;
}

/**
 * A abertura mais longa da base que bate com o começo da partida. Para no primeiro
 * lance que não é de xadrez normal (poder, carona): dali em diante fica a última conhecida.
 */
export function aberturaDe(base: Base, historico: readonly RegistroLance[]): Abertura | null {
  const uci: string[] = [];
  for (const r of historico) {
    if (r.lance.poder || r.lance.montada) break;
    uci.push(nomeCasa(r.lance.de) + nomeCasa(r.lance.para));
  }
  for (let n = uci.length; n > 0; n--) {
    const achada = base[uci.slice(0, n).join(" ")];
    if (achada) return { eco: achada[0], nome: achada[1] };
  }
  return null;
}

/** A abertura da partida (null enquanto não houver lance ou a base não carregou). */
export function useAbertura(historico: readonly RegistroLance[]): Abertura | null {
  const [base, setBase] = useState<Base | null>(null);
  useEffect(() => {
    let ativo = true;
    void carregarBase().then((b) => ativo && setBase(b));
    return () => {
      ativo = false;
    };
  }, []);
  return base ? aberturaDe(base, historico) : null;
}
