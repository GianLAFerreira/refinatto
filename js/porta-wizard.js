// Configurador de portas do formulário de orçamento.
//
// Depende de window.CATALOGO_PORTAS (js/catalogo-portas.js, deve ser carregado ANTES deste
// arquivo) e do bloco de HTML #portaConfig / #portaWizard / #portaResumos em index.html.
//
// Nada aqui é obrigatório: cada porta pode ser abandonada a qualquer momento (botão "Pular
// esta pergunta" ou "Pular tudo e enviar agora") e toda etapa de escolha aceita "Não sei".
// js/main.js lê window.PortaWizard.linhasResumo() na hora de montar a mensagem do WhatsApp.

const CATALOGO = window.CATALOGO_PORTAS;

const LIMITE_PORTAS = 5;

const OPCAO_NAO_SEI = { id: "nao_sei", rotulo: "Não sei / quero orientação" };

// Usadas só quando a pessoa ainda não escolheu (ou pulou) o tipo de abertura, para a etapa de
// largura ainda mostrar algo sensato em vez de ficar vazia.
const LARGURAS_FOLHA_PADRAO = [60, 70, 80, 90];
const LARGURAS_MARCO_PADRAO = [7, 10, 13, 16];

function linhaAtual(respostas) {
  return CATALOGO.linhas.find((l) => l.id === respostas.tipoAbertura) || null;
}

function resolver(valor, respostas) {
  return typeof valor === "function" ? valor(respostas) : valor;
}

function escapeHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Cada etapa descreve UMA pergunta. O render é genérico (montarHtmlEtapa) - nada de escrever
// um bloco de HTML por etapa. "opcoes" e "mostrarSe" recebem as respostas já dadas, para que a
// linha escolhida (De giro, Pivotante...) filtre o que faz sentido perguntar depois.
const ETAPAS = [
  {
    id: "ambiente",
    pergunta: "Onde fica a porta?",
    tipo: "lista",
    opcoes: () => CATALOGO.ambientes.map((a) => ({ id: a, rotulo: a })).concat([OPCAO_NAO_SEI]),
  },
  {
    id: "tipoAbertura",
    pergunta: "Tipo de abertura",
    tipo: "cards",
    opcoes: () => CATALOGO.linhas
      .map((l) => ({ id: l.id, rotulo: l.rotulo, ajuda: l.ajuda }))
      .concat([OPCAO_NAO_SEI]),
  },
  {
    id: "modeloFolha",
    pergunta: "Modelo da folha",
    tipo: "cards",
    opcoes: () => CATALOGO.modelosFolha
      .map((m) => ({ id: m.id, rotulo: m.rotulo, svg: m.svg, codigo: m.codigo }))
      .concat([OPCAO_NAO_SEI]),
  },
  {
    id: "cor",
    pergunta: "Cor",
    tipo: "cards",
    opcoes: () => CATALOGO.cores
      .map((c) => ({ id: c.id, rotulo: c.rotulo, amostra: c.amostra, codigo: c.codigo }))
      .concat([OPCAO_NAO_SEI]),
  },
  {
    id: "larguraFolha",
    pergunta: "Largura da folha",
    tipo: "lista",
    ajuda: (r) => {
      const linha = linhaAtual(r);
      if (!linha) return "";
      return Array.isArray(linha.alturas)
        ? `Altura padrão desta linha: ${linha.alturas[0]} cm.`
        : `Altura sob medida entre ${linha.alturas.min} e ${linha.alturas.max} cm. Perguntamos a seguir.`;
    },
    opcoes: (r) => {
      const linha = linhaAtual(r);
      const larguras = linha ? linha.largurasFolha : LARGURAS_FOLHA_PADRAO;
      return larguras
        .map((cm) => ({ id: String(cm), rotulo: `${cm} cm` }))
        .concat([{ id: "sob_medida", rotulo: "Sob medida" }, OPCAO_NAO_SEI]);
    },
  },
  {
    id: "larguraSobMedida",
    pergunta: "Qual a largura desejada?",
    tipo: "texto",
    ajuda: "Ex: 85 cm",
    mostrarSe: (r) => r.larguraFolha === "sob_medida",
  },
  {
    id: "altura",
    pergunta: "Altura da porta",
    tipo: "numero",
    ajuda: (r) => {
      const linha = linhaAtual(r);
      return linha ? `Entre ${linha.alturas.min} e ${linha.alturas.max} cm.` : "";
    },
    min: (r) => linhaAtual(r)?.alturas.min,
    max: (r) => linhaAtual(r)?.alturas.max,
    mostrarSe: (r) => {
      const linha = linhaAtual(r);
      return !!linha && !Array.isArray(linha.alturas);
    },
  },
  {
    id: "larguraMarco",
    pergunta: "Largura do marco (batente)",
    tipo: "lista",
    opcoes: (r) => {
      const linha = linhaAtual(r);
      const larguras = linha ? linha.largurasMarco : LARGURAS_MARCO_PADRAO;
      return larguras
        .map((cm) => ({ id: String(cm), rotulo: `${cm} cm` }))
        .concat([{ id: "medir_obra", rotulo: "Vou medir na obra" }, OPCAO_NAO_SEI]);
    },
  },
  {
    id: "alizar",
    pergunta: "Guarnição (alizar)",
    tipo: "lista",
    opcoes: () => CATALOGO.alizares.map((a) => ({ id: a, rotulo: a })).concat([OPCAO_NAO_SEI]),
  },
  {
    id: "ladoAbertura",
    pergunta: "Lado de abertura",
    tipo: "lista",
    ajuda: "De frente para a porta, de que lado fica a dobradiça?",
    opcoes: () => [{ id: "Direita", rotulo: "Direita" }, { id: "Esquerda", rotulo: "Esquerda" }, OPCAO_NAO_SEI],
    mostrarSe: (r) => !!linhaAtual(r)?.perguntaLado,
  },
  {
    id: "fechadura",
    pergunta: "Fechadura",
    tipo: "lista",
    opcoes: () => CATALOGO.fechadurasFlex.map((f) => ({ id: f, rotulo: f })).concat([OPCAO_NAO_SEI]),
    mostrarSe: (r) => !!linhaAtual(r)?.perguntaFechadura,
  },
  {
    id: "notaFerragens",
    pergunta: "Ferragens",
    tipo: "nota",
    ajuda: (r) => linhaAtual(r)?.ferragens || "",
    mostrarSe: (r) => {
      const linha = linhaAtual(r);
      return !!(linha && linha.ferragens && !linha.perguntaFechadura);
    },
  },
  {
    id: "escopo",
    pergunta: "O que você precisa?",
    tipo: "lista",
    opcoes: () => [
      { id: "fornecimento", rotulo: "Fornecimento + instalação" },
      { id: "so_instalacao", rotulo: "Só instalação (já tenho a porta)" },
      OPCAO_NAO_SEI,
    ],
  },
  {
    id: "removerAntiga",
    pergunta: "Precisa remover a porta antiga?",
    tipo: "lista",
    opcoes: () => [{ id: "sim", rotulo: "Sim" }, { id: "nao", rotulo: "Não, é obra nova" }, OPCAO_NAO_SEI],
    mostrarSe: (r) => !!r.escopo,
  },
  {
    id: "quantidade",
    pergunta: "Quantas portas assim você precisa?",
    tipo: "numero",
    min: () => 1,
    max: () => 20,
  },
];

function etapaPorId(id) {
  return ETAPAS.find((e) => e.id === id);
}

function etapasVisiveis(respostas) {
  return ETAPAS.filter((e) => !e.mostrarSe || e.mostrarSe(respostas));
}

