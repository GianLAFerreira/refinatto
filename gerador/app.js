// Gerador de orçamentos - interface.
//
// Fluxo: /api/tabela responde 401 -> tela de login; 200 -> app com a tabela de custos em memória.
// A tabela nunca é gravada no aparelho; o rascunho (cliente, itens, percentual) fica no
// localStorage para não se perder se o navegador do celular recarregar a página.
//
// Todo conteúdo dinâmico entra no DOM por textContent/atributos (função h) - nada de innerHTML com
// dado digitado ou vindo do servidor.

import {
  novaPorta, novoRodape, duplicarItem, calcularItem, resumirOrcamento, descreverItem, medidasDaLinha,
} from "./calculo.js";
import { gerarPdf, formatarMoeda } from "./pdf.js";

const CHAVE_RASCUNHO = "refinatto.gerador.rascunho";
const CHAVE_PERCENTUAL = "refinatto.gerador.percentual";
const PERCENTUAIS_RAPIDOS = [30, 40, 50, 60, 80, 100];
const TEMPO_CONFIRMACAO_MS = 3000;

let tabela = null;
let orcamento = null;
let editandoId = null;
let pdfAtual = null;

const $ = (id) => document.getElementById(id);

// --- DOM ---------------------------------------------------------------------

function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || valor === false) continue;
    if (chave === "class") el.className = valor;
    else if (chave === "text") el.textContent = valor;
    else if (chave.startsWith("on")) el.addEventListener(chave.slice(2).toLowerCase(), valor);
    else if (["value", "checked", "selected", "disabled", "hidden"].includes(chave)) el[chave] = valor;
    else el.setAttribute(chave, valor === true ? "" : String(valor));
  }
  for (const filho of filhos.flat()) {
    if (filho == null || filho === false) continue;
    el.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

function campo(rotulo, controle, ajuda) {
  return h("label", { class: "g-campo" }, h("span", { text: rotulo }), controle, ajuda && h("small", { class: "g-ajuda", text: ajuda }));
}

function selecao(opcoes, valorAtual, aoMudar, props = {}) {
  return h("select", { ...props, onChange: (e) => aoMudar(e.target.value) },
    opcoes.map((o) => h("option", { value: o.valor, selected: String(o.valor) === String(valorAtual), text: o.rotulo })));
}

function chips(opcoes, valorAtual, aoEscolher, rotuloGrupo) {
  return h("div", { class: "g-chips", role: "group", "aria-label": rotuloGrupo },
    opcoes.map((o) => h("button", {
      type: "button",
      class: "g-chip",
      "aria-pressed": String(String(o.valor) === String(valorAtual)),
      text: o.rotulo,
      onClick: () => aoEscolher(o.valor),
    })));
}

function caixa(rotulo, marcado, aoMudar, detalhe) {
  return h("label", { class: "g-caixa" },
    h("input", { type: "checkbox", checked: marcado, onChange: (e) => aoMudar(e.target.checked) }),
    h("span", { class: "g-caixa__texto" }, rotulo, detalhe && h("small", { class: "g-interno", text: detalhe })));
}

function botaoConfirmavel(rotulo, rotuloConfirmar, aoConfirmar, classe) {
  const botao = h("button", { type: "button", class: classe, text: rotulo });
  let temporizador = null;
  botao.addEventListener("click", () => {
    if (botao.dataset.confirmando) {
      clearTimeout(temporizador);
      aoConfirmar();
      return;
    }
    botao.dataset.confirmando = "1";
    botao.textContent = rotuloConfirmar;
    temporizador = setTimeout(() => { delete botao.dataset.confirmando; botao.textContent = rotulo; }, TEMPO_CONFIRMACAO_MS);
  });
  return botao;
}

const moeda = (valor) => formatarMoeda(valor);

// --- Armazenamento local -------------------------------------------------------

function lerLocal(chave) {
  try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
}

function gravarLocal(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado / cota cheia: segue só em memória */ }
}

function orcamentoVazio() {
  const percentual = Number(lerLocal(CHAVE_PERCENTUAL));
  return {
    versao: 1,
    cliente: { nome: "", telefone: "", cidade: "" },
    percentual: Number.isFinite(percentual) && percentual >= 0 ? percentual : 40,
    validadeDias: 7,
    observacoes: "",
    itens: [],
  };
}

