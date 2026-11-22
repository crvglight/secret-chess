import { DESCRICAO_PREMIO, nomeCasa, NOME_RARIDADE, proximoAirdrop, type Estado } from "@xadrez/engine";
import { NOME_COR } from "../textos.ts";
import { DesenhoCaixa } from "./Tabuleiro.tsx";

/** Painel dos airdrops: próxima caixa, caixas no tabuleiro e o que já foi aberto. */
export function PainelAirdrops({ estado }: { estado: Estado }) {
  const a = estado.airdrops;
  if (!a) return null;
  const proxima = Math.ceil(proximoAirdrop(estado) / 2);
  return (
    <section className="painel-airdrops" aria-label="Airdrops">
      <h2>Airdrops</h2>
      {!estado.resultado && <p className="dica">Próxima caixa em {proxima} lance(s) de cada lado.</p>}
      {a.caixas.length > 0 && (
        <ul className="lista-caixas">
          {a.caixas.map((c) => (
            <li key={c.casa}>
              <svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true">
                <DesenhoCaixa raridade={c.raridade} />
              </svg>
              <span>
                Caixa <strong>{NOME_RARIDADE[c.raridade]}</strong> em {nomeCasa(c.casa)}{" "}
                <span className="dica">(some em {Math.ceil((c.ate - estado.meioLance) / 2)} lance(s))</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {a.registro.length > 0 && (
        <ul className="registro-caixas">
          {a.registro
            .slice(-3)
            .reverse()
            .map((r, i) => (
              <li key={`${r.meioLance}-${i}`}>
                <strong>{NOME_COR[r.cor]}</strong>: {DESCRICAO_PREMIO[r.premio]} <span className="dica">— {r.texto}</span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
