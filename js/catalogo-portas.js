// Catálogo de portas usado pelo configurador de orçamento (js/porta-wizard.js).
//
// Este arquivo contém SÓ DADOS - nenhuma lógica de wizard aqui. A ideia é que trocar de
// fornecedor, ou ajustar linhas/medidas, seja editar esta lista, sem tocar no restante do código.
//
// Os códigos de modelo (campo "codigo") NÃO aparecem em nenhum texto visível do site - eles só
// entram na mensagem do WhatsApp se "incluirCodigoFornecedor" estiver true, como referência
// interna para o orçamentista comprar o item certo.
//
// Os SVGs em img/folha-0X.svg são desenhos esquemáticos próprios que reproduzem o traço de cada
// modelo - trocar por fotos reais quando houver esse material.
//
// Núcleo da folha: o catálogo lista 3 tipos (MDP sólido com redução acústica de 20dB, Colmeia semi-
// sólida, MDF Hidrófugo com proteção extra à umidade) como especificação técnica de material, não
// como escolha do cliente no orçamento - por isso não vira uma etapa do wizard.

window.CATALOGO_PORTAS = {
  // true  = a mensagem do WhatsApp inclui o código do fornecedor entre parênteses, ex: "Lisa (PSS01)"
  // false = a mensagem mostra só o rótulo em português, ex: "Lisa"
  incluirCodigoFornecedor: true,

  linhas: [
    {
      id: "giro",
      rotulo: "De abrir (giro)",
      ajuda: "A porta tradicional, com dobradiças. A mais usada em quartos e salas.",
      alturas: [210],
      largurasFolha: [60, 62, 70, 72, 80, 82, 90, 92, 100, 110],
      largurasMarco: [7, 10, 13, 16, 19, 22],
      perguntaLado: true,
      perguntaFechadura: false,
      ferragens: "Fechadura e dobradiças já vêm instaladas de fábrica",
    },
    {
      id: "correr",
      rotulo: "De correr",
      ajuda: "Desliza sobre um trilho junto à parede. Ideal onde não sobra espaço para abrir a porta.",
      alturas: [206],
      largurasFolha: [60, 62, 70, 72, 80, 82, 90, 92, 100, 102, 110],
      largurasMarco: [7, 10, 13, 16],
      perguntaLado: false,
      perguntaFechadura: false,
      ferragens: "Trilhos, roldanas, guias, fechadura e batedores já vêm instalados de fábrica",
    },
    {
      id: "premium",
      rotulo: "Linha premium",
      ajuda: "Acabamento superior e melhor isolamento acústico. Altura sob medida, até 240 cm.",
      alturas: { min: 210, max: 240 },
      largurasFolha: [60, 62, 70, 72, 80, 82, 90, 92, 100, 110],
      largurasMarco: [7, 10, 13, 16, 19, 22],
      perguntaLado: true,
      perguntaFechadura: false,
      ferragens: "Fechadura e dobradiças já vêm instaladas de fábrica",
    },
    {
      id: "pivotante",
      rotulo: "Pivotante",
      ajuda: "Gira sobre pivôs no piso e no teto, sem dobradiças. Usada em entradas de destaque.",
      alturas: { min: 210, max: 240 },
      largurasFolha: [60, 62, 70, 72, 80, 82, 90, 92, 100, 110],
      largurasMarco: [13, 16],
      perguntaLado: true,
      perguntaFechadura: false,
      ferragens: "Pivô superior e inferior instalados, com fechadura decorativa",
    },
    {
      id: "flex",
      rotulo: "Flex",
      ajuda: "Kit pronto em que o lado de abertura é definido na hora da instalação.",
      alturas: [210],
      largurasFolha: [60, 70, 80, 90, 100, 110],
      largurasMarco: [7, 10, 13, 16],
      perguntaLado: false,
      perguntaFechadura: true,
    },
  ],

  modelosFolha: [
    { id: "m01", rotulo: "Lisa", codigo: "PSS01", svg: "img/folha-01.svg" },
    { id: "m02", rotulo: "Frisada", codigo: "PSS02", svg: "img/folha-02.svg" },
    { id: "m03n", rotulo: "Moderna", codigo: "PSS03", svg: "img/folha-05.svg" },
    { id: "m03", rotulo: "Decorativa", codigo: "PSS15", svg: "img/folha-03.svg" },
    { id: "m04", rotulo: "Almofadada", codigo: "PSS50", svg: "img/folha-04.svg" },
    { id: "m07", rotulo: "Clássica", codigo: "PSS07", svg: "img/folha-06.svg" },
  ],

  cores: [
    { id: "branco", rotulo: "Branco", codigo: "Branco UV", amostra: "#f2f2f0" },
    { id: "amadeirado", rotulo: "Amadeirado", codigo: "Curupixá UV", amostra: "#a9713f" },
  ],

  alizares: ["5×1,0 cm", "7×1,0 cm", "10×1,0 cm", "5×1,5 cm", "7×1,5 cm", "10×1,5 cm"],

  fechadurasFlex: [
    "Interna com chave (quarto)",
    "Banheiro (livre/ocupado, sem chave)",
    "Externa reforçada (chave tetra)",
    "Trinco rolete (passagem, sem chave)",
  ],

  ambientes: [
    "Quarto",
    "Sala / corredor",
    "Banheiro",
    "Cozinha / área de serviço",
    "Entrada principal",
    "Closet / armário",
    "Outro",
  ],
};
