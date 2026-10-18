// POST /api/logout - encerra a sessão do gerador apagando o cookie.

import { cookieDeSaida } from "../lib/sessao.mjs";
import { json, mesmaOrigem } from "../lib/http.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405, { Allow: "POST" });
  if (!mesmaOrigem(req)) return json({ erro: "Origem não permitida." }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": cookieDeSaida() });
};

export const config = { path: "/api/logout" };