function carregarRascunho() {
  const salvo = lerLocal(CHAVE_RASCUNHO);
  if (!salvo || salvo.versao !== 1 || !Array.isArray(salvo.itens) || typeof salvo.cliente !== "object") return orcamentoVazio();
  const base = orcamentoVazio();
  return {
    ...base,
    ...salvo,
    cliente: { ...base.cliente, ...salvo.cliente },
    itens: salvo.itens.filter((i) => i && (i.tipo === "porta" || i.tipo === "rodape") && typeof i.id === "string"),
  };
}

function salvar() {
  gravarLocal(CHAVE_RASCUNHO, orcamento);
}

// --- Telas -------------------------------------------------------------------

function mostrarTela(id) {
  for (const tela of ["telaCarregando", "telaLogin", "telaApp"]) $(tela).hidden = tela !== id;
}

async function iniciar() {
  mostrarTela("telaCarregando");
  let resposta;
  try {
    resposta = await fetch("/api/tabela", { credentials: "same-origin", cache: "no-store" });
  } catch {
    return mostrarFalha("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }
  if (resposta.status === 401) return mostrarLogin();
  if (!resposta.ok) return mostrarFalha("O servidor não respondeu como esperado. Tente de novo em instantes.");

  tabela = await resposta.json();
  orcamento = carregarRascunho();
  editandoId = null;
  mostrarTela("telaApp");
  renderConteudo();
}

function mostrarFalha(mensagem) {
  const tela = $("telaCarregando");
  tela.replaceChildren(
    h("img", { src: "../img/logo-monograma.jpg", alt: "", class: "g-carregando__marca" }),
    h("p", { text: mensagem }),
    h("button", { type: "button", class: "g-btn g-btn--secundario", text: "Tentar de novo", onClick: () => location.reload() }),
  );
  mostrarTela("telaCarregando");
}

function mostrarLogin(mensagem) {
  tabela = null;
  mostrarTela("telaLogin");
  const erro = $("loginErro");
  erro.hidden = !mensagem;
  erro.textContent = mensagem ?? "";
  $("loginSenha").value = "";
  $("loginUsuario").focus();
}

// --- Login ---------------------------------------------------------------------

$("formLogin").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const usuario = $("loginUsuario").value.trim();
  const senha = $("loginSenha").value;
  const erro = $("loginErro");
  if (!usuario || !senha) {
    erro.textContent = "Informe usuário e senha.";
    erro.hidden = false;
    return;
  }

  const botao = $("btnEntrar");
  botao.disabled = true;
  botao.textContent = "Entrando…";
  try {
    const resposta = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });
    if (resposta.ok) {
      $("loginSenha").value = "";
      erro.hidden = true;
      await iniciar();
      return;
    }
    erro.textContent = resposta.status === 429
      ? "Muitas tentativas seguidas. Aguarde um minuto e tente de novo."
      : resposta.status === 401 ? "Usuário ou senha incorretos." : "Não foi possível entrar agora. Tente de novo em instantes.";
  } catch {
    erro.textContent = "Sem conexão com o servidor.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
  erro.hidden = false;
});

$("verSenha").addEventListener("click", (evento) => {
  const input = $("loginSenha");
  const mostrar = input.type === "password";
  input.type = mostrar ? "text" : "password";
  evento.currentTarget.textContent = mostrar ? "Ocultar" : "Ver";
  evento.currentTarget.setAttribute("aria-pressed", String(mostrar));
  evento.currentTarget.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
});

$("btnSair").addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch { /* sai localmente mesmo assim */ }
  mostrarLogin();
});

$("btnModoCliente").addEventListener("click", (evento) => {
  const ativo = document.body.classList.toggle("modo-cliente");
  evento.currentTarget.setAttribute("aria-pressed", String(ativo));
});

// --- Conteúdo principal ------------------------------------------------------