// Ao trocar o tipo de abertura, descarta respostas que não existem mais na linha nova (ex: marco
// de 22cm escolhido na "De giro" não existe na "Pivotante"). Sem isso o pedido que chega pro
// Maicon poderia pedir uma combinação que o fornecedor não vende.
function revalidar(respostas) {
  const linha = linhaAtual(respostas);
  const largurasFolha = linha ? linha.largurasFolha : LARGURAS_FOLHA_PADRAO;
  if (respostas.larguraFolha && !["sob_medida", "nao_sei"].includes(respostas.larguraFolha)) {
    if (!largurasFolha.includes(Number(respostas.larguraFolha))) {
      delete respostas.larguraFolha;
      delete respostas.larguraSobMedida;
    }
  }
  const largurasMarco = linha ? linha.largurasMarco : LARGURAS_MARCO_PADRAO;
  if (respostas.larguraMarco && !["medir_obra", "nao_sei"].includes(respostas.larguraMarco)) {
    if (!largurasMarco.includes(Number(respostas.larguraMarco))) delete respostas.larguraMarco;
  }
  if (respostas.ladoAbertura && !linha?.perguntaLado) delete respostas.ladoAbertura;
  if (respostas.fechadura && !linha?.perguntaFechadura) delete respostas.fechadura;
  if (respostas.altura && linha && Array.isArray(linha.alturas)) delete respostas.altura;
}

// --- Estado ---------------------------------------------------------------

const portas = []; // cada item: { respostas: {} }
let indicePorta = -1; // -1 = nenhuma porta em edição no momento
let indiceEtapa = 0;

// Tempo que a opção clicada fica com o realce/pulso antes do avanço automático de verdade - dá
// pra pessoa ver que o clique registrou, em vez da tela trocar antes do navegador sequer pintar.
const DURACAO_CONFIRMACAO_MS = 220;
let temporizadorAvancar = null;

function limparTemporizador() {
  if (temporizadorAvancar) {
    clearTimeout(temporizadorAvancar);
    temporizadorAvancar = null;
  }
}

// --- Render ----------------------------------------------------------------

function optionHtml(etapa, opcao, selecionada) {
  const marcado = selecionada ? " is-selected" : "";
  if (etapa.tipo === "cards") {
    return `
      <button type="button" class="wizard__card${marcado}" data-action="escolher"
              data-etapa-id="${etapa.id}" data-valor="${escapeHtml(opcao.id)}">
        ${opcao.svg ? `<img src="${opcao.svg}" alt="" class="wizard__card-img">` : ""}
        ${opcao.amostra ? `<span class="wizard__amostra" style="background:${escapeHtml(opcao.amostra)}"></span>` : ""}
        <span class="wizard__card-rotulo">${escapeHtml(opcao.rotulo)}</span>
        ${opcao.ajuda ? `<span class="wizard__card-ajuda">${escapeHtml(opcao.ajuda)}</span>` : ""}
      </button>`;
  }
  return `
    <button type="button" class="wizard__opcao${marcado}" data-action="escolher"
            data-etapa-id="${etapa.id}" data-valor="${escapeHtml(opcao.id)}">${escapeHtml(opcao.rotulo)}</button>`;
}

