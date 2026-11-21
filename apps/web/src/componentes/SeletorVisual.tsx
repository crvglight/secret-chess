import {
  CORES_DAS_SETAS,
  ESTILOS,
  TAMANHOS,
  TEMAS,
  useVisual,
  type CoresPersonalizadas,
  type Visual,
} from "../visual.tsx";
import { IconePeca } from "./PecaSvg.tsx";

/** Amostra 4 x 4 das casas de um tema (o tema vale só dentro do data-tabuleiro). */
function AmostraTabuleiro() {
  return (
    <svg viewBox="0 0 4 4" width="56" height="56" className="amostra-tabuleiro" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          className={(Math.floor(i / 4) + i) % 2 === 0 ? "casa-clara" : "casa-escura"}
          x={i % 4}
          y={Math.floor(i / 4)}
          width="1"
          height="1"
        />
      ))}
    </svg>
  );
}

const NOMES_CORES: { chave: keyof CoresPersonalizadas; nome: string; grupo: "tabuleiro" | "pecas" }[] = [
  { chave: "casaClara", nome: "Casas claras", grupo: "tabuleiro" },
  { chave: "casaEscura", nome: "Casas escuras", grupo: "tabuleiro" },
  { chave: "selecao", nome: "Seleção e último lance", grupo: "tabuleiro" },
  { chave: "pecaBranca", nome: "Brancas: corpo", grupo: "pecas" },
  { chave: "pecaBrancaContorno", nome: "Brancas: contorno", grupo: "pecas" },
  { chave: "pecaPreta", nome: "Pretas: corpo", grupo: "pecas" },
  { chave: "pecaPretaContorno", nome: "Pretas: contorno", grupo: "pecas" },
];

type Chave = "coordenadas" | "ultimoLance" | "lancesPossiveis" | "animacao" | "som";
const LIGA_DESLIGA: { chave: Chave; nome: string }[] = [
  { chave: "coordenadas", nome: "Mostrar coordenadas (a–h, 1–8)" },
  { chave: "ultimoLance", nome: "Destacar o último lance" },
  { chave: "lancesPossiveis", nome: "Mostrar os lances possíveis" },
  { chave: "animacao", nome: "Animar as peças ao mover" },
  { chave: "som", nome: "Sons (lance, captura, xeque, fim)" },
];

/** Escolha do visual (tabuleiro, peças, cores e ajustes). Muda e salva na hora. */
export function SeletorVisual() {
  const { visual, mudar, restaurar } = useVisual();
  const mudarCor = (chave: keyof CoresPersonalizadas, valor: string) =>
    mudar({ cores: { ...visual.cores, [chave]: valor } });
  const estiloAceitaCor = ESTILOS.find((e) => e.id === visual.pecas)?.aceitaCor ?? true;

  return (
    <div className="seletor-visual">
      <fieldset className="grupo-opcoes">
        <legend>Tabuleiro</legend>
        <div className="grade-opcoes">
          {TEMAS.map((t) => (
            <label key={t.id} className={`opcao opcao-visual ${visual.tabuleiro === t.id ? "opcao-ativa" : ""}`}>
              <input
                type="radio"
                name="tema-tabuleiro"
                checked={visual.tabuleiro === t.id}
                onChange={() => mudar({ tabuleiro: t.id })}
              />
              <span data-tabuleiro={t.id}>
                <AmostraTabuleiro />
              </span>
              <strong>{t.nome}</strong>
              <span className="dica">{t.descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grupo-opcoes">
        <legend>Peças</legend>
        <div className="grade-opcoes">
          {ESTILOS.map((e) => (
            <label key={e.id} className={`opcao opcao-visual ${visual.pecas === e.id ? "opcao-ativa" : ""}`}>
              <input
                type="radio"
                name="estilo-pecas"
                checked={visual.pecas === e.id}
                onChange={() => mudar({ pecas: e.id })}
              />
              <span className="amostra-pecas" aria-hidden="true">
                <IconePeca tipo="cavalo" cor="brancas" estilo={e.id} tamanho={34} />
                <IconePeca tipo="rei" cor="pretas" estilo={e.id} tamanho={34} />
              </span>
              <strong>{e.nome}</strong>
              <span className="dica">{e.descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grupo-opcoes">
        <legend>Cores personalizadas</legend>
        <p className="dica">
          As cores do tabuleiro valem no tema <strong>Personalizado</strong>.
          {visual.tabuleiro !== "personalizado" && (
            <>
              {" "}
              <button type="button" className="botao-link" onClick={() => mudar({ tabuleiro: "personalizado" })}>
                Usar o tema Personalizado
              </button>
            </>
          )}
        </p>
        <div className="grade-cores">
          {NOMES_CORES.filter((c) => c.grupo === "tabuleiro").map(({ chave, nome }) => (
            <label key={chave} className="campo-cor">
              <input type="color" value={visual.cores[chave]} onChange={(ev) => mudarCor(chave, ev.target.value)} />
              {nome}
            </label>
          ))}
        </div>

        <label className="campo-liga">
          <input
            type="checkbox"
            checked={visual.coresNasPecas}
            onChange={(ev) => mudar({ coresNasPecas: ev.target.checked })}
          />
          Usar minhas cores nas peças
        </label>
        {visual.coresNasPecas && !estiloAceitaCor && (
          <p className="dica">O estilo de peças escolhido tem cores próprias e não muda de cor.</p>
        )}
        {visual.coresNasPecas && (
          <div className="grade-cores">
            {NOMES_CORES.filter((c) => c.grupo === "pecas").map(({ chave, nome }) => (
              <label key={chave} className="campo-cor">
                <input type="color" value={visual.cores[chave]} onChange={(ev) => mudarCor(chave, ev.target.value)} />
                {nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="grupo-opcoes">
        <legend>Ajustes</legend>
        {LIGA_DESLIGA.map(({ chave, nome }) => (
          <label key={chave} className="campo-liga">
            <input
              type="checkbox"
              checked={visual[chave]}
              onChange={(ev) => mudar({ [chave]: ev.target.checked } as Partial<Visual>)}
            />
            {nome}
          </label>
        ))}

        <div className="linha-ajuste">
          <span>Tamanho do tabuleiro</span>
          <div className="botoes-segmentados" role="radiogroup" aria-label="Tamanho do tabuleiro">
            {TAMANHOS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={visual.tamanho === t.id}
                className={visual.tamanho === t.id ? "ativo" : ""}
                onClick={() => mudar({ tamanho: t.id })}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="linha-ajuste">
          <span>Cor das setas (botão direito)</span>
          <div className="paleta" role="radiogroup" aria-label="Cor das setas">
            {CORES_DAS_SETAS.map((cor) => (
              <button
                key={cor}
                type="button"
                role="radio"
                aria-checked={visual.corSetas === cor}
                aria-label={`Cor ${cor}`}
                className={`amostra-cor ${visual.corSetas === cor ? "ativo" : ""}`}
                style={{ background: cor }}
                onClick={() => mudar({ corSetas: cor })}
              />
            ))}
          </div>
        </div>
      </fieldset>

      <button type="button" className="botao-link restaurar" onClick={restaurar}>
        Restaurar o visual padrão
      </button>
    </div>
  );
}
