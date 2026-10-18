// Motor de cálculo do gerador de orçamentos - funções puras, sem DOM.
//
// Os preços e as regras (acréscimos de altura, camarão, linha, fora do padrão) vêm todos da tabela
// entregue por /api/tabela depois do login. Nada de valor de custo fica escrito neste arquivo, que
// é público.

export function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function precoDeVenda(custo, percentual) {
  const p = Number(percentual);
  return arredondar(custo * (1 + (Number.isFinite(p) ? p : 0) / 100));
}

function idMedida(m) {
  return `${m.altura}x${m.largura}`;
}

function novoId() {
  return globalThis.crypto?.randomUUID?.() ?? `i${Date.now()}${Math.random().toString(16).slice(2)}`;
}

// --- Criação de itens ------------------------------------------------------

export function novaPorta(tabela) {
  const linha = tabela.folhas.find((f) => f.id === "mdp") ?? tabela.folhas[0];
  const medida = linha.precos.find((m) => m.altura === 2100 && m.largura === 800) ?? linha.precos[0];
  return {
    tipo: "porta",
    id: novoId(),
    identificacao: "",
    quantidade: 1,
    abertura: tabela.aberturas[0].id,
    linha: linha.id,
    medida: idMedida(medida),
    sobMedida: { largura: "", altura: "" },
    friso: false,
    foraDoPadrao: false,
    batente: "",
    encaixe: false,
    guarnicao: "",
    regulagem: "35",
    lados: 2,
    ambosLados: false,
    fechadura: "",
    dobradica: "",
    kitDesmarcado: [],
    servicos: [],
    acessorios: [],
  };
}

export function novoRodape(tabela) {
  return {
    tipo: "rodape",
    id: novoId(),
    identificacao: "",
    perfil: tabela.rodapes.precos[0].id,
    metros: "",
    compra: "metro",
  };
}

export function duplicarItem(item) {
  return { ...structuredClone(item), id: novoId() };
}

// --- Porta -------------------------------------------------------------------

export function medidasDaLinha(tabela, linhaId) {
  const linha = tabela.folhas.find((f) => f.id === linhaId);
  return linha ? linha.precos.map((m) => ({ id: idMedida(m), ...m })) : [];
}

// Sob medida: cota pela menor medida da tabela que comporta a pedida (largura E altura).
function medidaParaSobMedida(linha, largura, altura) {
  return linha.precos
    .filter((m) => m.largura >= largura && m.altura >= altura)
    .sort((a, b) => a.preco - b.preco || a.largura * a.altura - b.largura * b.altura)[0] ?? null;
}