// Devolve só pergunta+corpo+navegação (sem o topo - rótulo/barra de progresso são atualizados à
// parte em atualizarTopo(), como elemento persistente, pra "width" da barra poder animar de verdade
// em vez de nascer sempre já na largura final a cada troca de innerHTML).
function montarConteudoEtapa(porta, etapa, idxEtapa) {
  const respostas = porta.respostas;
  const ajudaTexto = resolver(etapa.ajuda, respostas);

  let corpo = "";
  if (etapa.tipo === "cards" || etapa.tipo === "lista") {
    const valorAtual = respostas[etapa.id];
    const classeContainer = etapa.tipo === "cards" ? "wizard__cards" : "wizard__opcoes";
    corpo = `<div class="${classeContainer}">${etapa.opcoes(respostas)
      .map((o) => optionHtml(etapa, o, valorAtual === o.id))
      .join("")}</div>`;
  } else if (etapa.tipo === "numero" || etapa.tipo === "texto") {
    const min = resolver(etapa.min, respostas);
    const max = resolver(etapa.max, respostas);
    const valorAtual = respostas[etapa.id] ?? (etapa.id === "quantidade" ? "1" : "");
    corpo = `
      <div class="wizard__campo-linha">
        <input type="${etapa.tipo === "numero" ? "number" : "text"}" class="wizard__campo"
               data-campo="${etapa.id}"
               ${min != null ? `min="${min}"` : ""} ${max != null ? `max="${max}"` : ""}
               value="${escapeHtml(valorAtual)}">
        <button type="button" class="btn btn--primary" data-action="avancar-campo" data-etapa-id="${etapa.id}">Avançar</button>
      </div>`;
  } else if (etapa.tipo === "nota") {
    corpo = `
      <div class="wizard__nota">${escapeHtml(ajudaTexto)}</div>
      <button type="button" class="btn btn--primary" data-action="avancar">Entendi, continuar</button>`;
  }

  const podeVoltar = idxEtapa > 0;
  const nav = `
    <div class="wizard__nav">
      <div>${podeVoltar ? `<button type="button" class="btn btn--ghost" data-action="voltar">Voltar</button>` : ""}</div>
      <div>${etapa.tipo !== "nota" ? `<button type="button" class="wizard__link" data-action="pular-etapa">Pular esta pergunta</button>` : ""}</div>
    </div>
    <button type="button" class="wizard__link wizard__link--tudo" data-action="pular-tudo">Pular tudo e enviar agora →</button>`;

  return `
    <h4 class="wizard__pergunta">${escapeHtml(etapa.pergunta)}</h4>
    ${ajudaTexto && etapa.tipo !== "nota" ? `<p class="wizard__ajuda">${escapeHtml(ajudaTexto)}</p>` : ""}
    ${corpo}
    ${nav}`;
}

// Cria (se ainda não existir) o topo persistente e só atualiza texto/largura da barra nas trocas
// seguintes - é isso que deixa a transição de "width" já definida no CSS animar de verdade, em vez
// de recriar o elemento do zero a cada passo (que nasce direto na largura final, sem transição).
function atualizarTopo(wizardEl, idxPorta, idxEtapa, totalEtapas) {
  let topo = wizardEl.querySelector(".wizard__topo");
  if (!topo) {
    wizardEl.innerHTML = `<div class="wizard__topo"><span></span><div class="wizard__barra"><i style="width:0%"></i></div></div>`;
    topo = wizardEl.querySelector(".wizard__topo");
  }
  const percent = Math.round(((idxEtapa + 1) / (totalEtapas + 1)) * 100);
  topo.querySelector("span").textContent = `Porta ${idxPorta + 1} · passo ${idxEtapa + 1} de ${totalEtapas}`;
  topo.querySelector(".wizard__barra i").style.width = `${percent}%`;
}

function renderTudo() {
  const btnAbrir = document.getElementById("abrirPortaWizard");
  const wizardEl = document.getElementById("portaWizard");

  if (indicePorta === -1 || indicePorta >= portas.length) {
    wizardEl.hidden = true;
    wizardEl.innerHTML = "";
  } else {
    const porta = portas[indicePorta];
    const etapas = etapasVisiveis(porta.respostas);
    if (indiceEtapa >= etapas.length) {
      finalizarPortaAtual();
      renderTudo();
      return;
    }
    wizardEl.hidden = false;
    atualizarTopo(wizardEl, indicePorta, indiceEtapa, etapas.length);

    const passoNovo = document.createElement("div");
    passoNovo.className = "wizard__passo";
    passoNovo.innerHTML = montarConteudoEtapa(porta, etapas[indiceEtapa], indiceEtapa);
    const passoAntigo = wizardEl.querySelector(".wizard__passo");
    if (passoAntigo) passoAntigo.replaceWith(passoNovo);
    else wizardEl.appendChild(passoNovo);
  }

  if (btnAbrir) btnAbrir.hidden = portas.length > 0;
  renderResumos();
}

