import { AIService } from './services/aiService.js';
import { TranslationService } from './services/translationService.js';
import { WhisperService } from './services/whisperService.js';
import { View } from './views/view.js';
import { FormController } from './controllers/formController.js';

(async function main() {
    // Initialize services and view
    const aiService = new AIService();
    const translationService = new TranslationService();
    const whisperService = new WhisperService();
    const view = new View();
    
    // Set current year
    view.setYear();

    // Check requirements
    const errors = await aiService.checkRequirements();
    if (errors) {
        view.showError(errors);
        return;
    }

    // Get and initialize AI parameters
    const params = await aiService.getParams();
    view.initializeParameters(params);

    // Initialize controller and setup event listeners
    const controller = new FormController(aiService, translationService, whisperService, view);
    controller.setupEventListeners();

    console.log('Application initialized successfully');
})();
