const WHATSAPP_NUMERO = "5547992222385";

const MENSAGEM_PADRAO = "Olá! Vim pelo site da Refinatto e gostaria de um orçamento.";

// Sem confirmação oficial do WhatsApp sobre o limite de caracteres do link "wa.me?text=" - só
// relatos de corte de mensagem em alguns aparelhos/navegadores na faixa de poucos milhares de
// caracteres. 3500 dá folga abaixo disso. Medido: mensagem base ~366, +141 por porta totalmente
// preenchida, +251 por rodapé totalmente preenchido.
const LIMITE_CARACTERES_SEGURO = 3500;

function montarLinkWhatsapp(mensagem) {
  const texto = encodeURIComponent(mensagem || MENSAGEM_PADRAO);
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`;
}

// Menu mobile
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const aberto = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", aberto ? "true" : "false");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Links de WhatsApp: botão flutuante, rodapé e qualquer link com data-whatsapp (a mensagem vem do
// próprio atributo; vazio = mensagem padrão). As páginas de serviço usam só o data-whatsapp.
function ligarWhatsapp(elemento, mensagem) {
  if (elemento) elemento.href = montarLinkWhatsapp(mensagem);
}

ligarWhatsapp(document.getElementById("floatingWhatsapp"));
ligarWhatsapp(document.getElementById("footerWhatsapp"));
ligarWhatsapp(
  document.getElementById("galeriaWhatsapp"),
  "Olá! Vim pelo site da Refinatto e gostaria de ver fotos de trabalhos já realizados."
);
document.querySelectorAll("[data-whatsapp]").forEach((link) => ligarWhatsapp(link, link.dataset.whatsapp));

// Formulário de orçamento -> WhatsApp (só existe na página inicial)
const form = document.getElementById("orcamentoForm");

// Vindo de uma página de serviço (/?servico=Porta#orcamento), já deixa o serviço escolhido e
// avisa os configuradores, que aparecem conforme o "change" do select
const selectServico = document.getElementById("servico");
const servicoDaUrl = new URLSearchParams(location.search).get("servico");
if (selectServico && servicoDaUrl && [...selectServico.options].some((o) => o.value === servicoDaUrl)) {
  selectServico.value = servicoDaUrl;
  selectServico.dispatchEvent(new Event("change"));
}

form?.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const servico = document.getElementById("servico").value.trim();
  const cidade = document.getElementById("cidade").value.trim();
  const mensagem = document.getElementById("mensagem").value.trim();

  const linhas = [
    "Olá! Vim pelo site da Refinatto e gostaria de um orçamento.",
    `Nome: ${nome}`,
    `Serviço: ${servico}`,
  ];

  if (cidade) linhas.push(`Cidade/Bairro: ${cidade}`);

  if (window.PortaWizard?.temPortas()) {
    linhas.push("", ...window.PortaWizard.linhasResumo());
  }

  if (window.RodapeWizard?.temRodapes()) {
    linhas.push("", ...window.RodapeWizard.linhasResumo());
  }

  if (mensagem) linhas.push("", `Mensagem: ${mensagem}`);

  const link = montarLinkWhatsapp(linhas.join("\n"));

  if (link.length > LIMITE_CARACTERES_SEGURO) {
    const continuar = confirm(
      "Esse orçamento ficou grande (muitos itens ou respostas longas) e a mensagem pode chegar " +
      "cortada no WhatsApp em alguns aparelhos.\n\n" +
      "Você pode enviar assim mesmo, ou cancelar e remover algum item antes de enviar.\n\n" +
      "Enviar mesmo assim?"
    );
    if (!continuar) return;
  }

  window.open(link, "_blank", "noopener");
});

// Ano no rodapé
const anoRodape = document.getElementById("ano");
if (anoRodape) anoRodape.textContent = new Date().getFullYear();

// Visualizador das fotos da galeria: sem JS o link abre a foto grande direto, com JS abre num
// <dialog> por cima da página, com setas (botões, teclado e deslizar o dedo) e Esc para fechar
const visualizador = document.getElementById("visualizador");
const visualizadorFoto = document.getElementById("visualizadorFoto");
const linksGaleria = Array.from(document.querySelectorAll(".galeria__link"));
let fotoAtualGaleria = 0;

function mostrarFotoGaleria(indice) {
  fotoAtualGaleria = (indice + linksGaleria.length) % linksGaleria.length;
  const link = linksGaleria[fotoAtualGaleria];
  visualizadorFoto.src = link.href;
  visualizadorFoto.alt = link.querySelector("img").alt;
}

if (visualizador && typeof visualizador.showModal === "function") {
  linksGaleria.forEach((link, indice) => {
    link.addEventListener("click", (evento) => {
      evento.preventDefault();
      mostrarFotoGaleria(indice);
      visualizador.showModal();
    });
  });

  document.getElementById("visualizadorFechar").addEventListener("click", () => visualizador.close());
  document.getElementById("visualizadorAnterior").addEventListener("click", () => mostrarFotoGaleria(fotoAtualGaleria - 1));
  document.getElementById("visualizadorProxima").addEventListener("click", () => mostrarFotoGaleria(fotoAtualGaleria + 1));

  // Clicar fora da foto (no fundo escuro) fecha
  visualizador.addEventListener("click", (evento) => {
    if (evento.target === visualizador) visualizador.close();
  });

  visualizador.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowLeft") mostrarFotoGaleria(fotoAtualGaleria - 1);
    if (evento.key === "ArrowRight") mostrarFotoGaleria(fotoAtualGaleria + 1);
  });

  let inicioToqueGaleria = null;
  visualizador.addEventListener("touchstart", (evento) => {
    inicioToqueGaleria = evento.touches[0].clientX;
  }, { passive: true });
  visualizador.addEventListener("touchend", (evento) => {
    if (inicioToqueGaleria === null) return;
    const distancia = evento.changedTouches[0].clientX - inicioToqueGaleria;
    if (Math.abs(distancia) > 50) mostrarFotoGaleria(fotoAtualGaleria + (distancia < 0 ? 1 : -1));
    inicioToqueGaleria = null;
  });
}

// Revelação suave ao rolar a página (.reveal fica em index.html; a animação em si é CSS, só
// entra em cena com prefers-reduced-motion:no-preference - ver css/style.css)
const elementosReveal = document.querySelectorAll(".reveal");

if (elementosReveal.length) {
  if ("IntersectionObserver" in window) {
    const observadorReveal = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("is-visible");
            observadorReveal.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    elementosReveal.forEach((elemento) => observadorReveal.observe(elemento));

    // Rede de segurança: um salto de rolagem instantâneo (tecla End, um link "#ancora" sem
    // rolagem suave, etc.) pode pular uma seção sem nunca disparar o observer nela, deixando o
    // conteúdo invisível pra sempre. Depois de alguns segundos, revela tudo que sobrou.
    setTimeout(() => {
      elementosReveal.forEach((elemento) => elemento.classList.add("is-visible"));
    }, 4000);
  } else {
    // Navegador sem suporte a IntersectionObserver - melhor mostrar tudo do que nunca revelar
    elementosReveal.forEach((elemento) => elemento.classList.add("is-visible"));
  }
}
