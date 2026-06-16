import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.6.0';

export class WhisperService {
    constructor() {
        this.transcriber = null;
        this.initPromise = null;
    }

    /**
     * Initialize the Whisper model (downloads ~75MB on first use, cached after).
     * @param {Function} onProgress - callback(progress) called during model download
     */
    async initialize(onProgress = null) {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            if (this.transcriber) return;

            console.log('Loading Whisper model...');
            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                'onnx-community/whisper-small',
                {
                    dtype: 'q4',
                    device: 'wasm',
                    progress_callback: (progress) => {
                        console.log('Whisper download progress:', progress);
                        if (onProgress) onProgress(progress);
                    },
                }
            );
            console.log('Whisper model loaded successfully');
        })();

        return this.initPromise;
    }

    /**
     * Decode an audio File/Blob to Float32Array at 16kHz mono.
     */
    async decodeAudioFile(file) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000,
        });
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();

        // Return mono channel (left)
        return audioBuffer.getChannelData(0);
    }

    /**
     * Transcribe an audio file locally using Whisper.
     * @param {File} file - the audio file to transcribe
     * @param {string} language - language code (e.g. 'portuguese', 'english')
     * @returns {Promise<string>} the transcribed text
     */
    async transcribe(file, language = 'portuguese') {
        if (!this.transcriber) {
            throw new Error('Whisper model not initialized. Call initialize() first.');
        }

        console.log(`Transcribing audio: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

        const audioData = await this.decodeAudioFile(file);
        console.log(`Audio decoded: ${audioData.length} samples (${(audioData.length / 16000).toFixed(1)}s at 16kHz)`);

        const result = await this.transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: language,
            task: 'transcribe',
            return_timestamps: false,
        });

        console.log('Transcription result:', result);
        return result.text;
    }
}