function renderResumos() {
  const container = document.getElementById("portaResumos");
  if (!container) return;

  const cards = portas
    .map((porta, idx) => ({ porta, idx }))
    .filter(({ idx }) => idx !== indicePorta) // a que está sendo editada já aparece no wizard acima
    .map(({ porta, idx }) => {
      const detalhes = montarResumoPorta(porta);
      const qtd = Number(porta.respostas.quantidade) || 1;
      const corpo = detalhes.length
        ? `<ul class="porta-resumo__lista">${detalhes.map((l) => `<li>${escapeHtml(l.replace(/^•\s*/, ""))}</li>`).join("")}</ul>`
        : `<p class="porta-resumo__vazio">Nenhum detalhe preenchido ainda.</p>`;
      return `
        <div class="porta-resumo">
          <div class="porta-resumo__topo">
            <strong>Porta ${idx + 1}</strong>
            <span>${qtd} unidade${qtd > 1 ? "s" : ""}</span>
          </div>
          ${corpo}
          <div class="porta-resumo__acoes">
            <button type="button" class="wizard__link" data-action="editar-porta" data-idx="${idx}">Editar</button>
            <button type="button" class="wizard__link" data-action="duplicar" data-idx="${idx}">Duplicar</button>
            <button type="button" class="wizard__link" data-action="remover-porta" data-idx="${idx}">Remover</button>
          </div>
        </div>`;
    })
    .join("");

  // O botão de adicionar só faz sentido depois que já existe pelo menos 1 porta - antes disso
  // quem inicia é o botão "Personalizar minha porta" (ver btnAbrir acima).
  let rodape = "";
  if (portas.length > 0 && indicePorta === -1) {
    rodape = portas.length >= LIMITE_PORTAS
      ? `<p class="wizard__ajuda">Limite de ${LIMITE_PORTAS} portas por orçamento. Para mais, combine direto pelo WhatsApp.</p>`
      : `<button type="button" class="btn btn--ghost" data-action="adicionar-porta">+ Adicionar outra porta</button>`;
  }

  container.innerHTML = cards + rodape;
}

// --- Resumo para a mensagem do WhatsApp ------------------------------------

function rotuloDe(etapaId, respostas, valor) {
  if (valor == null || valor === "nao_sei" || valor === "") return null;
  const etapa = etapaPorId(etapaId);
  const opcoes = etapa?.opcoes ? etapa.opcoes(respostas) : null;
  const opcao = opcoes?.find((o) => o.id === valor);
  if (!opcao) return String(valor);
  const codigo = CATALOGO.incluirCodigoFornecedor && opcao.codigo ? ` (${opcao.codigo})` : "";
  return opcao.rotulo + codigo;
}

