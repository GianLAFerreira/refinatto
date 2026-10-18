// Geração do PDF do orçamento (jsPDF, servido de gerador/vendor/ - sem CDN de terceiros).
//
// O PDF é do cliente: mostra o que está sendo orçado e o total de cada serviço. Nunca custo,
// percentual, acréscimos internos ou fornecedor.

import { descreverItem } from "./calculo.js";

const COR = {
  preto: [0, 0, 0],
  noite: [27, 21, 18],
  dourado: [182, 138, 59],
  carvao: [42, 37, 33],
  cinza: [110, 102, 95],
  linha: [222, 210, 190],
  creme: [242, 236, 224],
};

const CONTATO = "WhatsApp (47) 99222-2385  ·  Instagram @refinatto.instalacoes";
const MARGEM = 16;
const LARGURA = 210;
const ALTURA = 297;
const LIMITE_INFERIOR = ALTURA - 24;

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// O Intl separa "R$" do número com espaço não separável; as fontes padrão do PDF lidam melhor
// com o espaço comum.
export const formatarMoeda = (valor) => moeda.format(valor).replace(/ /g, " ");
const formatarData = (data) => data.toLocaleDateString("pt-BR");

async function carregarImagem(caminho) {
  const blob = await (await fetch(caminho)).blob();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

export function numeroDoOrcamento(data = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}`;
}

export async function gerarPdf(orcamento, resumo, tabela) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await carregarImagem("../img/logo-completo.jpg");
  const agora = new Date();
  const numero = numeroDoOrcamento(agora);
  const validade = new Date(agora);
  validade.setDate(validade.getDate() + (Number(orcamento.validadeDias) || 7));

  const texto = (conteudo, x, y, { tamanho = 10, cor = COR.carvao, estilo = "normal", alinhar = "left" } = {}) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    doc.text(conteudo, x, y, { align: alinhar });
  };

  // --- Cabeçalho ---
  doc.setFillColor(...COR.preto);
  doc.rect(0, 0, LARGURA, 40, "F");
  doc.addImage(logo, "JPEG", MARGEM - 2, 9, 63, 22.5);
  texto("ORÇAMENTO", LARGURA - MARGEM, 17, { tamanho: 16, cor: COR.dourado, estilo: "bold", alinhar: "right" });
  texto(`Nº ${numero}`, LARGURA - MARGEM, 24, { tamanho: 9, cor: COR.creme, alinhar: "right" });
  texto(`Emitido em ${formatarData(agora)}`, LARGURA - MARGEM, 29, { tamanho: 9, cor: COR.creme, alinhar: "right" });
  doc.setFillColor(...COR.dourado);
  doc.rect(0, 40, LARGURA, 1.2, "F");

  // --- Cliente ---
  let y = 54;
  texto("CLIENTE", MARGEM, y, { tamanho: 8, cor: COR.dourado, estilo: "bold" });
  texto(`VÁLIDO ATÉ ${formatarData(validade)}`, LARGURA - MARGEM, y, { tamanho: 8, cor: COR.dourado, estilo: "bold", alinhar: "right" });
  y += 7;
  texto(orcamento.cliente.nome, MARGEM, y, { tamanho: 14, cor: COR.noite, estilo: "bold" });
  const contatoCliente = [orcamento.cliente.telefone, orcamento.cliente.cidade].filter(Boolean).join("  ·  ");
  if (contatoCliente) { y += 6; texto(contatoCliente, MARGEM, y, { tamanho: 10, cor: COR.cinza }); }
  y += 10;

  const novaPaginaSePreciso = (alturaNecessaria) => {
    if (y + alturaNecessaria <= LIMITE_INFERIOR) return;
    doc.addPage();
    doc.setFillColor(...COR.preto);
    doc.rect(0, 0, LARGURA, 14, "F");
    texto(`Orçamento Nº ${numero}  ·  ${orcamento.cliente.nome}`, MARGEM, 9, { tamanho: 9, cor: COR.creme });
    y = 26;
  };

  const larguraTexto = LARGURA - MARGEM * 2 - 12;

  const secao = (titulo, tipo) => {
    const itens = resumo.itens.filter((i) => i.item.tipo === tipo && !i.calculo.erro);
    if (!itens.length) return;

    novaPaginaSePreciso(24);
    texto(titulo.toUpperCase(), MARGEM, y, { tamanho: 11, cor: COR.noite, estilo: "bold" });
    y += 2.5;
    doc.setDrawColor(...COR.dourado);
    doc.setLineWidth(0.6);
    doc.line(MARGEM, y, MARGEM + 22, y);
    y += 7;

    for (const { item, calculo } of itens) {
      const { titulo: tituloItem, detalhes } = descreverItem(item, calculo, tabela);
      const quantidade = item.tipo === "porta" ? `${calculo.quantidade}×` : "";
      const nomeItem = item.identificacao ? `${item.identificacao}: ${tituloItem}` : tituloItem;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const linhasTitulo = doc.splitTextToSize(nomeItem, larguraTexto);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const linhasDetalhe = detalhes.length ? doc.splitTextToSize(detalhes.join(", "), larguraTexto) : [];
      novaPaginaSePreciso(linhasTitulo.length * 5 + linhasDetalhe.length * 4.4 + 4);

      if (quantidade) texto(quantidade, MARGEM, y, { tamanho: 10, cor: COR.dourado, estilo: "bold" });
      texto(linhasTitulo, MARGEM + 12, y, { tamanho: 10, cor: COR.noite, estilo: "bold" });
      y += linhasTitulo.length * 5;
      if (linhasDetalhe.length) {
        texto(linhasDetalhe, MARGEM + 12, y - 0.5, { tamanho: 9, cor: COR.cinza });
        y += linhasDetalhe.length * 4.4;
      }
      y += 3;
    }

    novaPaginaSePreciso(12);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, y, LARGURA - MARGEM, y);
    y += 6;
    texto(`Total ${titulo.toLowerCase()}`, LARGURA - MARGEM - 48, y, { tamanho: 10, cor: COR.cinza, alinhar: "right" });
    texto(formatarMoeda(resumo.grupos[tipo].preco), LARGURA - MARGEM, y, { tamanho: 11, cor: COR.noite, estilo: "bold", alinhar: "right" });
    y += 12;
  };

  secao("Portas", "porta");
  secao("Rodapés", "rodape");

  // --- Total geral ---
  novaPaginaSePreciso(30);
  doc.setFillColor(...COR.noite);
  doc.roundedRect(MARGEM, y, LARGURA - MARGEM * 2, 18, 2, 2, "F");
  texto("TOTAL DO ORÇAMENTO", MARGEM + 6, y + 11, { tamanho: 10, cor: COR.creme, estilo: "bold" });
  texto(formatarMoeda(resumo.preco), LARGURA - MARGEM - 6, y + 11.5, { tamanho: 15, cor: COR.dourado, estilo: "bold", alinhar: "right" });
  y += 24;
  texto("Valores com material e instalação inclusos.", MARGEM, y, { tamanho: 9, cor: COR.cinza });
  y += 10;

  if (orcamento.observacoes?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const linhasObs = doc.splitTextToSize(orcamento.observacoes.trim(), LARGURA - MARGEM * 2);
    novaPaginaSePreciso(10 + linhasObs.length * 4.6);
    texto("OBSERVAÇÕES", MARGEM, y, { tamanho: 8, cor: COR.dourado, estilo: "bold" });
    y += 6;
    texto(linhasObs, MARGEM, y, { tamanho: 9.5, cor: COR.carvao });
  }

  // --- Rodapé de todas as páginas ---
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, ALTURA - 16, LARGURA - MARGEM, ALTURA - 16);
    texto(`Refinatto  ·  ${CONTATO}`, MARGEM, ALTURA - 10, { tamanho: 8, cor: COR.cinza });
    texto(`${i}/${paginas}`, LARGURA - MARGEM, ALTURA - 10, { tamanho: 8, cor: COR.cinza, alinhar: "right" });
  }

  doc.setProperties({ title: `Orçamento ${numero} - ${orcamento.cliente.nome}`, author: "Refinatto", creator: "Refinatto" });
  const nomeArquivo = `Orcamento-Refinatto-${numero}-${orcamento.cliente.nome}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "");
  return { blob: doc.output("blob"), nomeArquivo: `${nomeArquivo}.pdf` };
}
