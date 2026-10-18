# Refinatto

Site institucional de uma página da Refinatto (instalação de pisos laminados, rodapés e portas em
Ibirama / Alto Vale do Itajaí - SC). O dono é o Maicon. Publicado na Netlify.

## Stack

HTML + CSS + JavaScript puro. Sem build, sem framework, sem dependências, sem package.json.
Para rodar localmente: `python3 -m http.server 8000` na raiz e abrir http://localhost:8000.
Deploy = subir os arquivos da raiz como estão (Netlify publica a pasta raiz).

## Estrutura

- `index.html` - página inteira: header, hero, sobre, serviços, galeria, orçamento (form), footer.
- `css/style.css` - todo o estilo. Paleta em variáveis no `:root` (dourado sobre escuro/creme).
  Fontes self-hosted em `fonts/` (Fraunces para títulos, Public Sans para texto).
- `js/main.js` - número do WhatsApp (`WHATSAPP_NUMERO`), menu mobile, links do WhatsApp, envio do
  formulário (monta a mensagem e abre `wa.me`), animação `.reveal` com IntersectionObserver.
- `js/catalogo-portas.js` / `js/catalogo-rodapes.js` - SÓ DADOS (linhas, medidas, modelos, cores).
  Mudar produto/fornecedor = editar aqui, sem mexer na lógica.
- `js/porta-wizard.js` / `js/rodape-wizard.js` - configuradores passo a passo dentro do form de
  orçamento. Aparecem conforme o "Serviço desejado" escolhido. Expõem `window.PortaWizard` e
  `window.RodapeWizard` (`linhasResumo()`, `temPortas()/temRodapes()`, `reset()`), lidos pelo main.js.
- `img/` - logos, og-image e SVGs esquemáticos das folhas de porta e estilos de rodapé.

## Pontos de atenção

- Os scripts são clássicos (não módulos) e compartilham o escopo global. Por isso o wizard de
  rodapé usa sufixo `R` em tudo (`ETAPAS_R`, `CATALOGO_R`, `avancarR`...) para não colidir com o de
  portas. Qualquer `const`/`function` nova no nível do arquivo precisa de nome único entre arquivos.
- Ordem dos `<script>` no index.html importa: catálogo antes do wizard, `main.js` por último.
- Wizards: cada etapa é um objeto em `ETAPAS` (render genérico por `tipo`: lista, cards, texto,
  numero, nota). `mostrarSe(respostas)` torna a etapa condicional. No de portas, trocar o tipo de
  abertura chama `revalidar()` para descartar medidas que não existem na linha nova.
- Nome do fornecedor e códigos de modelo (PSS01...) NUNCA aparecem em texto visível do site; só vão
  na mensagem do WhatsApp quando `incluirCodigoFornecedor` é true.
- Limite de ~3500 caracteres no link do WhatsApp (`LIMITE_CARACTERES_SEGURO`); acima disso pede
  confirmação. Limites de 5 portas e 5 ambientes de rodapé por orçamento.
- Comentários e textos do site em português, tom informal em primeira pessoa (o Maicon falando).
- `og:url` ainda não definido nas meta tags; o comentário cita um `HOSPEDAGEM.md` que não veio no
  download da Netlify.