function montarResumoPorta(porta) {
  const r = porta.respostas;
  const linha = linhaAtual(r);
  const linhas = [];
  const add = (rotulo, valor) => { if (valor) linhas.push(`• ${rotulo}: ${valor}`); };

  add("Ambiente", rotuloDe("ambiente", r, r.ambiente));
  add("Abertura", rotuloDe("tipoAbertura", r, r.tipoAbertura));
  add("Modelo", rotuloDe("modeloFolha", r, r.modeloFolha));
  add("Cor", rotuloDe("cor", r, r.cor));

  let largura = null;
  if (r.larguraFolha === "sob_medida" && r.larguraSobMedida) largura = r.larguraSobMedida;
  else if (r.larguraFolha && r.larguraFolha !== "nao_sei") largura = `${r.larguraFolha} cm`;
  const altura = r.altura ? `${r.altura} cm` : (linha && Array.isArray(linha.alturas) ? `${linha.alturas[0]} cm` : null);
  if (largura && altura) linhas.push(`• Folha: ${largura} × ${altura}`);
  else if (largura) linhas.push(`• Largura da folha: ${largura}`);

  if (r.larguraMarco && r.larguraMarco !== "nao_sei") {
    linhas.push(`• Marco: ${r.larguraMarco === "medir_obra" ? "vai medir na obra" : `${r.larguraMarco} cm`}`);
  }
  add("Guarnição", rotuloDe("alizar", r, r.alizar));
  add("Lado de abertura", rotuloDe("ladoAbertura", r, r.ladoAbertura));

  if (linha?.perguntaFechadura) add("Fechadura", rotuloDe("fechadura", r, r.fechadura));
  else if (linha?.ferragens) linhas.push(`• Ferragens: ${linha.ferragens}`);

  let escopoTexto = r.escopo === "fornecimento" ? "Fornecimento + instalação"
    : r.escopo === "so_instalacao" ? "Só instalação (já tem a porta)" : null;
  if (escopoTexto) {
    if (r.removerAntiga === "sim") escopoTexto += ", com remoção da porta antiga";
    else if (r.removerAntiga === "nao") escopoTexto += ", obra nova (sem remoção)";
    linhas.push(`• Serviço: ${escopoTexto}`);
  }

  return linhas;
}

function linhasResumo() {
  const blocos = [];
  portas.forEach((porta, idx) => {
    const detalhes = montarResumoPorta(porta);
    if (detalhes.length === 0) return; // porta sem nenhuma resposta útil não entra na mensagem
    const qtd = Number(porta.respostas.quantidade) || 1;
    if (blocos.length > 0) blocos.push("");
    blocos.push(`*PORTA ${idx + 1}* (${qtd} unidade${qtd > 1 ? "s" : ""})`);
    blocos.push(...detalhes);
  });
  return blocos;
}

function temPortas() {
  return portas.some((p) => montarResumoPorta(p).length > 0);
}

// --- Ações -------------------------------------------------------------

function finalizarPortaAtual() {
  const porta = portas[indicePorta];
  if (porta && montarResumoPorta(porta).length === 0) portas.splice(indicePorta, 1);
  indicePorta = -1;
  indiceEtapa = 0;
}

function avancar() {
  limparTemporizador();
  if (indicePorta === -1) return;
  const porta = portas[indicePorta];
  const etapas = etapasVisiveis(porta.respostas);
  if (indiceEtapa < etapas.length - 1) indiceEtapa++;
  else finalizarPortaAtual();
  renderTudo();
}

function voltar() {
  limparTemporizador();
  if (indiceEtapa > 0) indiceEtapa--;
  renderTudo();
}

function selecionarValor(etapaId, valor, elemento) {
  const porta = portas[indicePorta];
  if (!porta) return;
  porta.respostas[etapaId] = valor;
  if (etapaId === "larguraFolha" && valor !== "sob_medida") delete porta.respostas.larguraSobMedida;
  if (etapaId === "tipoAbertura") revalidar(porta.respostas);

  if (elemento) {
    // Marca na hora (pulso/realce via CSS) e só avança de verdade depois de um instante - se a
    // pessoa clicar em outra opção ou em "Voltar" antes disso, limparTemporizador() cancela este
    // avanço pendente (avancar()/voltar() já chamam isso no início) e nenhuma etapa é pulada.
    limparTemporizador();
    elemento.classList.add("is-selecionando");
    temporizadorAvancar = setTimeout(avancar, DURACAO_CONFIRMACAO_MS);
  } else {
    avancar();
  }
}

function avancarComCampo(etapaId) {
  const input = document.querySelector(`.wizard__campo[data-campo="${etapaId}"]`);
  const porta = portas[indicePorta];
  if (input && porta) {
    let valor = input.value.trim();
    if (etapaId === "quantidade") {
      const n = parseInt(valor, 10);
      valor = String(Number.isFinite(n) && n > 0 ? n : 1);
    }
    if (valor) porta.respostas[etapaId] = valor;
  }
  avancar();
}

