import {
  casasVisiveis,
  DESCRICAO_CASA,
  DURACAO_MURALHA,
  muralhaDePe,
  proximaErupcao,
  TIPOS_DE_CASA,
  type Estado,
} from "@xadrez/engine";
import { IconeCasa } from "./IconeCasa.tsx";

const ORDEM = TIPOS_DE_CASA;

/** Legenda das casas especiais que ainda estão no tabuleiro. */
export function PainelCasas({ estado }: { estado: Estado }) {
  if (!estado.casas) return null;
  const tipos = new Set(casasVisiveis(estado).map((c) => c.tipo));
  const lancesMuralha = Math.ceil((DURACAO_MURALHA - estado.meioLance) / 2);

  return (
    <section className="painel-casas" aria-label="Casas especiais">
      <h2>Casas especiais</h2>
      <ul>
        {ORDEM.filter((t) => tipos.has(t)).map((tipo) => (
          <li key={tipo}>
            <IconeCasa tipo={tipo} />
            <span>
              <strong>{DESCRICAO_CASA[tipo].nome}</strong>{" "}
              <span className="dica">
                {DESCRICAO_CASA[tipo].descricao}
                {tipo === "muralha" && muralhaDePe(estado) && ` Cai em ${lancesMuralha} lance(s) de cada lado.`}
                {tipo === "vulcao" && ` Próxima erupção em ${proximaErupcao(estado)} lance(s), contando os dois lados.`}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {tipos.size === 0 && <p className="dica">Nenhuma casa especial sobrou.</p>}
    </section>
  );
}