function renderConteudo() {
  const c = orcamento.cliente;
  const atualizarCliente = (chave) => (e) => { c[chave] = e.target.value; salvar(); };

  const inputPercentual = h("input", {
    type: "number", inputmode: "decimal", min: "0", max: "1000", step: "1", value: orcamento.percentual, class: "g-percentual__input",
    onInput: (e) => definirPercentual(e.target.value, false),
  });

  const conteudo = $("conteudo");
  conteudo.replaceChildren(
    h("section", { class: "g-cartao" },
      h("h2", { text: "Cliente" }),
      campo("Nome do cliente", h("input", { type: "text", value: c.nome, maxlength: "120", autocomplete: "off", required: true, id: "clienteNome", onInput: atualizarCliente("nome") })),
      h("div", { class: "g-linha2" },
        campo("Telefone", h("input", { type: "tel", value: c.telefone, maxlength: "40", autocomplete: "off", onInput: atualizarCliente("telefone") })),
        campo("Cidade / bairro", h("input", { type: "text", value: c.cidade, maxlength: "80", autocomplete: "off", onInput: atualizarCliente("cidade") })),
      ),
    ),

    h("section", { class: "g-cartao g-interno" },
      h("h2", { text: "Percentual sobre o custo" }),
      h("p", { class: "g-ajuda", text: "Aplicado em cima do custo da tabela; já cobre a instalação. Não aparece no PDF." }),
      h("div", { class: "g-percentual" }, inputPercentual, h("span", { class: "g-percentual__simbolo", text: "%" })),
      h("div", { id: "chipsPercentual" }),
    ),

    h("section", { class: "g-secao-itens" },
      h("div", { class: "g-secao-itens__topo" },
        h("h2", { text: "Itens do orçamento" }),
        h("span", { class: "g-tabela-versao g-interno", text: tabela.versao }),
      ),
      h("div", { id: "listaItens", class: "g-lista" }),
      h("div", { class: "g-adicionar" },
        h("button", { type: "button", class: "g-btn g-btn--secundario", text: "+ Porta", onClick: () => adicionarItem(novaPorta(tabela)) }),
        h("button", { type: "button", class: "g-btn g-btn--secundario", text: "+ Rodapé", onClick: () => adicionarItem(novoRodape(tabela)) }),
      ),
    ),

    h("section", { class: "g-cartao" },
      h("h2", { text: "Detalhes do PDF" }),
      campo("Validade (dias)", h("input", {
        type: "number", inputmode: "numeric", min: "1", max: "90", value: orcamento.validadeDias,
        onInput: (e) => { orcamento.validadeDias = Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 7)); salvar(); },
      })),
      campo("Observações", h("textarea", {
        rows: "3", maxlength: "1500", placeholder: "Ex: condições de pagamento, prazo de entrega…",
        onInput: (e) => { orcamento.observacoes = e.target.value; salvar(); },
      }, orcamento.observacoes)),
    ),

    h("div", { class: "g-rodape-acoes" },
      botaoConfirmavel("Começar novo orçamento", "Toque de novo para apagar tudo", novoOrcamento, "g-link g-link--perigo"),
    ),
  );

  renderChipsPercentual();
  renderItens();
}

function renderChipsPercentual() {
  $("chipsPercentual").replaceChildren(chips(
    PERCENTUAIS_RAPIDOS.map((p) => ({ valor: p, rotulo: `${p}%` })),
    orcamento.percentual,
    (p) => definirPercentual(p, true),
    "Percentuais rápidos",
  ));
}

function definirPercentual(valor, atualizarInput) {
  const numero = Number(String(valor).replace(",", "."));
  orcamento.percentual = Number.isFinite(numero) && numero >= 0 ? Math.min(numero, 1000) : 0;
  gravarLocal(CHAVE_PERCENTUAL, orcamento.percentual);
  salvar();
  if (atualizarInput) document.querySelector(".g-percentual__input").value = orcamento.percentual;
  renderChipsPercentual();
  atualizarValores();
}

