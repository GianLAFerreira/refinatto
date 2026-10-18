// GET /api/tabela - devolve a tabela de custos descriptografada, só para quem tem sessão válida.

import pacote from "../lib/tabela.enc.mjs";
import { lerChave, descriptografarTabela } from "../lib/cripto.mjs";
import { sessaoValida } from "../lib/sessao.mjs";
import { json, erroDeConfiguracao } from "../lib/http.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ erro: "Método não permitido." }, 405, { Allow: "GET" });

  try {
    if (!sessaoValida(req)) return json({ erro: "Sessão expirada. Entre novamente." }, 401);
    return json(descriptografarTabela(pacote, lerChave()));
  } catch (erro) {
    return erroDeConfiguracao(erro);
  }
};

export const config = {
  path: "/api/tabela",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