export function calcularPorta(porta, tabela) {
  const linhas = [];
  const add = (rotulo, valor) => { if (valor) linhas.push({ rotulo, valor: arredondar(valor) }); };
  const quantidade = Math.max(1, Math.floor(Number(porta.quantidade)) || 1);

  const linha = tabela.folhas.find((f) => f.id === porta.linha);
  const abertura = tabela.aberturas.find((a) => a.id === porta.abertura);
  if (!linha || !abertura) return { erro: "Escolha a linha da folha e o tipo de abertura.", linhas, quantidade };

  let medida;
  const sobMedida = porta.medida === "sob_medida";
  if (sobMedida) {
    const largura = Number(porta.sobMedida?.largura);
    const altura = Number(porta.sobMedida?.altura);
    if (!(largura > 0) || !(altura > 0)) return { erro: "Informe largura e altura da medida especial.", linhas, quantidade };
    medida = medidaParaSobMedida(linha, largura, altura);
    if (!medida) return { erro: `A linha ${linha.rotulo} não tem medida que comporte ${largura} × ${altura} mm.`, linhas, quantidade };
  } else {
    medida = linha.precos.find((m) => idMedida(m) === porta.medida);
    if (!medida) return { erro: "Escolha a medida da folha.", linhas, quantidade };
  }

  const fatorAbertura = 1 + (abertura.acrescimoFolhaBatente ?? 0);
  const regras = tabela.regras;
  const fatorAltura = medida.altura >= regras.alturaAcrescimoBatenteGuarnicao ? 1 + regras.acrescimoBatenteGuarnicaoAltura : 1;

  add(`Folha ${linha.rotulo} ${medida.largura} × ${medida.altura}`, medida.preco * fatorAbertura);
  if (porta.friso && linha.friso) add("Friso na folha", linha.friso);

  const batente = tabela.batentes.precos.find((b) => String(b.largura) === String(porta.batente));
  if (batente) {
    add(`Batente ${batente.largura} mm`, batente.preco * fatorAltura * fatorAbertura);
    if (porta.encaixe) add(tabela.batentes.encaixe.rotulo, tabela.batentes.encaixe.preco);
  }

  const guarnicao = tabela.guarnicoes.precos.find((g) => g.id === porta.guarnicao);
  if (guarnicao) {
    const regulagem = porta.regulagem === "60" ? "regulagem60" : "regulagem35";
    const lados = Number(porta.lados) === 1 ? 1 : 2;
    add(`Guarnição ${guarnicao.rotulo} × ${lados} lado${lados > 1 ? "s" : ""}`, guarnicao[regulagem] * lados * fatorAltura);
    if (porta.ambosLados) add("Regulagem ambos os lados", tabela.guarnicoes.ambosLados[regulagem]);
  }

  if (abertura.fechadura) {
    const fechadura = tabela.fechaduras.find((f) => f.id === porta.fechadura);
    if (fechadura) add(`Fechadura ${fechadura.rotulo}`, fechadura.preco);
  }
  if (abertura.dobradica) {
    const dobradica = tabela.dobradicas.find((d) => d.id === porta.dobradica);
    if (dobradica) add(`Dobradiças ${dobradica.rotulo}`, dobradica.preco);
  }
  for (const peca of abertura.kit) {
    if (!porta.kitDesmarcado.includes(peca.id)) add(peca.rotulo, peca.preco);
  }
  for (const servico of tabela.servicos) {
    if (!porta.servicos.includes(servico.id)) continue;
    const fator = servico.acrescimoLinha && linha.acrescimoServicos ? 1 + linha.acrescimoServicos : 1;
    add(servico.rotulo, servico.preco * fator);
  }
  for (const acessorio of tabela.acessorios) {
    if (porta.acessorios.includes(acessorio.id)) add(acessorio.rotulo, acessorio.preco);
  }

  const foraDoPadrao = sobMedida || !!porta.foraDoPadrao;
  const subtotal = linhas.reduce((soma, l) => soma + l.valor, 0);
  if (foraDoPadrao) add(`Fora do padrão (+${Math.round(regras.acrescimoForaDoPadrao * 100)}%)`, subtotal * regras.acrescimoForaDoPadrao);

  const custoUnitario = arredondar(linhas.reduce((soma, l) => soma + l.valor, 0));
  return {
    linhas,
    quantidade,
    medidaCotada: medida,
    sobMedida,
    foraDoPadrao,
    custoUnitario,
    custo: arredondar(custoUnitario * quantidade),
  };
}

// --- Rodapé ------------------------------------------------------------------

export function calcularRodape(rodape, tabela) {
  const perfil = tabela.rodapes.precos.find((p) => p.id === rodape.perfil);
  const metros = Number(String(rodape.metros).replace(",", "."));
  if (!perfil) return { erro: "Escolha o perfil do rodapé.", linhas: [] };
  if (!(metros > 0)) return { erro: "Informe a metragem do rodapé.", linhas: [] };

  if (rodape.compra === "caixa") {
    const porCaixa = tabela.rodapes.metrosPorCaixa;
    const caixas = Math.ceil(metros / porCaixa - 1e-9);
    const custo = arredondar(caixas * perfil.caixa);
    return { linhas: [{ rotulo: `${caixas} caixa${caixas > 1 ? "s" : ""} ${perfil.rotulo} (${String(porCaixa).replace(".", ",")} m cada)`, valor: custo }], metros, caixas, custo };
  }
  const custo = arredondar(metros * perfil.metro);
  return { linhas: [{ rotulo: `${String(metros).replace(".", ",")} m de ${perfil.rotulo}`, valor: custo }], metros, custo };
}

// --- Orçamento ---------------------------------------------------------------

export function calcularItem(item, tabela) {
  return item.tipo === "porta" ? calcularPorta(item, tabela) : calcularRodape(item, tabela);
}

