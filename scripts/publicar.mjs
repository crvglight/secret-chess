// Publica o site na Vercel: gera o build da web, copia para publicacao/secret-chess
// (o nome da pasta vira o nome do projeto na Vercel) e faz o deploy de produção.
// Uso: pnpm publicar
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const dist = join(raiz, "apps", "web", "dist");
const destino = join(raiz, "publicacao", "secret-chess");

execSync("pnpm --filter @xadrez/web build", { cwd: raiz, stdio: "inherit" });

// Troca os arquivos do site, mas mantém a pasta .vercel (o vínculo com o projeto).
mkdirSync(destino, { recursive: true });
for (const item of readdirSync(destino)) {
  if (item !== ".vercel") rmSync(join(destino, item), { recursive: true, force: true });
}
cpSync(dist, destino, { recursive: true });

execSync("vercel deploy --prod --yes", { cwd: destino, stdio: "inherit" });
