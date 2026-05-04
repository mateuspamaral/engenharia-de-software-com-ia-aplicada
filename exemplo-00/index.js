import * as tf from '@tensorflow/tfjs';

async function trainModel(inputXs, inputYs) {
    const model = tf.sequential();

    //primeira camada da rede;
    //entrada de 7 neuronios -> saida de 80 neuronios
    //utilizando função de ativação relu
    model.add(tf.layers.dense({ inputShape: [7], units: 80, activation: "relu" }));

    //camada de saida
    //saida de 80 neuronios -> saida de 3 neuronios
    //utilizando função de ativação softmax
    model.add(tf.layers.dense({ units: 3, activation: "softmax" }));

    //compilamos o modelo
    //adam = algoritmo de otimização utilizado para ajustar os pesos da rede neural
    //loss = função de custo utilizada para medir o erro do modelo
    //metrics = métricas utilizadas para avaliar o desempenho do modelo
    model.compile({ optimizer: "adam", loss: "categoricalCrossentropy", metrics: ["accuracy"] });

    //treinamos o modelo
    await model.fit(inputXs, outputYs,
        {
            verbose: 0, // Não mostra o progresso do treinamento
            epochs: 100, // Número de vezes que o modelo será treinado com os dados
            shuffle: true, // Embaralha os dados a cada época
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoche ${epoch + 1}: loss = ${logs.loss}`);
                }
            }
        });

    //retornamos o modelo treinado
    return model;
}

async function predict(model, tensorPessoaNormalizado) {
    //cria um tensor de entrada
    const tensorEntrada = tf.tensor2d([tensorPessoaNormalizado]);

    //faz a previsão
    const tensorPrevisao = model.predict(tensorEntrada);
    const tensorPrevisaoArray = await tensorPrevisao.array();

    return tensorPrevisaoArray[0].map((value, index) => ({ value, index }))
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0], // Erick
    [0, 0, 1, 0, 0, 1, 0],    // Ana
    [1, 0, 0, 1, 0, 0, 1]     // Carlos
]

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
    [1, 0, 0], // premium - Erick
    [0, 1, 0], // medium - Ana
    [0, 0, 1]  // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado)
const outputYs = tf.tensor2d(tensorLabels)

// Quanto mais dados melhor! 
// O ideal seria ter milhares ou milhões de exemplos para treinar uma rede neural.
// No mundo real, usamos bases de dados com muitos dados.
const model = await trainModel(inputXs, outputYs)

const pessoa = {
    nome: "Mateus",
    idade: 28,
    cor: "verde",
    localizacao: "Curitiba"
}

// Normalizamos a entrada do modelo
// A ordem das colunas deve ser a mesma do treino: 
// [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
const tensorPessoaNormalizado = [
    0.2, // idade normalizada (39/100 = 0.39)
    1, // azul - não é azul
    0, // vermelho - não é vermelho
    0, // verde - é verde
    0, // São Paulo - não é de SP
    1, // Rio - não é do RJ
    0 // Curitiba - é de Curitiba
];

const previsao = await predict(model, tensorPessoaNormalizado);

const results = previsao
    .sort((a, b) => b.value - a.value)
    .map(p => `${labelsNomes[p.index]} (${(p.value * 100).toFixed(2)}%)`)
    .join("\n")

console.log(results);