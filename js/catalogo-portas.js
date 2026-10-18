// Catálogo de portas usado pelo configurador de orçamento (js/porta-wizard.js).
//
// Este arquivo contém SÓ DADOS - nenhuma lógica de wizard aqui. A ideia é que trocar de
// fornecedor, ou ajustar medidas/cores, seja editar esta lista, sem tocar no restante do código.
//
// Os códigos de cor (campo "codigo") NÃO aparecem em nenhum texto visível do site - eles só
// entram na mensagem do WhatsApp se "incluirCodigoFornecedor" estiver true, como referência
// interna para o orçamentista comprar o item certo.
//
// O orçamento de porta é sempre fornecimento + instalação, por isso não há etapa perguntando o
// escopo do serviço.

window.CATALOGO_PORTAS = {
  // true  = a mensagem do WhatsApp inclui o código do fornecedor entre parênteses, ex: "Branco (Branco UV)"
  // false = a mensagem mostra só o rótulo em português, ex: "Branco"
  incluirCodigoFornecedor: true,

  largurasFolha: [60, 62, 70, 72, 80, 82, 90, 92, 100, 110], // cm

  cores: [
    { id: "branco", rotulo: "Branco", codigo: "Branco UV", amostra: "#f2f2f0" },
    { id: "amadeirado", rotulo: "Amadeirado", codigo: "Curupixá UV", amostra: "#a9713f" },
  ],
};
