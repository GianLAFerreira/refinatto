// Catálogo de rodapés usado pelo configurador de orçamento (js/rodape-wizard.js).
//
// Mesma filosofia de js/catalogo-portas.js: SÓ DADOS aqui, nenhuma lógica de wizard.
//
// 2 estilos x 3 larguras x 2 cores, sem regra cruzada entre eles (nenhuma escolha aqui limita as
// opções de outra etapa). Não há código de fornecedor pra rodapé no catálogo, por isso
// "incluirCodigoFornecedor" nem se aplica aqui.
//
// PENDENTE DE CONFIRMAÇÃO: assumimos que as 2 cores (Branco e Amadeirado) valem pros 2 estilos,
// tanto no liso quanto no com friso - confirmar antes de fechar um orçamento real com isso.

window.CATALOGO_RODAPES = {
  estilos: [
    { id: "liso", rotulo: "Sem friso (liso)", svg: "img/rodape-liso.svg" },
    { id: "friso", rotulo: "Com friso", svg: "img/rodape-friso.svg" },
  ],

  larguras: [7, 10, 15], // cm - iguais nos 2 estilos

  cores: [
    { id: "branco", rotulo: "Branco" },
    { id: "amadeirado", rotulo: "Amadeirado" },
  ],

  ambientes: [
    "Quarto",
    "Sala / corredor",
    "Cozinha / área de serviço",
    "Banheiro",
    "Casa toda",
    "Outro",
  ],
};
