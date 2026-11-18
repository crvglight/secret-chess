import { NOME_PECA, PROMOCOES, type Cor, type TipoPeca } from "@xadrez/engine";
import { IconePeca } from "./PecaSvg.tsx";

interface Props {
  cor: Cor;
  /** As peças possíveis (padrão: as 4 da promoção; a forja oferece só cavalo e bispo). */
  opcoes?: readonly TipoPeca[];
  aoEscolher(tipo: TipoPeca): void;
  aoCancelar(): void;
}

export function EscolhaPromocao({ cor, opcoes, aoEscolher, aoCancelar }: Props) {
  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-label="Escolha a promoção">
      <div className="janela">
        <h2>{opcoes ? "Transformar em" : "Promover para"}</h2>
        <div className="opcoes-promocao">
          {(opcoes ?? PROMOCOES).map((tipo) => (
            <button key={tipo} type="button" className="botao-peca" onClick={() => aoEscolher(tipo)}>
              <IconePeca tipo={tipo} cor={cor} tamanho={56} />
              <span>{NOME_PECA[tipo]}</span>
            </button>
          ))}
        </div>
        <button type="button" className="botao-link" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
