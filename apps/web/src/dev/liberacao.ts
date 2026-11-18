// Quem pode usar a análise ao vivo (Alt+A) no site publicado.
// No `pnpm dev` ela vale sempre. No site, só no navegador que abriu uma vez o link
// com a chave secreta (?chave=...). O código guarda apenas o SHA-256 da chave, que
// não dá para reverter; a chave fica em CHAVE-ANALISE.txt, fora do repositório.

const HASH_DA_CHAVE = "df383be542c2325c0bcccbc7987d76aad520661097fb9a28c2898df3d02e8cab";
const CHAVE_LOCAL = "secret-chess-analise";

async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ler(): string | null {
  try {
    return localStorage.getItem(CHAVE_LOCAL);
  } catch {
    return null;
  }
}

function gravar(valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(CHAVE_LOCAL);
    else localStorage.setItem(CHAVE_LOCAL, valor);
  } catch {
    // Sem localStorage (janela privada): a liberação não fica guardada.
  }
}

/**
 * Lê ?chave= do endereço (e tira do endereço, para não ficar no histórico nem em print).
 * ?chave=sair desliga a análise neste navegador.
 */
export async function guardarChaveDaUrl(): Promise<void> {
  const parametros = new URLSearchParams(location.search);
  const chave = parametros.get("chave");
  if (chave === null) return;
  parametros.delete("chave");
  const busca = parametros.toString();
  history.replaceState(null, "", location.pathname + (busca ? `?${busca}` : "") + location.hash);
  if (chave === "sair") gravar(null);
  else if (crypto.subtle && (await sha256(chave)) === HASH_DA_CHAVE) gravar(chave);
}

let liberada: Promise<boolean> | null = null;

/** A análise ao vivo pode ser usada neste navegador? */
export function analiseLiberada(): Promise<boolean> {
  if (import.meta.env.DEV) return Promise.resolve(true);
  liberada ??= guardarChaveDaUrl().then(async () => {
    const chave = ler();
    return !!chave && !!crypto.subtle && (await sha256(chave)) === HASH_DA_CHAVE;
  });
  return liberada;
}
