// Sessão do gerador de orçamentos: um token assinado com HMAC dentro de um cookie HttpOnly.
//
// Não há banco de dados - o token carrega a própria validade e a assinatura (SESSAO_SEGREDO) prova
// que foi o servidor quem emitiu. Trocar SESSAO_SEGREDO na Netlify derruba todas as sessões abertas.

import { createHmac, timingSafeEqual } from "node:crypto";

// Prefixo __Host-: o navegador só aceita o cookie com Secure, Path=/ e sem Domain - impede que um
// subdomínio ou uma conexão sem HTTPS sobrescreva a sessão.
const NOME_COOKIE = "__Host-gerador";
const DURACAO_SEGUNDOS = 12 * 60 * 60;

function segredo() {
  const valor = process.env.SESSAO_SEGREDO ?? "";
  if (valor.length < 32) throw new Error("SESSAO_SEGREDO ausente ou curto demais");
  return valor;
}

function assinar(conteudo) {
  return createHmac("sha256", segredo()).update(conteudo).digest("base64url");
}

export function criarToken(agoraMs = Date.now()) {
  const conteudo = Buffer.from(JSON.stringify({ exp: Math.floor(agoraMs / 1000) + DURACAO_SEGUNDOS })).toString("base64url");
  return `${conteudo}.${assinar(conteudo)}`;
}

export function tokenValido(token, agoraMs = Date.now()) {
  if (typeof token !== "string" || token.length > 512) return false;
  const [conteudo, assinatura, sobra] = token.split(".");
  if (!conteudo || !assinatura || sobra !== undefined) return false;

  const esperada = Buffer.from(assinar(conteudo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(conteudo, "base64url").toString("utf8"));
    return Number.isFinite(exp) && exp > agoraMs / 1000;
  } catch {
    return false;
  }
}

export function lerCookieSessao(req) {
  const cabecalho = req.headers.get("cookie") ?? "";
  for (const parte of cabecalho.split(";")) {
    const [nome, ...valor] = parte.trim().split("=");
    if (nome === NOME_COOKIE) return valor.join("=");
  }
  return null;
}

export function sessaoValida(req) {
  return tokenValido(lerCookieSessao(req));
}

export function cookieDeSessao(token) {
  return `${NOME_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACAO_SEGUNDOS}`;
}

export function cookieDeSaida() {
  return `${NOME_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
