// Respostas e verificações comuns às funções do gerador (netlify/functions/*).

export function json(corpo, status = 200, cabecalhosExtras = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...cabecalhosExtras,
    },
  });
}

// Proteção contra CSRF: um POST só vale se o navegador declarar que veio do próprio site. O cookie
// já é SameSite=Strict; isto é a segunda camada.
export function mesmaOrigem(req) {
  const origem = req.headers.get("origin");
  return !!origem && origem === new URL(req.url).origin;
}

export function erroDeConfiguracao(erro) {
  // O detalhe vai pro log da função (visível só no painel da Netlify), nunca pra resposta.
  console.error("[gerador] configuração inválida:", erro.message);
  return json({ erro: "Gerador não configurado no servidor." }, 500);
}
