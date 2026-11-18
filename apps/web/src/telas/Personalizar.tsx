import { useMemo } from "react";
import { casaDoNome, criarPartida, jogar, lancesDaCasa } from "@xadrez/engine";
import { SeletorVisual } from "../componentes/SeletorVisual.tsx";
import { Tabuleiro } from "../componentes/Tabuleiro.tsx";

const SEM_ACAO = () => {};

/** Posição de exemplo para a prévia: alguns lances feitos e um bispo selecionado. */
function posicaoDeExemplo() {
  const lances = ["e2-e4", "e7-e5", "g1-f3", "b8-c6", "f1-c4", "g8-f6", "d2-d3", "f8-c5"];
  const estado = lances.reduce((e, l) => {
    const [de, para] = l.split("-");
    return jogar(e, de!, para!);
  }, criarPartida());
  const selecionada = casaDoNome("c4");
  return { estado, selecionada, destinos: lancesDaCasa(estado, selecionada) };
}

export function Personalizar({ aoVoltar }: { aoVoltar(): void }) {
  const exemplo = useMemo(posicaoDeExemplo, []);

  return (
    <div className="tela-personalizar">
      <header className="barra">
        <button type="button" className="botao-link" onClick={aoVoltar}>
          ← Início
        </button>
        <span className="barra-titulo">Personalizar</span>
        <span />
      </header>

      <div className="personalizar-conteudo">
        <section className="previa" aria-label="Prévia ao vivo">
          <div className="area-tabuleiro">
            <Tabuleiro
              estado={exemplo.estado}
              orientacao="brancas"
              selecionada={exemplo.selecionada}
              destinos={exemplo.destinos}
              alvosPoder={null}
              destaques={[]}
              podeArrastar={() => false}
              aoTocarCasa={SEM_ACAO}
              aoSoltar={SEM_ACAO}
            />
          </div>
          <p className="dica">Prévia ao vivo. O tabuleiro e as peças mudam na hora e ficam salvos neste navegador.</p>
        </section>

        <SeletorVisual />
      </div>

      <div className="acoes">
        <button type="button" className="botao" onClick={aoVoltar}>
          Pronto
        </button>
      </div>
    </div>
  );
}
