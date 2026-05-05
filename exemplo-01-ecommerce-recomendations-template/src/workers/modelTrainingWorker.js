import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;

function createTrainingData(context) {
    const inputs = [];
    const labels = [];
    context.users.forEach(user => {
        if (!user.purchases || user.purchases.length === 0) return;
        const userVector = user.vector;

        context.products.forEach(product => {
            const productVector = product.vector;
            // Did user buy this product?
            const bought = user.purchases.some(p => p.product_name === product.name || p.name === product.name);
            const label = bought ? 1 : 0;

            inputs.push([...userVector, ...productVector]);
            labels.push(label);
        });
    });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimension: context.userVectorDim + context.productVectorDim
    };
}

async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({ inputShape: [trainData.inputDimension], units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    // Como os dados podem ser grandes, limitamos epochs para não travar a tab
    await model.fit(trainData.xs, trainData.ys, {
        epochs: 50,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    });

    return model;
}

async function trainModel(trainingData) {
    console.log('Training model with pre-normalized data:', trainingData);
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });

    _globalCtx = trainingData;
    _globalCtx.usersMap = Object.fromEntries(trainingData.users.map(u => [u.id, u]));

    const trainData = createTrainingData(_globalCtx);
    _model = await configureNeuralNetAndTrain(trainData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}

function recommend({ user }) {
    if (!_model) return;
    const context = _globalCtx;
    
    const userWithVector = context.usersMap[user.id];
    if (!userWithVector) {
        console.error('User not found in context for recommendations');
        return;
    }
    const userVector = userWithVector.vector;

    const inputs = context.products.map(product => {
        return [...userVector, ...product.vector];
    });

    const inputTensor = tf.tensor2d(inputs);
    const predictions = _model.predict(inputTensor);
    const scores = predictions.dataSync();

    const recommendations = context.products.map((item, index) => {
        return {
            name: item.name,
            category: item.category,
            price: item.price,
            score: scores[index]
        };
    });

    const sortedItems = recommendations.sort((a, b) => b.score - a.score);

    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });
}

const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
