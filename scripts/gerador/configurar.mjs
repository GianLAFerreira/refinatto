#!/usr/bin/env node
// Configuração do gerador de orçamentos. Rode da raiz do projeto:
//
//   node scripts/gerador/configurar.mjs segredos         cria SESSAO_SEGREDO e TABELA_CHAVE no .env (se faltarem)
//   node scripts/gerador/configurar.mjs senha            define usuário e senha (pede no terminal, sem mostrar)
//   node scripts/gerador/configurar.mjs criptografar     privado/tabela-precos.json -> netlify/lib/tabela.enc.mjs
//   node scripts/gerador/configurar.mjs descriptografar  netlify/lib/tabela.enc.mjs -> privado/tabela-precos.json
//
// O .env e a pasta privado/ estão no .gitignore. Os valores do .env precisam ser copiados para as
// variáveis de ambiente do site na Netlify (ver CLAUDE.md). Este script nunca imprime os segredos.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { criptografarTabela, descriptografarTabela, gerarHashSenha, lerChave } from "../../netlify/lib/cripto.mjs";

const ARQUIVO_ENV = process.env.GERADOR_ENV ?? ".env";
const TABELA_PURA = "privado/tabela-precos.json";
const TABELA_CRIPTOGRAFADA = "netlify/lib/tabela.enc.mjs";
const SENHA_MINIMA = 12;

async function lerEnv() {
  if (!existsSync(ARQUIVO_ENV)) return {};
  const valores = {};
  for (const linha of (await readFile(ARQUIVO_ENV, "utf8")).split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) valores[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return valores;
}

async function gravarEnv(valores) {
  const conteudo = Object.entries(valores).map(([k, v]) => `${k}="${v}"`).join("\n") + "\n";
  await writeFile(ARQUIVO_ENV, conteudo, { mode: 0o600 });
}

function perguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) rl._writeToOutput = (s) => { if (s.startsWith(texto)) rl.output.write(texto); };
    rl.question(texto, (resposta) => {
      rl.close();
      if (oculto) process.stdout.write("\n");
      resolve(resposta);
    });
  });
}

async function segredos() {
  const env = await lerEnv();
  const criados = [];
  if (!env.SESSAO_SEGREDO) { env.SESSAO_SEGREDO = randomBytes(48).toString("base64url"); criados.push("SESSAO_SEGREDO"); }
  if (!env.TABELA_CHAVE) { env.TABELA_CHAVE = randomBytes(32).toString("base64"); criados.push("TABELA_CHAVE"); }
  await gravarEnv(env);
  console.log(criados.length ? `Criado(s) em ${ARQUIVO_ENV}: ${criados.join(", ")}` : `Nada a fazer: ${ARQUIVO_ENV} já tem os segredos.`);
}

async function senha() {
  const usuario = (await perguntar("Usuário: ")).trim();
  if (!usuario) throw new Error("Usuário vazio.");
  const senha1 = await perguntar("Senha: ", { oculto: true });
  if (senha1.length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  const senha2 = await perguntar("Repita a senha: ", { oculto: true });
  if (senha1 !== senha2) throw new Error("As senhas não conferem.");

  const env = await lerEnv();
  env.GERADOR_USUARIO = usuario;
  env.GERADOR_SENHA_HASH = gerarHashSenha(senha1);
  await gravarEnv(env);
  console.log(`Usuário e hash da senha gravados em ${ARQUIVO_ENV}. Atualize também na Netlify.`);
}

async function criptografar() {
  const env = await lerEnv();
  const tabela = JSON.parse(await readFile(TABELA_PURA, "utf8"));
  const pacote = criptografarTabela(tabela, lerChave(env.TABELA_CHAVE));
  const conteudo = "// Gerado por scripts/gerador/configurar.mjs criptografar - não editar à mão.\n"
    + "// Tabela de custos criptografada (AES-256-GCM); a chave fica em TABELA_CHAVE, fora do repositório.\n"
    + `export default ${JSON.stringify(pacote, null, 2)};\n`;
  await writeFile(TABELA_CRIPTOGRAFADA, conteudo);
  console.log(`${TABELA_PURA} criptografada em ${TABELA_CRIPTOGRAFADA}.`);
}

async function descriptografar() {
  const env = await lerEnv();
  const { default: pacote } = await import(pathToFileURL(TABELA_CRIPTOGRAFADA).href);
  const tabela = descriptografarTabela(pacote, lerChave(env.TABELA_CHAVE));
  await mkdir("privado", { recursive: true });
  await writeFile(TABELA_PURA, JSON.stringify(tabela, null, 2) + "\n");
  console.log(`${TABELA_CRIPTOGRAFADA} descriptografada em ${TABELA_PURA}.`);
}

const comandos = { segredos, senha, criptografar, descriptografar };
const comando = comandos[process.argv[2]];
if (!comando) {
  console.error("Uso: node scripts/gerador/configurar.mjs <segredos|senha|criptografar|descriptografar>");
  process.exit(1);
}
comando().catch((erro) => {
  console.error(`Erro: ${erro.message}`);
  process.exit(1);
});
