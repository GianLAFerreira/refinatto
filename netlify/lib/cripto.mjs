// Criptografia da tabela de preços (AES-256-GCM) e hash de senha (scrypt).
//
// A tabela de custos é confidencial: o que fica no repositório (público) é só o resultado de
// criptografarTabela(), e a chave vive na variável de ambiente TABELA_CHAVE da Netlify. Sem a
// chave, o arquivo tabela.enc.mjs não revela nada.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const ALGORITMO = "aes-256-gcm";

// Custo do scrypt: N=2^15 leva ~100 ms por tentativa, o que torna força bruta offline (caso o hash
// vaze) bem mais cara, sem pesar no login legítimo.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, tamanho: 64 };
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export function lerChave(base64 = process.env.TABELA_CHAVE) {
  const chave = Buffer.from(base64 ?? "", "base64");
  if (chave.length !== 32) throw new Error("TABELA_CHAVE ausente ou inválida (precisa de 32 bytes em base64)");
  return chave;
}

export function criptografarTabela(objeto, chave) {
  const iv = randomBytes(12);
  const cifra = createCipheriv(ALGORITMO, chave, iv);
  const dados = Buffer.concat([cifra.update(JSON.stringify(objeto), "utf8"), cifra.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cifra.getAuthTag().toString("base64"),
    dados: dados.toString("base64"),
  };
}

export function descriptografarTabela(pacote, chave) {
  const decifra = createDecipheriv(ALGORITMO, chave, Buffer.from(pacote.iv, "base64"));
  decifra.setAuthTag(Buffer.from(pacote.tag, "base64"));
  const texto = Buffer.concat([decifra.update(Buffer.from(pacote.dados, "base64")), decifra.final()]);
  return JSON.parse(texto.toString("utf8"));
}

// Formato guardado em GERADOR_SENHA_HASH: scrypt$N$r$p$sal$hash (sal e hash em base64).
export function gerarHashSenha(senha) {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, SCRYPT.tamanho, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT_MAXMEM });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, sal.toString("base64"), hash.toString("base64")].join("$");
}

export function senhaConfere(senha, hashGuardado) {
  const partes = String(hashGuardado ?? "").split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") throw new Error("GERADOR_SENHA_HASH ausente ou em formato inválido");
  const [, N, r, p, salB64, hashB64] = partes;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = scryptSync(senha, Buffer.from(salB64, "base64"), esperado.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM,
  });
  return timingSafeEqual(calculado, esperado);
}

// Comparação de texto em tempo constante (compara os hashes, então o tamanho não vaza).
export function textosIguais(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}
