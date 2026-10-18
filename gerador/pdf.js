// Geração do PDF do orçamento (jsPDF, servido de gerador/vendor/ - sem CDN de terceiros).
//
// Layout de documento comercial: empresa e número no topo, cliente, tabela de itens, totais,
// condições, formas de pagamento e assinaturas. Os dados da empresa (CNPJ, endereço) vêm da tabela
// criptografada - não ficam neste arquivo, que é público.
//
// O PDF é do cliente: nunca mostra custo, percentual, acréscimos internos ou fornecedor. Com
// "mostrarValores" desligado, os itens saem sem preço e só os totais por serviço aparecem.

import { descreverItem } from "./calculo.js";

const COR = {
  preto: [0, 0, 0],
  noite: [27, 21, 18],
  dourado: [182, 138, 59],
  douradoClaro: [217, 181, 112],
  carvao: [42, 37, 33],
  cinza: [112, 104, 97],
  linha: [226, 215, 196],
  zebra: [249, 246, 240],
  creme: [242, 236, 224],
  branco: [255, 255, 255],
};

const CONTATO = "WhatsApp (47) 99222-2385  ·  Instagram @refinatto.instalacoes";
const A4 = { largura: 210, altura: 297 };
const MARGEM = 15;
const CONTEUDO = A4.largura - MARGEM * 2;
const LIMITE_INFERIOR = A4.altura - 22;

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// O Intl separa "R$" do número com espaço não separável; as fontes padrão do PDF lidam melhor
// com o espaço comum.
export const formatarMoeda = (valor) => moeda.format(valor).replace(/ /g, " ");
const formatarData = (data) => data.toLocaleDateString("pt-BR");
const primeiraMaiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

