# Refinatto

Site institucional de uma página da Refinatto (instalação de pisos laminados, rodapés e portas em
Ibirama / Alto Vale do Itajaí - SC). O dono é o Maicon. Publicado na Netlify em
https://refinattoinstalacoes.com.br (domínio no registro.br, DNS na Netlify; o endereço antigo
refinatto-instalacoes.netlify.app continua respondendo). `robots.txt` e `sitemap.xml` na raiz;
o link canônico e o og:url do index.html apontam para o domínio.

## Stack

HTML + CSS + JavaScript puro. Sem build, sem framework, sem dependências, sem package.json.
Para rodar localmente: `node scripts/servidor-local.mjs` e abrir http://localhost:8888 (serve o site
e as funções do gerador). Só o site público: `python3 -m http.server 8000` também serve.
Deploy automático: a Netlify publica a raiz a cada push na `main` (config em `netlify.toml`).

## Estrutura

- `index.html` - página inteira: header, hero, sobre, serviços, galeria, orçamento (form), footer.
- `css/style.css` - todo o estilo. Paleta em variáveis no `:root` (dourado sobre escuro/creme).
  Fontes self-hosted em `fonts/` (Fraunces para títulos, Public Sans para texto).
- `js/main.js` - número do WhatsApp (`WHATSAPP_NUMERO`), menu mobile, links do WhatsApp, envio do
  formulário (monta a mensagem e abre `wa.me`), animação `.reveal` com IntersectionObserver.
- `js/catalogo-portas.js` / `js/catalogo-rodapes.js` - SÓ DADOS (medidas, cores, estilos).
  Mudar produto/fornecedor = editar aqui, sem mexer na lógica.
- `js/porta-wizard.js` / `js/rodape-wizard.js` - configuradores passo a passo dentro do form de
  orçamento. Aparecem conforme o "Serviço desejado" escolhido. Expõem `window.PortaWizard` e
  `window.RodapeWizard` (`linhasResumo()`, `temPortas()/temRodapes()`, `reset()`), lidos pelo main.js.
- `img/` - logos, og-refinatto.jpg (preview do link no WhatsApp/redes, 1200x630) e SVGs esquemáticos das folhas de porta e estilos de rodapé.

## Pontos de atenção

- Os scripts são clássicos (não módulos) e compartilham o escopo global. Por isso o wizard de
  rodapé usa sufixo `R` em tudo (`ETAPAS_R`, `CATALOGO_R`, `avancarR`...) para não colidir com o de
  portas. Qualquer `const`/`function` nova no nível do arquivo precisa de nome único entre arquivos.
- Ordem dos `<script>` no index.html importa: catálogo antes do wizard, `main.js` por último.
- Wizards: cada etapa é um objeto em `ETAPAS` (render genérico por `tipo`: lista, cards, texto,
  numero). `mostrarSe(respostas)` torna a etapa condicional. O de portas pergunta só cor, largura da
  folha (+ sob medida) e quantidade; porta é sempre fornecimento + instalação.
- Nome do fornecedor e códigos de cor (Branco UV...) NUNCA aparecem em texto visível do site; só vão
  na mensagem do WhatsApp quando `incluirCodigoFornecedor` é true.
- Limite de ~3500 caracteres no link do WhatsApp (`LIMITE_CARACTERES_SEGURO`); acima disso pede
  confirmação. Limites de 5 portas e 5 rodapés por orçamento.
- Comentários e textos do site em português, tom informal em primeira pessoa (o Maicon falando).
- `og:url` ainda não definido nas meta tags; o comentário cita um `HOSPEDAGEM.md` que não veio no
  download da Netlify.

## Gerador de orçamentos (`/gerador/`)

Área restrita, de uso interno do Maicon (principalmente no celular), que monta orçamentos de portas
e rodapés com base na tabela de custos + um percentual, e gera o PDF do
cliente. Não há link para ela no site público.

- `gerador/` - app (ES modules): `app.js` (interface), `calculo.js` (regras e cálculo, funções
  puras), `pdf.js` (PDF com jsPDF em `gerador/vendor/`, sem CDN), `gerador.css`.
- `netlify/functions/` - `login` (POST /api/login, limite de 5 tentativas/min por IP), `tabela`
  (GET /api/tabela, só com sessão), `logout`. `netlify/lib/` tem cripto (AES-256-GCM, scrypt),
  sessão (token HMAC em cookie `__Host-gerador` HttpOnly/Secure/SameSite=Strict, 12 h) e respostas.
- A tabela de custos é CONFIDENCIAL e o repositório é público: o texto puro fica em
  `privado/tabela-precos.json` (gitignored) e só a versão criptografada vai pro git
  (`netlify/lib/tabela.enc.mjs`). Nomes de produto/regras só existem dentro da tabela; nenhum valor
  de custo pode aparecer em código, teste ou commit.
- PDF do cliente (layout de documento comercial: empresa, cliente, tabela de itens, totais,
  condições, pagamento, assinaturas). Valor por item ("Mostrar valor de cada item": preço
  unitário, qtd. e total) vem ligado por padrão; desligado, só os totais por serviço. Nunca mostra custo, percentual, acréscimos
  internos nem fornecedor. Dados da empresa (CNPJ, endereço, pagamento padrão) ficam em `empresa`
  dentro da tabela criptografada. Numeração 0049-26 sugerida por aparelho (localStorage), editável. Instalação está embutida no
  percentual. "Modo cliente" esconde da tela tudo com classe `.g-interno`.
- Regras de preço (acréscimos por altura, abertura, linha e porta fora do padrão) ficam DENTRO da
  tabela criptografada (`regras` e campos de cada item); `calculo.js` só as aplica. Não descrever
  as regras nem os valores neste arquivo, que é público.

### Configuração (segredos)

Variáveis de ambiente na Netlify (Site configuration -> Environment variables), iguais ao `.env`
local (gitignored): `GERADOR_USUARIO`, `GERADOR_SENHA_HASH`, `SESSAO_SEGREDO`, `TABELA_CHAVE`.

- `node scripts/gerador/configurar.mjs segredos` - cria SESSAO_SEGREDO e TABELA_CHAVE no `.env`.
- `node scripts/gerador/configurar.mjs senha` - define usuário e senha (interativo; rodar no terminal).
- Atualizar preços: editar `privado/tabela-precos.json` e rodar
  `node scripts/gerador/configurar.mjs criptografar`, depois commit do `tabela.enc.mjs`.
- Em outro PC: criar o `.env` com os valores da Netlify e rodar `... descriptografar` para recriar
  `privado/tabela-precos.json`.
- Trocar `SESSAO_SEGREDO` derruba todas as sessões; trocar `TABELA_CHAVE` exige criptografar de novo.