function pularTudoEEnviar() {
  if (indicePorta !== -1) finalizarPortaAtual();
  renderTudo();
  const btnEnviar = document.querySelector('#orcamentoForm button[type="submit"]');
  if (btnEnviar) {
    btnEnviar.scrollIntoView({ behavior: "smooth", block: "center" });
    btnEnviar.focus();
  }
}

function adicionarPorta() {
  if (portas.length >= LIMITE_PORTAS) {
    alert(`Você pode configurar até ${LIMITE_PORTAS} portas neste orçamento. Para mais, combine direto pelo WhatsApp depois de enviar.`);
    return;
  }
  portas.push({ respostas: {} });
  indicePorta = portas.length - 1;
  indiceEtapa = 0;
  renderTudo();
  document.getElementById("portaWizard")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function editarPorta(idx) {
  indicePorta = idx;
  indiceEtapa = 0;
  renderTudo();
  document.getElementById("portaWizard")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removerPorta(idx) {
  portas.splice(idx, 1);
  if (indicePorta === idx) { indicePorta = -1; indiceEtapa = 0; }
  else if (indicePorta > idx) indicePorta--;
  renderTudo();
}

function duplicarPorta(idx) {
  if (portas.length >= LIMITE_PORTAS) {
    alert(`Você pode configurar até ${LIMITE_PORTAS} portas neste orçamento. Para mais, combine direto pelo WhatsApp depois de enviar.`);
    return;
  }
  portas.push({ respostas: { ...portas[idx].respostas } });
  renderTudo();
}

function reset() {
  limparTemporizador();
  portas.length = 0;
  indicePorta = -1;
  indiceEtapa = 0;
  renderTudo();
}

// --- Ligações de DOM ---------------------------------------------------

function handleClick(evento) {
  const alvo = evento.target.closest("[data-action]");
  if (!alvo) return;
  switch (alvo.dataset.action) {
    case "abrir-wizard": alvo.hidden = true; adicionarPorta(); break;
    case "escolher": selecionarValor(alvo.dataset.etapaId, alvo.dataset.valor, alvo); break;
    case "avancar": avancar(); break;
    case "avancar-campo": avancarComCampo(alvo.dataset.etapaId); break;
    case "voltar": voltar(); break;
    case "pular-etapa": avancar(); break;
    case "pular-tudo": pularTudoEEnviar(); break;
    case "adicionar-porta": adicionarPorta(); break;
    case "editar-porta": editarPorta(Number(alvo.dataset.idx)); break;
    case "remover-porta": removerPorta(Number(alvo.dataset.idx)); break;
    case "duplicar": duplicarPorta(Number(alvo.dataset.idx)); break;
  }
}

function atualizarVisibilidadeConfig() {
  const servico = document.getElementById("servico");
  const config = document.getElementById("portaConfig");
  if (!servico || !config) return;
  config.hidden = !(servico.value === "Porta" || servico.value === "Mais de um serviço");
}

function init() {
  const config = document.getElementById("portaConfig");
  if (!config || !CATALOGO) return;

  config.addEventListener("click", handleClick);

  // Enter dentro de um campo de texto/número do wizard não pode submeter o formulário inteiro -
  // ele deve só confirmar a etapa atual, como clicar em "Avançar".
  config.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && evento.target.matches("input.wizard__campo")) {
      evento.preventDefault();
      evento.target.parentElement.querySelector('[data-action="avancar-campo"]')?.click();
    }
  });

  document.getElementById("servico")?.addEventListener("change", atualizarVisibilidadeConfig);
  atualizarVisibilidadeConfig();
  renderTudo();
}

init();

window.PortaWizard = { linhasResumo, temPortas, reset };