async function carregarImagem(caminho) {
  const blob = await (await fetch(caminho)).blob();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

export async function gerarPdf(orcamento, resumo, tabela) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await carregarImagem("../img/logo-completo.jpg");
  const empresa = tabela.empresa ?? {};
  const emissao = new Date();
  const validade = new Date(emissao);
  validade.setDate(validade.getDate() + (Number(orcamento.validadeDias) || 7));
  const numero = orcamento.numero || "-";
  const mostrarValores = !!orcamento.mostrarValores;

  // --- Helpers de desenho ------------------------------------------------------
  const fonte = (tamanho, estilo = "normal", cor = COR.carvao) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
  };
  const texto = (conteudo, x, y, opcoes = {}) => {
    fonte(opcoes.tamanho ?? 9.5, opcoes.estilo, opcoes.cor);
    doc.text(conteudo, x, y, { align: opcoes.alinhar ?? "left", baseline: opcoes.baseline ?? "alphabetic" });
  };
  const quebrar = (conteudo, largura, tamanho, estilo = "normal") => {
    fonte(tamanho, estilo);
    return doc.splitTextToSize(conteudo, largura);
  };
  const retangulo = (x, y, l, a, preenchimento, borda) => {
    if (preenchimento) doc.setFillColor(...preenchimento);
    if (borda) { doc.setDrawColor(...borda); doc.setLineWidth(0.25); }
    doc.rect(x, y, l, a, preenchimento && borda ? "FD" : preenchimento ? "F" : "S");
  };

  let y = 0;

  const cabecalhoContinuacao = () => {
    retangulo(0, 0, A4.largura, 13, COR.noite);
    texto(`Orçamento nº ${numero}`, MARGEM, 8.4, { tamanho: 8.5, estilo: "bold", cor: COR.douradoClaro });
    texto(orcamento.cliente.nome, A4.largura - MARGEM, 8.4, { tamanho: 8.5, cor: COR.creme, alinhar: "right" });
    y = 22;
  };

  const garantirEspaco = (altura, aoQuebrar) => {
    if (y + altura <= LIMITE_INFERIOR) return false;
    doc.addPage();
    cabecalhoContinuacao();
    aoQuebrar?.();
    return true;
  };

  const tituloSecao = (titulo, x = MARGEM, largura = CONTEUDO, avancar = true) => {
    if (avancar) garantirEspaco(16);
    texto(titulo.toUpperCase(), x, y, { tamanho: 8.5, estilo: "bold", cor: COR.dourado });
    doc.setDrawColor(...COR.dourado);
    doc.setLineWidth(0.5);
    doc.line(x, y + 2, x + largura, y + 2);
    if (avancar) y += 7;
  };

  // --- Cabeçalho -----------------------------------------------------------------
  retangulo(0, 0, A4.largura, 4, COR.noite);

  // Logo (exportada com fundo preto) num selo escuro com cantos arredondados.
  doc.setFillColor(...COR.preto);
  doc.roundedRect(MARGEM, 12, 50, 19, 2.5, 2.5, "F");
  doc.addImage(logo, "JPEG", MARGEM + 2.5, 13.6, 45, 16.07);

  const xEmpresa = MARGEM + 56;
  const linhasNome = quebrar(empresa.nome ?? "Refinatto", 68, 10.5, "bold");
  texto(linhasNome, xEmpresa, 15.5, { tamanho: 10.5, estilo: "bold", cor: COR.noite });
  let yEmpresa = 15.5 + linhasNome.length * 4.4;
  const dadosEmpresa = [
    empresa.cnpj && `CNPJ ${empresa.cnpj}`,
    empresa.endereco,
    [empresa.cidade, empresa.cep && `CEP ${empresa.cep}`].filter(Boolean).join("  ·  "),
  ].filter(Boolean);
  for (const linha of dadosEmpresa) {
    texto(linha, xEmpresa, yEmpresa, { tamanho: 8, cor: COR.cinza });
    yEmpresa += 3.8;
  }

  const xDireita = A4.largura - MARGEM;
  texto("ORÇAMENTO", xDireita, 17, { tamanho: 17, estilo: "bold", cor: COR.noite, alinhar: "right" });
  texto(`nº ${numero}`, xDireita, 23, { tamanho: 10, estilo: "bold", cor: COR.dourado, alinhar: "right" });
  texto(`Emitido em ${formatarData(emissao)}`, xDireita, 28, { tamanho: 8, cor: COR.cinza, alinhar: "right" });
  texto(`Válido até ${formatarData(validade)}`, xDireita, 31.8, { tamanho: 8, cor: COR.cinza, alinhar: "right" });

  y = Math.max(yEmpresa, 36) + 5;

  // --- Cliente ---------------------------------------------------------------------
  tituloSecao("Cliente");
  const dadosCliente = [
    ["Nome", orcamento.cliente.nome],
    ["Telefone", orcamento.cliente.telefone],
    ["Cidade / bairro", orcamento.cliente.cidade],
  ].filter(([, valor]) => valor?.trim());
  const larguraRotulo = 34;
  for (const [rotulo, valor] of dadosCliente) {
    const linhas = quebrar(valor, CONTEUDO - larguraRotulo - 6, 9.5);
    const altura = Math.max(7.5, linhas.length * 4.2 + 3.3);
    retangulo(MARGEM, y, larguraRotulo, altura, COR.creme, COR.linha);
    retangulo(MARGEM + larguraRotulo, y, CONTEUDO - larguraRotulo, altura, COR.branco, COR.linha);
    texto(rotulo, MARGEM + 3, y + 4.9, { tamanho: 8.5, estilo: "bold", cor: COR.noite });
    texto(linhas, MARGEM + larguraRotulo + 3, y + 4.9, { tamanho: 9.5, cor: COR.carvao });
    y += altura;
  }
  y += 8;

  // --- Itens -------------------------------------------------------------------------
  tituloSecao("Produtos e serviços");

  const colunas = mostrarValores
    ? [
      { titulo: "Descrição", largura: CONTEUDO - 30 - 22 - 30, alinhar: "left" },
      { titulo: "Valor unit.", largura: 30, alinhar: "right" },
      { titulo: "Qtd.", largura: 22, alinhar: "right" },
      { titulo: "Total", largura: 30, alinhar: "right" },
    ]
    : [
      { titulo: "Descrição", largura: CONTEUDO - 26, alinhar: "left" },
      { titulo: "Qtd.", largura: 26, alinhar: "right" },
    ];
  const PADDING = 3;

  const cabecalhoTabela = () => {
    retangulo(MARGEM, y, CONTEUDO, 7.5, COR.noite);
    let x = MARGEM;
    for (const coluna of colunas) {
      const xTexto = coluna.alinhar === "right" ? x + coluna.largura - PADDING : x + PADDING;
      texto(coluna.titulo, xTexto, y + 4.9, { tamanho: 8, estilo: "bold", cor: COR.creme, alinhar: coluna.alinhar });
      x += coluna.largura;
    }
    y += 7.5;
  };

  const linhasValidas = resumo.itens.filter((i) => !i.calculo.erro);
  const ordem = ["porta", "rodape"];
  linhasValidas.sort((a, b) => ordem.indexOf(a.item.tipo) - ordem.indexOf(b.item.tipo));

  cabecalhoTabela();
  linhasValidas.forEach(({ item, calculo, precoUnitario, preco }, indice) => {
    const descricao = descreverItem(item, calculo, tabela);
    const titulo = item.identificacao ? `${primeiraMaiuscula(descricao.titulo)} · ${item.identificacao}` : primeiraMaiuscula(descricao.titulo);
    const larguraDescricao = colunas[0].largura - PADDING * 2;
    const linhasTitulo = quebrar(titulo, larguraDescricao, 9.5, "bold");
    const linhasDetalhe = descricao.detalhes.length ? quebrar(primeiraMaiuscula(descricao.detalhes.join(", ")) + ".", larguraDescricao, 8) : [];
    const altura = 4 + linhasTitulo.length * 4.3 + linhasDetalhe.length * 3.6 + 1.8;

    garantirEspaco(altura, cabecalhoTabela);
    retangulo(MARGEM, y, CONTEUDO, altura, indice % 2 ? COR.zebra : COR.branco);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.25);
    doc.line(MARGEM, y + altura, MARGEM + CONTEUDO, y + altura);

    const yTexto = y + 5.6;
    texto(linhasTitulo, MARGEM + PADDING, yTexto, { tamanho: 9.5, estilo: "bold", cor: COR.noite });
    if (linhasDetalhe.length) texto(linhasDetalhe, MARGEM + PADDING, yTexto + linhasTitulo.length * 4.3 - 0.4, { tamanho: 8, cor: COR.cinza });

    const valores = mostrarValores
      ? [formatarMoeda(precoUnitario), descricao.quantidade, formatarMoeda(preco)]
      : [descricao.quantidade];
    let x = MARGEM + colunas[0].largura;
    valores.forEach((valor, i) => {
      const coluna = colunas[i + 1];
      const ultimo = i === valores.length - 1;
      texto(valor, x + coluna.largura - PADDING, yTexto, { tamanho: 9, estilo: ultimo && mostrarValores ? "bold" : "normal", cor: COR.carvao, alinhar: "right" });
      x += coluna.largura;
    });
    y += altura;
  });
  y += 6;

  // --- Totais ------------------------------------------------------------------------
  const grupos = [
    ["Portas", resumo.grupos.porta],
    ["Rodapés", resumo.grupos.rodape],
  ].filter(([, g]) => g.itens > 0);
  const larguraTotais = 88;
  const xTotais = A4.largura - MARGEM - larguraTotais;
  garantirEspaco(grupos.length * 7 + 16);
  if (grupos.length > 1 || !mostrarValores) {
    for (const [rotulo, grupo] of grupos) {
      texto(`Total ${rotulo.toLowerCase()}`, xTotais + 4, y + 4.8, { tamanho: 9, cor: COR.cinza });
      texto(formatarMoeda(grupo.preco), A4.largura - MARGEM - 4, y + 4.8, { tamanho: 9.5, estilo: "bold", cor: COR.carvao, alinhar: "right" });
      doc.setDrawColor(...COR.linha);
      doc.line(xTotais, y + 7, A4.largura - MARGEM, y + 7);
      y += 7;
    }
    y += 2;
  }
  doc.setFillColor(...COR.noite);
  doc.roundedRect(xTotais, y, larguraTotais, 13, 1.8, 1.8, "F");
  texto("TOTAL", xTotais + 5, y + 8.3, { tamanho: 9.5, estilo: "bold", cor: COR.creme });
  texto(formatarMoeda(resumo.preco), A4.largura - MARGEM - 5, y + 8.7, { tamanho: 14, estilo: "bold", cor: COR.douradoClaro, alinhar: "right" });
  y += 22;

  // --- Condições e pagamento (lado a lado), observações -------------------------
  const ESPACO_LINHA = 4.4;
  const meia = (CONTEUDO - 10) / 2;
  const condicoes = quebrar([
    "Valor da instalação já incluso nos produtos.",
    `Orçamento válido por ${Number(orcamento.validadeDias) || 7} dias, até ${formatarData(validade)}.`,
  ].join("\n"), meia, 9.5);
  const pagamento = orcamento.formasPagamento?.trim() ? quebrar(orcamento.formasPagamento.trim(), meia, 9.5) : [];
  garantirEspaco(12 + Math.max(condicoes.length, pagamento.length) * ESPACO_LINHA);
  tituloSecao("Condições", MARGEM, pagamento.length ? meia : CONTEUDO, false);
  if (pagamento.length) tituloSecao("Formas de pagamento", MARGEM + meia + 10, meia, false);
  y += 7;
  texto(condicoes, MARGEM, y, { tamanho: 9.5, cor: COR.carvao });
  if (pagamento.length) texto(pagamento, MARGEM + meia + 10, y, { tamanho: 9.5, cor: COR.carvao });
  y += Math.max(condicoes.length, pagamento.length) * ESPACO_LINHA + 6;

  if (orcamento.observacoes?.trim()) {
    const linhas = quebrar(orcamento.observacoes.trim(), CONTEUDO, 9.5);
    garantirEspaco(12 + linhas.length * ESPACO_LINHA);
    tituloSecao("Observações");
    texto(linhas, MARGEM, y, { tamanho: 9.5, cor: COR.carvao });
    y += linhas.length * ESPACO_LINHA + 6;
  }

  // --- Assinaturas (no pé da última página, ou numa nova se não couber) ---------------
  const yAssinatura = A4.altura - 33;
  if (y > yAssinatura - 14) {
    doc.addPage();
    cabecalhoContinuacao();
  }
  const larguraAssinatura = 74;
  const assinatura = (x, nome, legenda) => {
    doc.setDrawColor(...COR.carvao);
    doc.setLineWidth(0.3);
    doc.line(x, yAssinatura, x + larguraAssinatura, yAssinatura);
    const linhasNome = quebrar(nome, larguraAssinatura, 9, "bold");
    const centro = x + larguraAssinatura / 2;
    texto(linhasNome, centro, yAssinatura + 5, { tamanho: 9, estilo: "bold", cor: COR.noite, alinhar: "center" });
    texto(legenda, centro, yAssinatura + 5 + linhasNome.length * 3.9, { tamanho: 8, cor: COR.cinza, alinhar: "center" });
  };
  assinatura(MARGEM + 4, orcamento.cliente.nome, "Cliente");
  assinatura(A4.largura - MARGEM - 4 - larguraAssinatura, empresa.nome ?? "Refinatto", empresa.cnpj ? `CNPJ ${empresa.cnpj}` : "Empresa");

  // --- Rodapé de todas as páginas ------------------------------------------------------
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, A4.altura - 13, A4.largura - MARGEM, A4.altura - 13);
    texto(`Refinatto  ·  ${CONTATO}`, MARGEM, A4.altura - 8, { tamanho: 7.5, cor: COR.cinza });
    texto(`Página ${i} de ${paginas}`, A4.largura - MARGEM, A4.altura - 8, { tamanho: 7.5, cor: COR.cinza, alinhar: "right" });
  }

  doc.setProperties({ title: `Orçamento ${numero} - ${orcamento.cliente.nome}`, author: "Refinatto", creator: "Refinatto" });
  const nomeArquivo = `Orcamento-${numero}-${orcamento.cliente.nome}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "");
  return { blob: doc.output("blob"), nomeArquivo: `${nomeArquivo}.pdf` };
}
