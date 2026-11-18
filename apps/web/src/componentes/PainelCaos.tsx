import { eventoAtivo, proximoEvento, restanteDoEvento, type Estado } from "@xadrez/engine";

/** Meios-lances viram "lances" na tela (arredondando para cima). */
const emLances = (meios: number) => Math.max(1, Math.ceil(meios / 2));

/** Modo Caos: o evento em vigor e o próximo (os dois lados veem). */
export function PainelCaos({ estado }: { estado: Estado }) {
  const ativo = eventoAtivo(estado);
  const proximo = proximoEvento(estado);
  if (!estado.caos) return null;

  return (
    <section className="painel-caos" aria-label="Eventos do Caos">
      <h2>Caos</h2>
      {ativo ? (
        <div className="evento evento-ativo">
          <span className="evento-rotulo">Em vigor</span>
          <strong>{ativo.nome}</strong>
          <span className="dica">{ativo.descricao}</span>
          <span className="evento-tempo">Acaba em {emLances(restanteDoEvento(estado))} lance(s) de cada lado</span>
        </div>
      ) : (
        <p className="dica">Nenhum evento em vigor.</p>
      )}
      {proximo && !estado.resultado && (
        <div className="evento">
          <span className="evento-rotulo">Próximo</span>
          <strong>{proximo.evento.nome}</strong>
          <span className="dica">{proximo.evento.descricao}</span>
          <span className="evento-tempo">
            Chega em {proximo.emMeiosLances} lance{proximo.emMeiosLances > 1 ? "s" : ""} (contando os dois lados)
          </span>
        </div>
      )}
    </section>
  );
}
