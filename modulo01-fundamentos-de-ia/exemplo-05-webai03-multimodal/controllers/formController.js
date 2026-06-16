export class FormController {
    constructor(aiService, translationService, whisperService, view) {
        this.aiService = aiService;
        this.translationService = translationService;
        this.whisperService = whisperService;
        this.view = view;
        this.isGenerating = false;
    }

    setupEventListeners() {
        // Update display values for range inputs
        this.view.onTemperatureChange((e) => {
            this.view.updateTemperatureDisplay(e.target.value);
        });

        this.view.onTopKChange((e) => {
            this.view.updateTopKDisplay(e.target.value);
        });

        // File input handlers
        this.view.onFileChange((event) => {
            this.view.handleFilePreview(event);
        });

        this.view.onFileButtonClick(() => {
            this.view.triggerFileInput();
        });

        // Form submit handler
        this.view.onFormSubmit(async (event) => {
            event.preventDefault();

            if (this.isGenerating) {
                this.stopGeneration();
                return;
            }

            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        const question = this.view.getQuestionText();
        const file = this.view.getFile();

        if (!question.trim()) {
            return;
        }

        // Pre-initialize translation service (must be done under active user gesture)
        try {
            await this.translationService.initialize();
        } catch (error) {
            console.error('Translation initialization failed:', error);
        }

        // Get parameters from form
        const temperature = this.view.getTemperature();
        const topK = this.view.getTopK();

        console.log('Using parameters:', { temperature, topK });

        // Change button to stop mode
        this.toggleButton(true);

        // Check if the file is audio — use Whisper for local transcription
        const isAudioFile = file && file.type.startsWith('audio/');

        if (isAudioFile) {
            await this.handleAudioTranscription(file, question);
        } else {
            await this.handleAIChat(question, temperature, topK, file);
        }

        this.toggleButton(false);
    }

    /**
     * Handle audio transcription using local Whisper model.
     */
    async handleAudioTranscription(file, question) {
        try {
            // Step 1: Initialize Whisper (downloads model on first use)
            this.view.setOutput('🔄 Carregando modelo Whisper (~500MB no primeiro uso, depois fica em cache)...');

            await this.whisperService.initialize((progress) => {
                if (progress.status === 'progress' && progress.progress) {
                    const pct = progress.progress.toFixed(0);
                    this.view.setOutput(`🔄 Baixando modelo Whisper: ${pct}% (${progress.file || ''})`);
                } else if (progress.status === 'done') {
                    this.view.setOutput('✅ Modelo carregado! Iniciando transcrição...');
                }
            });

            // Step 2: Transcribe
            this.view.setOutput(`🎙️ Transcrevendo áudio "${file.name}"... Isso pode levar alguns segundos.`);

            const transcription = await this.whisperService.transcribe(file, 'portuguese');

            if (!transcription || !transcription.trim()) {
                this.view.setOutput('⚠️ Não foi possível transcrever o áudio. Tente um arquivo diferente.');
                return;
            }

            // Step 3: Show transcription
            this.view.setOutput(`📝 Transcrição completa:\n\n${transcription}`);

            console.log('Full transcription:', transcription);

        } catch (error) {
            console.error('Error during audio transcription:', error);
            this.view.setOutput(`❌ Erro na transcrição: ${error.message}`);
        }
    }

    /**
     * Handle regular AI chat (text and optional image) via Gemini Nano.
     */
    async handleAIChat(question, temperature, topK, file) {
        this.view.setOutput('Processing your question...');

        try {
            const aiResponseChunks = await this.aiService.createSession(
                question,
                temperature,
                topK,
                file
            );

            this.view.setOutput('');

            let fullResponse = '';
            for await (const chunk of aiResponseChunks) {
                if (this.aiService.isAborted()) {
                    break;
                }
                console.log('Received chunk:', chunk);
                fullResponse += chunk;
                this.view.setOutput(fullResponse);
            }

            // Translate the full response to Portuguese
            if (fullResponse && !this.aiService.isAborted()) {
                this.view.setOutput('Traduzindo resposta...');
                const translatedResponse = await this.translationService.translateToPortuguese(fullResponse);
                this.view.setOutput(translatedResponse);
            }
        } catch (error) {
            console.error('Error during AI generation:', error);
            this.view.setOutput(`Erro: ${error.message}`);
        }
    }

    stopGeneration() {
        this.aiService.abort();
        this.toggleButton(false);
    }

    toggleButton(isGenerating) {
        this.isGenerating = isGenerating;

        if (isGenerating) {
            this.view.setButtonToStopMode();
        } else {
            this.view.setButtonToSendMode();
        }
    }
}
