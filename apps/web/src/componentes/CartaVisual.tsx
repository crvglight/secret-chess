import { obterCarta } from "@xadrez/engine";

interface Props {
  cartaId: string | null;
  virada?: boolean;
  /** Texto extra embaixo (ex.: usos restantes). */
  rodape?: string;
  /** Texto quando não há carta (padrão: "Sem carta"). */
  textoVazio?: string;
}

export function CartaVisual({ cartaId, virada = false, rodape, textoVazio = "Sem carta" }: Props) {
  // Virada vem primeiro: online, a carta do adversário chega vazia (o servidor não manda).
  if (virada) {
    return (
      <div className="carta carta-virada" aria-label="Carta virada">
        <span>?</span>
      </div>
    );
  }
  if (!cartaId) return <div className="carta carta-vazia">{textoVazio}</div>;
  const carta = obterCarta(cartaId);
  return (
    <div className={`carta carta-${carta.tipo}`}>
      <div className="carta-topo">
        <span className="carta-tipo">{carta.tipo === "poder" ? "Poder" : "Desvantagem"}</span>
        <span className="carta-peso" title={`Peso ${carta.peso}`}>
          {"●".repeat(carta.peso)}
          <span className="carta-peso-vazio">{"●".repeat(5 - carta.peso)}</span>
        </span>
      </div>
      <strong className="carta-nome">{carta.nome}</strong>
      <p className="carta-descricao">{carta.descricao}</p>
      {rodape && <span className="carta-rodape">{rodape}</span>}
    </div>
  );
}
