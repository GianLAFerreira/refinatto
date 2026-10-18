#!/usr/bin/env node
// Servidor de desenvolvimento: serve o site estático e roteia /api/* para as funções em
// netlify/functions, do mesmo jeito que a Netlify faz em produção. Sem dependências.
//
//   node scripts/servidor-local.mjs            -> http://localhost:8888 (lê o .env da raiz)
//   GERADOR_ENV=outro.env PORTA=9000 node scripts/servidor-local.mjs
//
// Use "localhost" (não 127.0.0.1) no navegador: o cookie de sessão é Secure, e o Chrome só aceita
// cookie Secure sem HTTPS quando o endereço é localhost.

import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = resolve(".");
const PORTA = Number(process.env.PORTA ?? 8888);
const ARQUIVO_ENV = process.env.GERADOR_ENV ?? ".env";
if (existsSync(ARQUIVO_ENV)) process.loadEnvFile(ARQUIVO_ENV);

// Mesmos bloqueios do netlify.toml: nada de código do servidor, scripts ou segredos pela URL.
const BLOQUEADOS = [/^\/netlify\//, /^\/scripts\//, /^\/privado\//, /^\/\.env/, /^\/\.git/, /^\/CLAUDE\.md$/, /^\/netlify\.toml$/];

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

const rotas = new Map();
for (const arquivo of await readdir("netlify/functions")) {
  if (!arquivo.endsWith(".mjs")) continue;
  const modulo = await import(pathToFileURL(join(RAIZ, "netlify/functions", arquivo)).href);
  rotas.set(modulo.config.path, modulo.default);
}

async function lerCorpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return Buffer.concat(partes);
}

async function responderFuncao(req, res, funcao) {
  const corpo = ["GET", "HEAD"].includes(req.method) ? undefined : await lerCorpo(req);
  const requisicao = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: corpo });
  const resposta = await funcao(requisicao, {});
  const cabecalhos = Object.fromEntries(resposta.headers);
  const cookies = resposta.headers.getSetCookie();
  if (cookies.length) cabecalhos["set-cookie"] = cookies;
  res.writeHead(resposta.status, cabecalhos);
  res.end(Buffer.from(await resposta.arrayBuffer()));
}

async function responderArquivo(caminhoUrl, res) {
  let caminho = resolve(RAIZ, "." + decodeURIComponent(caminhoUrl));
  if (caminho !== RAIZ && !caminho.startsWith(RAIZ + sep)) throw Object.assign(new Error(), { status: 404 });
  if ((await stat(caminho)).isDirectory()) caminho = join(caminho, "index.html");
  const conteudo = await readFile(caminho);
  res.writeHead(200, { "Content-Type": TIPOS[extname(caminho)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  res.end(conteudo);
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    const funcao = rotas.get(pathname);
    if (funcao) return await responderFuncao(req, res, funcao);
    if (BLOQUEADOS.some((re) => re.test(pathname))) throw Object.assign(new Error(), { status: 404 });
    if (pathname.startsWith("/gerador") && !pathname.endsWith("/") && !extname(pathname)) {
      res.writeHead(301, { Location: pathname + "/" });
      return res.end();
    }
    await responderArquivo(pathname, res);
  } catch (erro) {
    const status = erro.status ?? (erro.code === "ENOENT" ? 404 : 500);
    if (status === 500) console.error(erro);
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(status === 404 ? "Não encontrado" : "Erro interno");
  }
}).listen(PORTA, "127.0.0.1", () => {
  console.log(`Servidor local em http://localhost:${PORTA} (gerador em /gerador/)`);
});
