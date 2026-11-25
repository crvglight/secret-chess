import { useEffect, useRef, useState } from "react";
import type { Digitacao } from "@xadrez/engine";

/** Tempo para digitar as palavras. */
export const TEMPO_MULTITASKING_MS = 7000;

/** Palavras curtas e médias, em português e inglês (sem acento, para não atrapalhar no teclado). */
const PALAVRAS = [
  "abacaxi", "hello", "estacionamento", "banana", "window", "cadeira", "rocket", "janela", "orange", "tartaruga",
  "pizza", "keyboard", "mochila", "garden", "elefante", "summer", "caneta", "bridge", "travesseiro", "monkey",
  "chocolate", "planet", "bicicleta", "silver", "panela", "dragon", "girassol", "pencil", "sorvete", "thunder",
  "relogio", "castle", "abobora", "yellow", "geladeira", "forest", "macaco", "button", "piscina", "laptop",
  "cachorro", "rabbit", "travessa", "ocean", "formiga", "candle", "parafuso", "winter", "batata", "guitar",
  "telhado", "spider", "lanterna", "mirror", "camiseta", "pillow", "tomate", "engine", "escada", "jungle",
];

/** Três palavras ao acaso, sem repetir. */
export function sortearPalavras(): string {
  const lista = [...PALAVRAS];
  const escolhidas: string[] = [];
  for (let i = 0; i < 3; i++) escolhidas.push(lista.splice(Math.floor(Math.random() * lista.length), 1)[0]!);
  return escolhidas.join(" ");
}

const normalizar = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Desvantagem Multitasking: para confirmar o lance, digite as 3 palavras em 7 segundos.
 * `aoDigitar` recebe o texto a cada tecla (para o adversário ver online).
 */
export function JanelaMultitasking({
  palavras,
  aoAcertar,
  aoFalhar,
  aoDigitar,
}: {
  palavras: string;
  aoAcertar(): void;
  aoFalhar(motivo: string): void;
  aoDigitar?(d: Digitacao): void;
}) {
  const [texto, setTexto] = useState("");
  const [restante, setRestante] = useState(TEMPO_MULTITASKING_MS);
  const terminou = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    entrada.current?.focus();
    const inicio = Date.now();
    const id = setInterval(() => {
      const r = TEMPO_MULTITASKING_MS - (Date.now() - inicio);
      setRestante(Math.max(0, r));
      if (r <= 0 && !terminou.current) {
        terminou.current = true;
        aoFalhar("Acabou o tempo! O lance não aconteceu.");
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmar() {
    if (terminou.current) return;
    terminou.current = true;
    if (normalizar(texto) === normalizar(palavras)) aoAcertar();
    else aoFalhar("Errou as palavras! O lance não aconteceu.");
  }

  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-multitasking">
      <div className="janela janela-multitasking">
        <h2 id="titulo-multitasking">Multitasking</h2>
        <p className="subtitulo">Digite sem erros para confirmar o lance:</p>
        <p className="palavras-multitasking">{palavras}</p>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            confirmar();
          }}
        >
          <input
            ref={entrada}
            className="entrada-multitasking"
            value={texto}
            autoComplete="off"
            spellCheck={false}
            aria-label="Palavras"
            onChange={(ev) => {
              setTexto(ev.target.value);
              aoDigitar?.({ palavras, texto: ev.target.value });
            }}
          />
          <div className="barra-progresso tempo-multitasking" aria-hidden="true">
            <div style={{ width: `${(100 * restante) / TEMPO_MULTITASKING_MS}%` }} />
          </div>
          <p className="dica">{(restante / 1000).toFixed(1)} s · Enter para confirmar</p>
          <button type="submit" className="botao">
            Confirmar
          </button>
        </form>
      </div>
    </div>
  );
}

/** O que o outro jogador vê enquanto alguém digita (online). */
export function AvisoDigitando({ nome, digitacao }: { nome: string; digitacao: Digitacao }) {
  return (
    <div className="aviso-digitando" role="status">
      <strong>{nome}</strong> está no Multitasking: <span className="palavras-pequenas">{digitacao.palavras}</span>
      <br />
      <span className="dica">digitou: “{digitacao.texto}”</span>
    </div>
  );
}