function novoOrcamento() {
  orcamento = orcamentoVazio();
  editandoId = null;
  salvar();
  renderConteudo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Itens -----------------------------------------------------------------------

function adicionarItem(item) {
  orcamento.itens.push(item);
  editandoId = item.id;
  salvar();
  renderItens();
  document.querySelector(`[data-item-id="${item.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function itemPorId(id) {
  return orcamento.itens.find((i) => i.id === id);
}

function rotuloDoItem(item) {
  const mesmoTipo = orcamento.itens.filter((i) => i.tipo === item.tipo);
  const numero = mesmoTipo.indexOf(item) + 1;
  const base = `${item.tipo === "porta" ? "Porta" : "Rodapé"} ${numero}`;
  return item.identificacao ? `${base} · ${item.identificacao}` : base;
}

function renderItens() {
  const lista = $("listaItens");
  if (!orcamento.itens.length) {
    lista.replaceChildren(h("p", { class: "g-vazio", text: "Nenhum item ainda. Adicione uma porta ou um rodapé." }));
  } else {
    lista.replaceChildren(...orcamento.itens.map((item) => (item.id === editandoId ? cartaoEditor(item) : cartaoResumo(item))));
  }
  atualizarValores();
}

function cartaoResumo(item) {
  const calculo = calcularItem(item, tabela);
  const descricao = calculo.erro ? null : descreverItem(item, calculo, tabela);
  const quantidade = item.tipo === "porta" && !calculo.erro ? `${calculo.quantidade}× ` : "";

  return h("article", { class: `g-item${calculo.erro ? " g-item--erro" : ""}`, "data-item-id": item.id },
    h("button", { type: "button", class: "g-item__corpo", onClick: () => editar(item.id), "aria-label": `Editar ${rotuloDoItem(item)}` },
      h("span", { class: "g-item__rotulo", text: rotuloDoItem(item) }),
      calculo.erro
        ? h("span", { class: "g-item__erro", text: calculo.erro })
        : h("span", { class: "g-item__descricao", text: quantidade + descricao.titulo }),
      descricao?.detalhes.length ? h("span", { class: "g-item__detalhes", text: descricao.detalhes.join(", ") }) : null,
      h("span", { class: "g-item__valores", "data-valores": item.id }),
    ),
    h("div", { class: "g-item__acoes" },
      h("button", { type: "button", class: "g-link", text: "Editar", onClick: () => editar(item.id) }),
      h("button", { type: "button", class: "g-link", text: "Duplicar", onClick: () => duplicar(item.id) }),
      botaoConfirmavel("Remover", "Confirmar remoção", () => remover(item.id), "g-link g-link--perigo"),
    ),
  );
}

function editar(id) {
  editandoId = id;
  renderItens();
  document.querySelector(`[data-item-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function duplicar(id) {
  const original = itemPorId(id);
  const copia = duplicarItem(original);
  orcamento.itens.splice(orcamento.itens.indexOf(original) + 1, 0, copia);
  salvar();
  renderItens();
}

function remover(id) {
  orcamento.itens = orcamento.itens.filter((i) => i.id !== id);
  if (editandoId === id) editandoId = null;
  salvar();
  renderItens();
}

// Atualiza o item e decide o quanto redesenhar: mudanças de estrutura (abertura, linha, medida...)
// redesenham o editor; digitação só recalcula os valores, para o campo não perder o foco.
function alterar(item, mutar, { estrutura = false } = {}) {
  mutar(item);
  salvar();
  if (estrutura) {
    const atual = document.querySelector(`[data-item-id="${item.id}"]`);
    atual?.replaceWith(cartaoEditor(item));
  }
  atualizarValores();
}

function cartaoEditor(item) {
  const corpo = item.tipo === "porta" ? editorPorta(item) : editorRodape(item);
  return h("article", { class: "g-item g-item--editando", "data-item-id": item.id },
    h("div", { class: "g-item__cabecalho" },
      h("h3", { text: rotuloDoItem(item) }),
      h("span", { class: "g-item__valores", "data-valores": item.id }),
    ),
    campo("Identificação (opcional, aparece no PDF)", h("input", {
      type: "text", value: item.identificacao, maxlength: "60", placeholder: item.tipo === "porta" ? "Ex: Quarto do casal" : "Ex: Sala e corredor",
      onInput: (e) => alterar(item, (i) => { i.identificacao = e.target.value; }),
    })),
    corpo,
    h("div", { class: "g-calculo g-interno", "data-calculo": item.id }),
    h("div", { class: "g-item__rodape" },
      botaoConfirmavel("Remover", "Confirmar remoção", () => remover(item.id), "g-link g-link--perigo"),
      h("button", { type: "button", class: "g-btn g-btn--primario", text: "Concluir", onClick: () => { editandoId = null; renderItens(); } }),
    ),
  );
}

function grupo(titulo, ...conteudo) {
  return h("fieldset", { class: "g-grupo" }, h("legend", { text: titulo }), ...conteudo);
}

function stepper(valor, aoMudar, { min = 1, max = 99 } = {}) {
  const input = h("input", {
    type: "number", inputmode: "numeric", min: String(min), max: String(max), value: valor, class: "g-stepper__input", "aria-label": "Quantidade",
    onInput: (e) => aoMudar(e.target.value),
  });
  const passo = (delta) => {
    const novo = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + delta));
    input.value = novo;
    aoMudar(novo);
  };
  return h("div", { class: "g-stepper" },
    h("button", { type: "button", class: "g-stepper__btn", "aria-label": "Diminuir", text: "−", onClick: () => passo(-1) }),
    input,
    h("button", { type: "button", class: "g-stepper__btn", "aria-label": "Aumentar", text: "+", onClick: () => passo(1) }),
  );
}

const custoTexto = (valor) => `custo ${moeda(valor)}`;

function editorPorta(porta) {
  const linha = tabela.folhas.find((f) => f.id === porta.linha);
  const abertura = tabela.aberturas.find((a) => a.id === porta.abertura) ?? tabela.aberturas[0];
  const sobMedida = porta.medida === "sob_medida";
  const estrutura = { estrutura: true };

  const medidas = medidasDaLinha(tabela, porta.linha).map((m) => ({ valor: m.id, rotulo: `${m.largura} × ${m.altura} mm` }));

  return h("div", { class: "g-editor" },
    grupo("Quantidade", stepper(porta.quantidade, (v) => alterar(porta, (p) => { p.quantidade = v; }), { min: 1, max: 99 })),

    grupo("Abertura", chips(
      tabela.aberturas.map((a) => ({ valor: a.id, rotulo: a.rotulo })),
      porta.abertura,
      (v) => alterar(porta, (p) => { p.abertura = v; p.kitDesmarcado = []; }, estrutura),
      "Tipo de abertura",
    )),

    grupo("Folha",
      campo("Linha", selecao(tabela.folhas.map((f) => ({ valor: f.id, rotulo: f.rotulo })), porta.linha, (v) => alterar(porta, (p) => {
        p.linha = v;
        const disponiveis = medidasDaLinha(tabela, v);
        if (p.medida !== "sob_medida" && !disponiveis.some((m) => m.id === p.medida)) p.medida = disponiveis[0]?.id ?? "sob_medida";
        if (!tabela.folhas.find((f) => f.id === v)?.friso) p.friso = false;
      }, estrutura))),
      campo("Medida (largura × altura)", selecao(
        [...medidas, { valor: "sob_medida", rotulo: "Medida especial (sob medida)" }],
        porta.medida,
        (v) => alterar(porta, (p) => { p.medida = v; }, estrutura),
      )),
      sobMedida && h("div", { class: "g-linha2" },
        campo("Largura (mm)", h("input", {
          type: "number", inputmode: "numeric", min: "1", value: porta.sobMedida.largura, placeholder: "850",
          onInput: (e) => alterar(porta, (p) => { p.sobMedida.largura = e.target.value; }),
        })),
        campo("Altura (mm)", h("input", {
          type: "number", inputmode: "numeric", min: "1", value: porta.sobMedida.altura, placeholder: "2100",
          onInput: (e) => alterar(porta, (p) => { p.sobMedida.altura = e.target.value; }),
        })),
      ),
      linha?.friso && caixa("Folha com friso", porta.friso, (v) => alterar(porta, (p) => { p.friso = v; }), `+ ${moeda(linha.friso)} no custo`),
      sobMedida
        ? h("p", { class: "g-aviso", text: `Medida especial: cotada pela próxima medida da tabela, com +${Math.round(tabela.regras.acrescimoForaDoPadrao * 100)}% de porta fora do padrão.` })
        : caixa(`Porta fora do padrão (+${Math.round(tabela.regras.acrescimoForaDoPadrao * 100)}%)`, porta.foraDoPadrao, (v) => alterar(porta, (p) => { p.foraDoPadrao = v; })),
    ),

    grupo("Batente",
      selecao(
        [{ valor: "", rotulo: "Sem batente" }, ...tabela.batentes.precos.map((b) => ({ valor: b.largura, rotulo: `${b.largura} mm` }))],
        porta.batente,
        (v) => alterar(porta, (p) => { p.batente = v; if (!v) p.encaixe = false; }, estrutura),
        { "aria-label": "Batente" },
      ),
      porta.batente && caixa(tabela.batentes.encaixe.rotulo, porta.encaixe, (v) => alterar(porta, (p) => { p.encaixe = v; })),
    ),

    grupo("Guarnição",
      selecao(
        [{ valor: "", rotulo: "Sem guarnição" }, ...tabela.guarnicoes.precos.map((g) => ({ valor: g.id, rotulo: g.rotulo }))],
        porta.guarnicao,
        (v) => alterar(porta, (p) => { p.guarnicao = v; if (!v) p.ambosLados = false; }, estrutura),
        { "aria-label": "Guarnição" },
      ),
      porta.guarnicao && h("div", { class: "g-sub" },
        h("span", { class: "g-sub__rotulo", text: "Regulagem" }),
        chips([{ valor: "35", rotulo: "35 mm" }, { valor: "60", rotulo: "60 mm" }], porta.regulagem,
          (v) => alterar(porta, (p) => { p.regulagem = v; }, estrutura), "Regulagem"),
        h("span", { class: "g-sub__rotulo", text: "Lados" }),
        chips([{ valor: 1, rotulo: "1 lado" }, { valor: 2, rotulo: "2 lados" }], porta.lados,
          (v) => alterar(porta, (p) => { p.lados = v; }, estrutura), "Lados da guarnição"),
        caixa("Regulagem ambos os lados", porta.ambosLados, (v) => alterar(porta, (p) => { p.ambosLados = v; })),
      ),
    ),

    grupo("Ferragens",
      abertura.fechadura && campo("Fechadura", selecao(
        [{ valor: "", rotulo: "Sem fechadura" }, ...tabela.fechaduras.map((f) => ({ valor: f.id, rotulo: f.rotulo }))],
        porta.fechadura, (v) => alterar(porta, (p) => { p.fechadura = v; }),
      )),
      abertura.dobradica && campo("Dobradiças", selecao(
        [{ valor: "", rotulo: "Sem dobradiças" }, ...tabela.dobradicas.map((d) => ({ valor: d.id, rotulo: d.rotulo }))],
        porta.dobradica, (v) => alterar(porta, (p) => { p.dobradica = v; }),
      )),
      abertura.kit.length > 0 && h("div", { class: "g-sub" },
        h("span", { class: "g-sub__rotulo", text: `Kit ${abertura.rotulo.toLowerCase()}` }),
        abertura.kit.map((peca) => caixa(peca.rotulo, !porta.kitDesmarcado.includes(peca.id), (marcado) => alterar(porta, (p) => {
          p.kitDesmarcado = marcado ? p.kitDesmarcado.filter((id) => id !== peca.id) : [...p.kitDesmarcado, peca.id];
        }), custoTexto(peca.preco))),
      ),
    ),

    grupo("Serviços de fábrica",
      tabela.servicos.map((s) => caixa(s.rotulo, porta.servicos.includes(s.id), (marcado) => alterar(porta, (p) => {
        p.servicos = marcado ? [...p.servicos, s.id] : p.servicos.filter((id) => id !== s.id);
      }), custoTexto(s.preco))),
    ),

    grupo("Acessórios",
      tabela.acessorios.map((a) => caixa(a.rotulo, porta.acessorios.includes(a.id), (marcado) => alterar(porta, (p) => {
        p.acessorios = marcado ? [...p.acessorios, a.id] : p.acessorios.filter((id) => id !== a.id);
      }), custoTexto(a.preco))),
    ),
  );
}

function editorRodape(rodape) {
  const porCaixa = String(tabela.rodapes.metrosPorCaixa).replace(".", ",");
  return h("div", { class: "g-editor" },
    grupo("Perfil", chips(
      tabela.rodapes.precos.map((p) => ({ valor: p.id, rotulo: p.rotulo })),
      rodape.perfil,
      (v) => alterar(rodape, (r) => { r.perfil = v; }, { estrutura: true }),
      "Perfil do rodapé",
    )),
    grupo("Metragem",
      campo("Metros lineares", h("input", {
        type: "text", inputmode: "decimal", value: rodape.metros, placeholder: "Ex: 35,5",
        onInput: (e) => alterar(rodape, (r) => { r.metros = e.target.value; }),
      })),
      h("span", { class: "g-sub__rotulo", text: "Comprar por" }),
      chips([{ valor: "metro", rotulo: "Metro linear" }, { valor: "caixa", rotulo: `Caixa fechada (${porCaixa} m)` }], rodape.compra,
        (v) => alterar(rodape, (r) => { r.compra = v; }, { estrutura: true }), "Forma de compra"),
    ),
  );
}

// --- Valores ---------------------------------------------------------------------

function atualizarValores() {
  const resumo = resumirOrcamento(orcamento, tabela);

  for (const { item, calculo, preco } of resumo.itens) {
    for (const alvo of document.querySelectorAll(`[data-valores="${item.id}"]`)) {
      alvo.replaceChildren(calculo.erro ? "" : h("strong", { text: moeda(preco) }),
        calculo.erro ? null : h("small", { class: "g-interno", text: custoTexto(calculo.custo) }));
    }
    const detalhe = document.querySelector(`[data-calculo="${item.id}"]`);
    if (detalhe) {
      detalhe.replaceChildren(
        h("h4", { text: "Composição do custo (só você vê)" }),
        calculo.erro
          ? h("p", { class: "g-item__erro", text: calculo.erro })
          : h("table", {},
            h("tbody", {},
              calculo.linhas.map((l) => h("tr", {}, h("td", { text: l.rotulo }), h("td", { text: moeda(l.valor) }))),
              item.tipo === "porta" && calculo.quantidade > 1
                ? h("tr", { class: "g-calculo__sub" }, h("td", { text: `Custo por porta × ${calculo.quantidade}` }), h("td", { text: moeda(calculo.custo) }))
                : null,
              h("tr", { class: "g-calculo__total" }, h("td", { text: `Preço com ${orcamento.percentual}%` }), h("td", { text: moeda(preco) })),
            )),
      );
    }
  }

  const barra = $("barraTotal");
  const temItens = resumo.itens.length > 0;
  const margem = resumo.custo > 0 ? Math.round((resumo.lucro / resumo.custo) * 100) : 0;
  barra.replaceChildren(
    h("div", { class: "g-barra__totais" },
      h("span", { class: "g-barra__rotulo", text: "Total do orçamento" }),
      h("strong", { class: "g-barra__valor", text: moeda(resumo.preco) }),
      temItens ? h("small", { class: "g-interno", text: `custo ${moeda(resumo.custo)} · lucro ${moeda(resumo.lucro)} (${margem}%)` }) : null,
    ),
    h("button", {
      type: "button", class: "g-btn g-btn--primario", text: "Gerar PDF", disabled: !temItens,
      onClick: gerar,
    }),
  );
}

// --- PDF -------------------------------------------------------------------------

function avisar(mensagem) {
  const aviso = h("div", { class: "g-toast", role: "status", text: mensagem });
  document.body.append(aviso);
  setTimeout(() => aviso.remove(), 4000);
}

async function gerar() {
  const resumo = resumirOrcamento(orcamento, tabela);
  if (!orcamento.cliente.nome.trim()) {
    avisar("Informe o nome do cliente.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("clienteNome")?.focus();
    return;
  }
  if (resumo.comErro.length) {
    avisar(`Corrija ${rotuloDoItem(resumo.comErro[0].item)}: ${resumo.comErro[0].calculo.erro}`);
    editar(resumo.comErro[0].item.id);
    return;
  }
  if (!resumo.itens.length) return avisar("Adicione pelo menos um item.");

  try {
    if (pdfAtual) URL.revokeObjectURL(pdfAtual.url);
    const { blob, nomeArquivo } = await gerarPdf(orcamento, resumo, tabela);
    pdfAtual = { blob, nomeArquivo, url: URL.createObjectURL(blob) };
  } catch (erro) {
    console.error(erro);
    return avisar("Não foi possível gerar o PDF. Tente de novo.");
  }

  const arquivo = new File([pdfAtual.blob], pdfAtual.nomeArquivo, { type: "application/pdf" });
  $("btnCompartilhar").hidden = !(navigator.canShare && navigator.canShare({ files: [arquivo] }));
  $("dialogoPdfNome").textContent = pdfAtual.nomeArquivo;
  $("dialogoPdf").showModal();
}

$("btnBaixar").addEventListener("click", () => {
  const link = h("a", { href: pdfAtual.url, download: pdfAtual.nomeArquivo });
  document.body.append(link);
  link.click();
  link.remove();
});

$("btnAbrirPdf").addEventListener("click", () => window.open(pdfAtual.url, "_blank", "noopener"));

$("btnCompartilhar").addEventListener("click", async () => {
  const arquivo = new File([pdfAtual.blob], pdfAtual.nomeArquivo, { type: "application/pdf" });
  try {
    await navigator.share({ files: [arquivo], title: "Orçamento Refinatto" });
  } catch (erro) {
    if (erro.name !== "AbortError") avisar("Não foi possível compartilhar. Use \"Baixar PDF\".");
  }
});

$("btnFecharDialogo").addEventListener("click", () => $("dialogoPdf").close());

iniciar();
