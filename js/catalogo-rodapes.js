// Catálogo de rodapés usado pelo configurador de orçamento (js/rodape-wizard.js).
//
// Mesma filosofia de js/catalogo-portas.js: SÓ DADOS aqui, nenhuma lógica de wizard.
//
// 2 estilos x 3 larguras, sem regra cruzada entre eles (nenhuma escolha aqui limita as opções de
// outra etapa). Não há código de fornecedor pra rodapé no catálogo, por isso
// "incluirCodigoFornecedor" nem se aplica aqui.

window.CATALOGO_RODAPES = {
  estilos: [
    { id: "liso", rotulo: "Sem friso (liso)", svg: "img/rodape-liso.svg" },
    { id: "friso", rotulo: "Com friso", svg: "img/rodape-friso.svg" },
  ],

  larguras: [7, 10, 15], // cm - iguais nos 2 estilos
};
