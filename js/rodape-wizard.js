// Configurador de rodapés do formulário de orçamento.
//
// Espelha js/porta-wizard.js no padrão de código (array de etapas, render genérico, mesma família
// de ações: Voltar/Pular/Duplicar/Editar/Remover), mas é um módulo INDEPENDENTE, não uma extensão
// do wizard de portas. Rodapé não tem regra cruzada entre etapas (nenhuma escolha filtra outra),
// então não precisa da lógica de revalidação que o de portas tem - por isso não compartilham motor.
//
// Depende de window.CATALOGO_RODAPES (js/catalogo-rodapes.js, deve ser carregado ANTES deste
// arquivo) e do bloco de HTML #rodapeConfig / #rodapeWizard / #rodapeResumos em index.html.

const CATALOGO_R = window.CATALOGO_RODAPES;

const LIMITE_RODAPES = 5;

const OPCAO_NAO_SEI_R = { id: "nao_sei", rotulo: "Não sei / quero orientação" };

function escapeHtmlR(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const ETAPAS_R = [
  {
    id: "estilo",
    pergunta: "Estilo do rodapé",
    tipo: "cards",
    opcoes: () => CATALOGO_R.estilos
      .map((e) => ({ id: e.id, rotulo: e.rotulo, svg: e.svg }))
      .concat([OPCAO_NAO_SEI_R]),
  },
  {
    id: "largura",
    pergunta: "Largura",
    tipo: "lista",
    opcoes: () => CATALOGO_R.larguras
      .map((cm) => ({ id: String(cm), rotulo: `${cm} cm` }))
      .concat([OPCAO_NAO_SEI_R]),
  },
  {
    id: "metragem",
    pergunta: "Quantos metros, aproximadamente?",
    tipo: "texto",
    ajuda: "Não precisa ser exato - dá pra ajustar depois de medir no local.",
  },
  {
    id: "escopo",
    pergunta: "O que você precisa?",
    tipo: "lista",
    opcoes: () => [
      { id: "fornecimento", rotulo: "Fornecimento + instalação" },
      { id: "so_instalacao", rotulo: "Só instalação (já tenho o rodapé)" },
      OPCAO_NAO_SEI_R,
    ],
  },
];

function etapaPorIdR(id) {
  return ETAPAS_R.find((e) => e.id === id);
}

// Nenhuma etapa aqui tem mostrarSe - todas sempre visíveis - mas mantém a mesma função por
// consistência com porta-wizard.js e caso uma condicional seja necessária no futuro.
function etapasVisiveisR() {
  return ETAPAS_R;
}

// --- Estado ------------------------------------------------------------

const itens = []; // cada item: { respostas: {} }
let indiceItem = -1;
let indiceEtapaR = 0;

const DURACAO_CONFIRMACAO_MS_R = 220;
let temporizadorAvancarR = null;

function limparTemporizadorR() {
  if (temporizadorAvancarR) {
    clearTimeout(temporizadorAvancarR);
    temporizadorAvancarR = null;
  }
}

// --- Render --------------------------------------------------------------

function optionHtmlR(etapa, opcao, selecionada) {
  const marcado = selecionada ? " is-selected" : "";
  if (etapa.tipo === "cards") {
    return `
      <button type="button" class="wizard__card${marcado}" data-action="escolher-r"
              data-etapa-id="${etapa.id}" data-valor="${escapeHtmlR(opcao.id)}">
        ${opcao.svg ? `<img src="${opcao.svg}" alt="" class="wizard__card-img">` : ""}
        <span class="wizard__card-rotulo">${escapeHtmlR(opcao.rotulo)}</span>
      </button>`;
  }
  return `
    <button type="button" class="wizard__opcao${marcado}" data-action="escolher-r"
            data-etapa-id="${etapa.id}" data-valor="${escapeHtmlR(opcao.id)}">${escapeHtmlR(opcao.rotulo)}</button>`;
}

// Devolve só pergunta+corpo+navegação (sem o topo - ver atualizarTopoR()).
function montarConteudoEtapaR(item, etapa, idxEtapa) {
  const respostas = item.respostas;

  let corpo = "";
  if (etapa.tipo === "cards" || etapa.tipo === "lista") {
    const valorAtual = respostas[etapa.id];
    const classeContainer = etapa.tipo === "cards" ? "wizard__cards" : "wizard__opcoes";
    corpo = `<div class="${classeContainer}">${etapa.opcoes()
      .map((o) => optionHtmlR(etapa, o, valorAtual === o.id))
      .join("")}</div>`;
  } else if (etapa.tipo === "texto") {
    const valorAtual = respostas[etapa.id] ?? "";
    corpo = `
      <div class="wizard__campo-linha">
        <input type="text" class="wizard__campo" data-campo="${etapa.id}" value="${escapeHtmlR(valorAtual)}">
        <button type="button" class="btn btn--primary" data-action="avancar-campo-r" data-etapa-id="${etapa.id}">Avançar</button>
      </div>`;
  }

  const podeVoltar = idxEtapa > 0;
  const nav = `
    <div class="wizard__nav">
      <div>${podeVoltar ? `<button type="button" class="btn btn--ghost" data-action="voltar-r">Voltar</button>` : ""}</div>
      <div><button type="button" class="wizard__link" data-action="pular-etapa-r">Pular esta pergunta</button></div>
    </div>
    <button type="button" class="wizard__link wizard__link--tudo" data-action="pular-tudo-r">Pular tudo e enviar agora →</button>`;

  return `
    <h4 class="wizard__pergunta">${escapeHtmlR(etapa.pergunta)}</h4>
    ${etapa.ajuda ? `<p class="wizard__ajuda">${escapeHtmlR(etapa.ajuda)}</p>` : ""}
    ${corpo}
    ${nav}`;
}

function atualizarTopoR(wizardEl, idxItem, idxEtapa, totalEtapas) {
  let topo = wizardEl.querySelector(".wizard__topo");
  if (!topo) {
    wizardEl.innerHTML = `<div class="wizard__topo"><span></span><div class="wizard__barra"><i style="width:0%"></i></div></div>`;
    topo = wizardEl.querySelector(".wizard__topo");
  }
  const percent = Math.round(((idxEtapa + 1) / (totalEtapas + 1)) * 100);
  topo.querySelector("span").textContent = `Rodapé ${idxItem + 1} · passo ${idxEtapa + 1} de ${totalEtapas}`;
  topo.querySelector(".wizard__barra i").style.width = `${percent}%`;
}

function renderTudoR() {
  const btnAbrir = document.getElementById("abrirRodapeWizard");
  const wizardEl = document.getElementById("rodapeWizard");

  if (indiceItem === -1 || indiceItem >= itens.length) {
    wizardEl.hidden = true;
    wizardEl.innerHTML = "";
  } else {
    const item = itens[indiceItem];
    const etapas = etapasVisiveisR();
    if (indiceEtapaR >= etapas.length) {
      finalizarItemAtual();
      renderTudoR();
      return;
    }
    wizardEl.hidden = false;
    atualizarTopoR(wizardEl, indiceItem, indiceEtapaR, etapas.length);

    const passoNovo = document.createElement("div");
    passoNovo.className = "wizard__passo";
    passoNovo.innerHTML = montarConteudoEtapaR(item, etapas[indiceEtapaR], indiceEtapaR);
    const passoAntigo = wizardEl.querySelector(".wizard__passo");
    if (passoAntigo) passoAntigo.replaceWith(passoNovo);
    else wizardEl.appendChild(passoNovo);
  }

  if (btnAbrir) btnAbrir.hidden = itens.length > 0;
  renderResumosR();
}

function renderResumosR() {
  const container = document.getElementById("rodapeResumos");
  if (!container) return;

  const cards = itens
    .map((item, idx) => ({ item, idx }))
    .filter(({ idx }) => idx !== indiceItem)
    .map(({ item, idx }) => {
      const detalhes = montarResumoItem(item);
      const corpo = detalhes.length
        ? `<ul class="porta-resumo__lista">${detalhes.map((l) => `<li>${escapeHtmlR(l.replace(/^•\s*/, ""))}</li>`).join("")}</ul>`
        : `<p class="porta-resumo__vazio">Nenhum detalhe preenchido ainda.</p>`;
      return `
        <div class="rodape-resumo">
          <div class="porta-resumo__topo"><strong>Rodapé ${idx + 1}</strong></div>
          ${corpo}
          <div class="porta-resumo__acoes">
            <button type="button" class="wizard__link" data-action="editar-item-r" data-idx="${idx}">Editar</button>
            <button type="button" class="wizard__link" data-action="duplicar-r" data-idx="${idx}">Duplicar</button>
            <button type="button" class="wizard__link" data-action="remover-item-r" data-idx="${idx}">Remover</button>
          </div>
        </div>`;
    })
    .join("");

  let rodape = "";
  if (itens.length > 0 && indiceItem === -1) {
    rodape = itens.length >= LIMITE_RODAPES
      ? `<p class="wizard__ajuda">Limite de ${LIMITE_RODAPES} rodapés por orçamento. Para mais, combine direto pelo WhatsApp.</p>`
      : `<button type="button" class="btn btn--ghost" data-action="adicionar-item-r">+ Adicionar outro rodapé</button>`;
  }

  container.innerHTML = cards + rodape;
}

// --- Resumo para a mensagem do WhatsApp ------------------------------------

function rotuloDeR(etapaId, valor) {
  if (valor == null || valor === "nao_sei" || valor === "") return null;
  const etapa = etapaPorIdR(etapaId);
  const opcao = etapa?.opcoes ? etapa.opcoes().find((o) => o.id === valor) : null;
  return opcao ? opcao.rotulo : String(valor);
}

function montarResumoItem(item) {
  const r = item.respostas;
  const linhas = [];
  const add = (rotulo, valor) => { if (valor) linhas.push(`• ${rotulo}: ${valor}`); };

  add("Estilo", rotuloDeR("estilo", r.estilo));
  if (r.largura && r.largura !== "nao_sei") linhas.push(`• Largura: ${r.largura} cm`);
  if (r.metragem) linhas.push(`• Metragem estimada: ${r.metragem} m`);

  const escopoTexto = r.escopo === "fornecimento" ? "Fornecimento + instalação"
    : r.escopo === "so_instalacao" ? "Só instalação (já tem o rodapé)" : null;
  if (escopoTexto) linhas.push(`• Serviço: ${escopoTexto}`);

  return linhas;
}

function linhasResumoR() {
  const blocos = [];
  itens.forEach((item, idx) => {
    const detalhes = montarResumoItem(item);
    if (detalhes.length === 0) return;
    if (blocos.length > 0) blocos.push("");
    blocos.push(`*RODAPÉ ${idx + 1}*`);
    blocos.push(...detalhes);
  });
  return blocos;
}

function temRodapes() {
  return itens.some((item) => montarResumoItem(item).length > 0);
}

// --- Ações -------------------------------------------------------------

function finalizarItemAtual() {
  const item = itens[indiceItem];
  if (item && montarResumoItem(item).length === 0) itens.splice(indiceItem, 1);
  indiceItem = -1;
  indiceEtapaR = 0;
}

function avancarR() {
  limparTemporizadorR();
  if (indiceItem === -1) return;
  const etapas = etapasVisiveisR();
  if (indiceEtapaR < etapas.length - 1) indiceEtapaR++;
  else finalizarItemAtual();
  renderTudoR();
}

function voltarR() {
  limparTemporizadorR();
  if (indiceEtapaR > 0) indiceEtapaR--;
  renderTudoR();
}

function selecionarValorR(etapaId, valor, elemento) {
  const item = itens[indiceItem];
  if (!item) return;
  item.respostas[etapaId] = valor;

  if (elemento) {
    limparTemporizadorR();
    elemento.classList.add("is-selecionando");
    temporizadorAvancarR = setTimeout(avancarR, DURACAO_CONFIRMACAO_MS_R);
  } else {
    avancarR();
  }
}

function avancarComCampoR(etapaId) {
  const input = document.querySelector(`.wizard__campo[data-campo="${etapaId}"]`);
  const item = itens[indiceItem];
  if (input && item) {
    const valor = input.value.trim();
    if (valor) item.respostas[etapaId] = valor;
  }
  avancarR();
}

function pularTudoEEnviarR() {
  if (indiceItem !== -1) finalizarItemAtual();
  renderTudoR();
  const btnEnviar = document.querySelector('#orcamentoForm button[type="submit"]');
  if (btnEnviar) {
    btnEnviar.scrollIntoView({ behavior: "smooth", block: "center" });
    btnEnviar.focus();
  }
}

function adicionarItemR() {
  if (itens.length >= LIMITE_RODAPES) {
    alert(`Você pode configurar até ${LIMITE_RODAPES} rodapés neste orçamento. Para mais, combine direto pelo WhatsApp depois de enviar.`);
    return;
  }
  itens.push({ respostas: {} });
  indiceItem = itens.length - 1;
  indiceEtapaR = 0;
  renderTudoR();
  document.getElementById("rodapeWizard")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function editarItemR(idx) {
  indiceItem = idx;
  indiceEtapaR = 0;
  renderTudoR();
  document.getElementById("rodapeWizard")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removerItemR(idx) {
  itens.splice(idx, 1);
  if (indiceItem === idx) { indiceItem = -1; indiceEtapaR = 0; }
  else if (indiceItem > idx) indiceItem--;
  renderTudoR();
}

function duplicarItemR(idx) {
  if (itens.length >= LIMITE_RODAPES) {
    alert(`Você pode configurar até ${LIMITE_RODAPES} rodapés neste orçamento. Para mais, combine direto pelo WhatsApp depois de enviar.`);
    return;
  }
  itens.push({ respostas: { ...itens[idx].respostas } });
  renderTudoR();
}

function resetR() {
  limparTemporizadorR();
  itens.length = 0;
  indiceItem = -1;
  indiceEtapaR = 0;
  renderTudoR();
}

// --- Ligações de DOM ---------------------------------------------------

function handleClickR(evento) {
  const alvo = evento.target.closest("[data-action]");
  if (!alvo) return;
  switch (alvo.dataset.action) {
    case "abrir-wizard-r": alvo.hidden = true; adicionarItemR(); break;
    case "escolher-r": selecionarValorR(alvo.dataset.etapaId, alvo.dataset.valor, alvo); break;
    case "avancar-campo-r": avancarComCampoR(alvo.dataset.etapaId); break;
    case "voltar-r": voltarR(); break;
    case "pular-etapa-r": avancarR(); break;
    case "pular-tudo-r": pularTudoEEnviarR(); break;
    case "adicionar-item-r": adicionarItemR(); break;
    case "editar-item-r": editarItemR(Number(alvo.dataset.idx)); break;
    case "remover-item-r": removerItemR(Number(alvo.dataset.idx)); break;
    case "duplicar-r": duplicarItemR(Number(alvo.dataset.idx)); break;
  }
}

function atualizarVisibilidadeConfigR() {
  const servico = document.getElementById("servico");
  const config = document.getElementById("rodapeConfig");
  if (!servico || !config) return;
  config.hidden = !(servico.value === "Rodapé" || servico.value === "Mais de um serviço");
}

function initR() {
  const config = document.getElementById("rodapeConfig");
  if (!config || !CATALOGO_R) return;

  config.addEventListener("click", handleClickR);

  config.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && evento.target.matches("input.wizard__campo")) {
      evento.preventDefault();
      evento.target.parentElement.querySelector('[data-action="avancar-campo-r"]')?.click();
    }
  });

  document.getElementById("servico")?.addEventListener("change", atualizarVisibilidadeConfigR);
  atualizarVisibilidadeConfigR();
  renderTudoR();
}

initR();

window.RodapeWizard = { linhasResumo: linhasResumoR, temRodapes, reset: resetR };
