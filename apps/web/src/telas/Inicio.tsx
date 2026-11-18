import { useState, type ReactNode } from "react";
import type { Cor, NivelIA } from "@xadrez/engine";
import { IconePeca } from "../componentes/PecaSvg.tsx";
import { NOME_NIVEL, REGRAS, type ModoPartida, type RegrasPartida } from "../modo.ts";
import { criarSala, ONLINE_DISPONIVEL } from "../online/conexao.ts";
import { lerProgresso } from "../progresso.ts";

const CHAVE_APELIDO = "xadrez-apelido";

const DESCRICAO_NIVEL: Record<NivelIA, string> = {
  facil: "Olha só 1 lance à frente e erra de propósito.",
  medio: "Pensa 3 lances à frente e usa o poder dela.",
  dificil: "Pensa 4 lances à frente, sem dar moleza.",
};

type EscolhaCor = Cor | "aleatoria";
type Adversario = "ia" | "local" | "online";

function lerApelido(): string {
  try {
    return localStorage.getItem(CHAVE_APELIDO) ?? "";
  } catch {
    return "";
  }
}

interface Props {
  aoJogar(modo: ModoPartida): void;
  aoPersonalizar(): void;
  aoVerProgresso(): void;
}

export function Inicio({ aoJogar, aoPersonalizar, aoVerProgresso }: Props) {
  const [apelido, setApelido] = useState(lerApelido);
  const [configurando, setConfigurando] = useState<Adversario | null>(null);
  const [regras, setRegras] = useState<RegrasPartida>("padrao");
  const [nivel, setNivel] = useState<NivelIA>("medio");
  const [cor, setCor] = useState<EscolhaCor>("brancas");
  const [casasEspeciais, setCasasEspeciais] = useState(false);
  const [minutos, setMinutos] = useState<3 | 5 | 10 | null>(5);
  const [codigo, setCodigo] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroSala, setErroSala] = useState<string | null>(null);

  function salvarApelido(valor: string) {
    setApelido(valor);
    try {
      localStorage.setItem(CHAVE_APELIDO, valor);
    } catch {
      // Sem localStorage (janela privada): o apelido só vale nesta visita.
    }
  }

  async function criarSalaOnline() {
    setCriando(true);
    setErroSala(null);
    try {
      const novo = await criarSala({ regras, casasEspeciais, minutos, cor });
      location.hash = `sala-${novo}`;
    } catch (erro) {
      setErroSala(erro instanceof Error ? erro.message : "Não deu para criar a sala.");
    } finally {
      setCriando(false);
    }
  }

  function comecar() {
    if (configurando === "online") {
      void criarSalaOnline();
      return;
    }
    if (configurando === "local") {
      aoJogar({ tipo: "local", regras, casasEspeciais });
      return;
    }
    const corHumano: Cor = cor === "aleatoria" ? (Math.random() < 0.5 ? "brancas" : "pretas") : cor;
    aoJogar({ tipo: "ia", nivel, corHumano, regras, casasEspeciais });
  }

  const progresso = lerProgresso();
  const conquistas = Object.keys(progresso.conquistas).length;

  return (
    <main className="tela-inicio">
      <section className="heroi" aria-labelledby="titulo-jogo">
        <div className="leque" aria-hidden="true">
          <div className="carta-deco carta-deco-poder">
            <span>Poder</span>
            <IconePeca tipo="cavalo" cor="brancas" tamanho={54} />
          </div>
          <div className="carta-deco carta-deco-virada">?</div>
          <div className="carta-deco carta-deco-desvantagem">
            <span>Desvantagem</span>
            <IconePeca tipo="rei" cor="pretas" tamanho={54} />
          </div>
        </div>
        <h1 id="titulo-jogo" className="titulo-jogo">
          Secret Chess
        </h1>
        <p className="subtitulo">
          Cada lado recebe em segredo um poder e uma desvantagem. Vence quem capturar o rei — ou der xeque-mate.
        </p>
      </section>

      {configurando ? (
        <section className="config-ia painel-menu" aria-label={configurando === "ia" ? "Jogar contra a IA" : "Partida local"}>
          <h2 className="config-titulo">
            {configurando === "ia" ? "Jogar contra a IA" : configurando === "online" ? "Jogar com amigo (online)" : "Partida local (2 jogadores)"}
          </h2>

          <fieldset className="grupo-opcoes">
            <legend>Modo de jogo</legend>
            {REGRAS.map((r) => (
              <label
                key={r.id}
                className={`opcao ${regras === r.id ? "opcao-ativa" : ""} ${r.pronto ? "" : "opcao-desligada"}`}
              >
                <input
                  type="radio"
                  name="regras"
                  checked={regras === r.id}
                  disabled={!r.pronto}
                  onChange={() => setRegras(r.id)}
                />
                <strong>
                  {r.nome}
                  {!r.pronto && <small className="selo-breve">em breve</small>}
                </strong>
                <span className="dica">{r.descricao}</span>
              </label>
            ))}
          </fieldset>

          <label className={`opcao opcao-casas ${casasEspeciais ? "opcao-ativa" : ""}`}>
            <span className="campo-liga">
              <input type="checkbox" checked={casasEspeciais} onChange={(ev) => setCasasEspeciais(ev.target.checked)} />
              <strong>Casas especiais</strong>
            </span>
            <span className="dica">
              Sorteia 4 tipos (portal, lama, vulcão, névoa...) para o meio do tabuleiro, espelhados para os dois lados.
            </span>
          </label>

          {configurando === "online" && (
            <fieldset className="grupo-opcoes grupo-linha grupo-quatro">
              <legend>Relógio (para cada lado)</legend>
              {(
                [
                  [null, "Sem tempo"],
                  [3, "3 min"],
                  [5, "5 min"],
                  [10, "10 min"],
                ] as const
              ).map(([valor, rotulo]) => (
                <label key={rotulo} className={`opcao ${minutos === valor ? "opcao-ativa" : ""}`}>
                  <input type="radio" name="minutos" checked={minutos === valor} onChange={() => setMinutos(valor)} />
                  <strong>{rotulo}</strong>
                </label>
              ))}
            </fieldset>
          )}

          {configurando === "ia" && (
            <>
              <fieldset className="grupo-opcoes">
                <legend>Nível</legend>
                {(Object.keys(NOME_NIVEL) as NivelIA[]).map((n) => (
                  <label key={n} className={`opcao ${nivel === n ? "opcao-ativa" : ""}`}>
                    <input type="radio" name="nivel" checked={nivel === n} onChange={() => setNivel(n)} />
                    <strong>{NOME_NIVEL[n]}</strong>
                    <span className="dica">{DESCRICAO_NIVEL[n]}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="grupo-opcoes grupo-linha">
                <legend>Você joga com</legend>
                {(
                  [
                    ["brancas", "Brancas"],
                    ["pretas", "Pretas"],
                    ["aleatoria", "Sortear"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label key={valor} className={`opcao ${cor === valor ? "opcao-ativa" : ""}`}>
                    <input type="radio" name="cor" checked={cor === valor} onChange={() => setCor(valor)} />
                    <strong>{rotulo}</strong>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {configurando === "online" && (
            <fieldset className="grupo-opcoes grupo-linha">
              <legend>Você joga com</legend>
              {(
                [
                  ["brancas", "Brancas"],
                  ["pretas", "Pretas"],
                  ["aleatoria", "Sortear"],
                ] as const
              ).map(([valor, rotulo]) => (
                <label key={valor} className={`opcao ${cor === valor ? "opcao-ativa" : ""}`}>
                  <input type="radio" name="cor-online" checked={cor === valor} onChange={() => setCor(valor)} />
                  <strong>{rotulo}</strong>
                </label>
              ))}
            </fieldset>
          )}

          {erroSala && <p className="aviso-erro">{erroSala}</p>}

          <div className="menu">
            <button type="button" className="botao botao-grande" onClick={comecar} disabled={criando}>
              {configurando === "online" ? (criando ? "Criando a sala…" : "Criar sala e gerar link") : "Começar"}
            </button>
            <button type="button" className="botao-link" onClick={() => setConfigurando(null)}>
              Voltar
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="jogador painel-menu" aria-label="Seu perfil">
            <label className="campo campo-apelido">
              <span>Seu apelido</span>
              <input
                value={apelido}
                maxLength={20}
                placeholder="Ex.: Cavaleiro99"
                onChange={(e) => salvarApelido(e.target.value)}
              />
            </label>
            <div className="resumo-progresso">
              <span>
                <strong>{conquistas}</strong> conquista{conquistas === 1 ? "" : "s"}
              </span>
              <span>
                <strong>{progresso.partidas.length}</strong> partida{progresso.partidas.length === 1 ? "" : "s"}
              </span>
            </div>
          </section>

          <nav className="menu-principal" aria-label="Menu principal">
            <BotaoMenu
              destaque
              icone={<IconePeca tipo="rei" cor="pretas" tamanho={46} />}
              titulo="Jogar contra IA"
              texto="3 níveis — a IA também tem cartas"
              aoClicar={() => setConfigurando("ia")}
            />
            <BotaoMenu
              icone={
                <span className="icones-duplos">
                  <IconePeca tipo="cavalo" cor="brancas" tamanho={38} />
                  <IconePeca tipo="cavalo" cor="pretas" tamanho={38} />
                </span>
              }
              titulo="Partida local"
              texto="Dois jogadores no mesmo computador"
              aoClicar={() => setConfigurando("local")}
            />
            <BotaoMenu
              icone={<span className="icone-emoji">🔗</span>}
              titulo="Jogar com amigo"
              texto={ONLINE_DISPONIVEL ? "Crie uma sala e mande o link" : "Em breve nesta versão do site"}
              desligado={!ONLINE_DISPONIVEL}
              aoClicar={() => setConfigurando("online")}
            />
            <BotaoMenu
              icone={<span className="icone-emoji">🏆</span>}
              titulo="Conquistas e histórico"
              texto="Conquistas, partidas salvas e estatísticas"
              aoClicar={aoVerProgresso}
            />
            <BotaoMenu
              icone={<span className="icone-emoji">🎨</span>}
              titulo="Personalizar"
              texto="Tabuleiro, peças e cores"
              aoClicar={aoPersonalizar}
            />
          </nav>

          {ONLINE_DISPONIVEL && (
          <form
            className="entrar-codigo"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (codigo.trim().length >= 4) location.hash = `sala-${codigo.trim().toUpperCase()}`;
            }}
          >
            <label htmlFor="codigo-sala">Recebeu um código?</label>
            <input
              id="codigo-sala"
              value={codigo}
              maxLength={8}
              placeholder="Ex.: 7K3QX"
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            <button type="submit" className="botao botao-secundario" disabled={codigo.trim().length < 4}>
              Entrar
            </button>
          </form>
          )}
        </>
      )}
    </main>
  );
}

interface PropsBotaoMenu {
  icone: ReactNode;
  titulo: string;
  texto: string;
  destaque?: boolean;
  desligado?: boolean;
  aoClicar?(): void;
}

/** Cartão grande do menu principal (ícone, título e uma linha explicando). */
function BotaoMenu({ icone, titulo, texto, destaque, desligado, aoClicar }: PropsBotaoMenu) {
  return (
    <button
      type="button"
      className={`botao-menu ${destaque ? "botao-menu-destaque" : ""}`}
      disabled={desligado}
      onClick={aoClicar}
    >
      <span className="botao-menu-icone" aria-hidden="true">
        {icone}
      </span>
      <span className="botao-menu-texto">
        <strong>{titulo}</strong>
        <small>{texto}</small>
      </span>
    </button>
  );
}
