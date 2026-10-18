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

// Botão flutuante e link do rodapé
document.getElementById("floatingWhatsapp").href = montarLinkWhatsapp();
document.getElementById("footerWhatsapp").href = montarLinkWhatsapp();
document.getElementById("galeriaWhatsapp").href = montarLinkWhatsapp(
  "Olá! Vim pelo site da Refinatto e gostaria de ver fotos de trabalhos já realizados."
);

// Formulário de orçamento -> WhatsApp
const form = document.getElementById("orcamentoForm");

form.addEventListener("submit", (evento) => {
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
document.getElementById("ano").textContent = new Date().getFullYear();

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