export function resumirOrcamento(orcamento, tabela) {
  const grupos = { porta: { custo: 0, preco: 0, itens: 0 }, rodape: { custo: 0, preco: 0, itens: 0 } };
  const itens = orcamento.itens.map((item) => {
    const calculo = calcularItem(item, tabela);
    const preco = calculo.erro ? 0 : precoDeVenda(calculo.custo, orcamento.percentual);
    if (!calculo.erro) {
      const grupo = grupos[item.tipo];
      grupo.custo = arredondar(grupo.custo + calculo.custo);
      grupo.preco = arredondar(grupo.preco + preco);
      grupo.itens += 1;
    }
    return { item, calculo, preco };
  });
  const custo = arredondar(grupos.porta.custo + grupos.rodape.custo);
  const preco = arredondar(grupos.porta.preco + grupos.rodape.preco);
  return { itens, grupos, custo, preco, lucro: arredondar(preco - custo), comErro: itens.filter((i) => i.calculo.erro) };
}

// --- Textos para o cliente (PDF e resumo na tela) ---------------------------
// Nunca mencionam custo, percentual, acréscimos internos ou fornecedor.

export function descreverPorta(porta, calculo, tabela) {
  const linha = tabela.folhas.find((f) => f.id === porta.linha);
  const abertura = tabela.aberturas.find((a) => a.id === porta.abertura);
  const medida = calculo.sobMedida
    ? `medida especial ${porta.sobMedida.largura} × ${porta.sobMedida.altura} mm`
    : `${calculo.medidaCotada.largura} × ${calculo.medidaCotada.altura} mm`;
  const titulo = `Porta ${abertura.rotulo.toLowerCase()}, folha ${linha.rotulo}, ${medida}`;

  const detalhes = [];
  if (porta.friso && linha.friso) detalhes.push("folha com friso");
  const batente = tabela.batentes.precos.find((b) => String(b.largura) === String(porta.batente));
  if (batente) detalhes.push(`batente ${batente.largura} mm`);
  const guarnicao = tabela.guarnicoes.precos.find((g) => g.id === porta.guarnicao);
  if (guarnicao) detalhes.push(`guarnição ${guarnicao.rotulo} ${Number(porta.lados) === 1 ? "em 1 lado" : "nos 2 lados"}`);
  if (abertura.fechadura) {
    const fechadura = tabela.fechaduras.find((f) => f.id === porta.fechadura);
    if (fechadura) detalhes.push(`fechadura ${fechadura.rotulo}`);
  }
  if (abertura.dobradica) {
    const dobradica = tabela.dobradicas.find((d) => d.id === porta.dobradica);
    if (dobradica) detalhes.push(`dobradiças ${dobradica.rotulo.toLowerCase()}`);
  }
  const kit = abertura.kit.filter((p) => !porta.kitDesmarcado.includes(p.id)).map((p) => p.rotulo.toLowerCase());
  if (kit.length) detalhes.push(`kit ${abertura.rotulo.toLowerCase()}: ${kit.join(", ")}`);
  for (const s of tabela.servicos) if (porta.servicos.includes(s.id)) detalhes.push(s.rotulo.toLowerCase());
  for (const a of tabela.acessorios) if (porta.acessorios.includes(a.id)) detalhes.push(a.rotulo.toLowerCase());

  return { titulo, detalhes };
}

export function descreverRodape(rodape, calculo, tabela) {
  const perfil = tabela.rodapes.precos.find((p) => p.id === rodape.perfil);
  const metros = String(calculo.metros).replace(".", ",");
  const quantidade = calculo.caixas
    ? `${calculo.caixas} caixa${calculo.caixas > 1 ? "s" : ""} (${String(arredondar(calculo.caixas * tabela.rodapes.metrosPorCaixa)).replace(".", ",")} m)`
    : `${metros} m`;
  return { titulo: `Rodapé ${perfil.rotulo}, ${quantidade}`, detalhes: [] };
}

export function descreverItem(item, calculo, tabela) {
  return item.tipo === "porta" ? descreverPorta(item, calculo, tabela) : descreverRodape(item, calculo, tabela);
}
