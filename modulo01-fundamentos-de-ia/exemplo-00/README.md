# Redes Neurais com TensorFlow.js: Classificação de Perfis

Este projeto é um exemplo prático de como implementar uma rede neural simples utilizando **TensorFlow.js** em ambiente Node.js. O objetivo é classificar perfis de usuários (Premium, Medium ou Basic) com base em dados demográficos e de preferência.

## 🚀 Objetivo
Demonstrar a aplicação de conceitos fundamentais de Inteligência Artificial, como:
- Normalização de dados.
- Codificação One-Hot (One-Hot Encoding).
- Arquitetura de Redes Neurais Sequenciais.
- Funções de ativação (ReLU e Softmax).
- Otimização e treinamento de modelos.

## 🛠️ Tecnologias
- **Node.js**: Ambiente de execução.
- **TensorFlow.js (@tensorflow/tfjs)**: Biblioteca principal para ML.
- **tfjs-node**: Backend de performance para execução em CPU/GPU via Node.js.

## 🧠 Arquitetura do Modelo
O modelo utiliza uma estrutura sequencial com:
1. **Camada de Entrada**: 7 neurônios (Idade, Cores e Localização).
2. **Camada Oculta**: 80 neurônios com ativação **ReLU** para aprender padrões complexos.
3. **Camada de Saída**: 3 neurônios com ativação **Softmax**, ideal para problemas de classificação multi-classe, retornando a probabilidade de cada categoria.

## 📊 Dataset (Exemplo)
Os dados são normalizados para escala entre 0 e 1. As colunas seguem a ordem:
`[idade, azul, vermelho, verde, São Paulo, Rio, Curitiba]`

Exemplo de entrada:
- **Erick**: 30 anos, prefere azul, mora em São Paulo -> `[0.33, 1, 0, 0, 1, 0, 0]`

## ⚙️ Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o treinamento e a previsão:
   ```bash
   npm start
   ```

## 📖 Aprendizados Aplicados
Este projeto serve como base de conhecimento para entender o fluxo de "fim a fim" (end-to-end) de um modelo de ML:
1. **Preparação**: Conversão de dados brutos para Tensores.
2. **Design**: Definição da topologia da rede.
3. **Treinamento**: Ajuste de pesos via algoritmo Adam através de múltiplas épocas.
4. **Inferência**: Utilização do modelo treinado para prever novos dados.

---
*Projeto desenvolvido para fins educacionais na disciplina de Engenharia de Software com IA Aplicada.*
