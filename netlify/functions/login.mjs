// POST /api/login - confere usuário e senha do gerador de orçamentos e abre a sessão.
//
// Variáveis de ambiente (painel da Netlify): GERADOR_USUARIO, GERADOR_SENHA_HASH, SESSAO_SEGREDO.
// Gerar com: node scripts/gerador/configurar.mjs senha

import { senhaConfere, textosIguais } from "../lib/cripto.mjs";
import { criarToken, cookieDeSessao } from "../lib/sessao.mjs";
import { json, mesmaOrigem, erroDeConfiguracao } from "../lib/http.mjs";

const TAMANHO_MAXIMO = 200;

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405, { Allow: "POST" });
  if (!mesmaOrigem(req)) return json({ erro: "Origem não permitida." }, 403);

  let corpo;
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Requisição inválida." }, 400);
  }
  const { usuario, senha } = corpo ?? {};
  if (typeof usuario !== "string" || typeof senha !== "string" || !usuario || !senha
      || usuario.length > TAMANHO_MAXIMO || senha.length > TAMANHO_MAXIMO) {
    return json({ erro: "Informe usuário e senha." }, 400);
  }

  try {
    const usuarioEsperado = (process.env.GERADOR_USUARIO ?? "").trim().toLowerCase();
    if (!usuarioEsperado) throw new Error("GERADOR_USUARIO ausente");
    // A senha é sempre conferida, mesmo com usuário errado - assim o tempo de resposta não
    // denuncia se o usuário existe.
    const senhaOk = senhaConfere(senha, process.env.GERADOR_SENHA_HASH);
    const usuarioOk = textosIguais(usuario.trim().toLowerCase(), usuarioEsperado);
    if (senhaOk && usuarioOk) return json({ ok: true }, 200, { "Set-Cookie": cookieDeSessao(criarToken()) });
  } catch (erro) {
    return erroDeConfiguracao(erro);
  }

  return json({ erro: "Usuário ou senha incorretos." }, 401);
};

// No plano gratuito a Netlify permite 2 regras de limite por projeto: esta (login) e a de /api/tabela.
export const config = {
  path: "/api/login",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
