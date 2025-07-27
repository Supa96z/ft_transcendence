import {getCurrentLang, t} from "../lang/i18n.js";

/**
 * @brief Classe gérant la fonctionnalité de lecture d'écran.
 */
export class screenReader {
	private static instance: screenReader;
	private enabled: boolean = false;
	private speechSynthesis: SpeechSynthesis;
	private voice: SpeechSynthesisVoice | null = null;
	private volume: number = 1.0;
	private rate: number = 1.0;
	private pitch: number = 1.0;
	private queue: string[] = [];
	private speaking: boolean = false;
	private readonly browserType: string = '';
	private readonly isFirefox: boolean = false;
	private sounds: Map<string, HTMLAudioElement> = new Map();

	private listenersInitialized: boolean = false;

	private lastButtonAnnouncement: number = 0;
	private readonly BUTTON_ANNOUNCEMENT_DELAY = 1500;

	private currentSpeakTimeoutId: number | null = null;
	private currentUtterance: SpeechSynthesisUtterance | null = null;

	private constructor() {
		this.speechSynthesis = window.speechSynthesis;
		this.browserType = this.detectBrowser();
		this.isFirefox = this.browserType === 'firefox';

		if (this.isFirefox)
			this.setupFirefoxOptimizations();

		// Cherche une voix française.
		this.loadVoices();
		// Écoute l'événement voiceschanged pour les navigateurs qui chargent les voix de manière asynchrone.
		this.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices());

		// Écoute les changements de langue pour mettre à jour la voix.
		document.addEventListener('languageChanged', () => {
			this.loadVoices();
		});

		// Charge l'état depuis le localStorage si disponible.
		const savedState = localStorage.getItem('screenReaderEnabled');
		if (savedState)
			this.enabled = savedState === 'true';

		this.loadSound('paddleGauche', '../static/beep_paddle_gauche.mp3');
		this.loadSound('paddleDroit', '../static/beep_paddle_droit.mp3');
		this.loadSound('paddleHaut', '../static/beep_paddle_haut.mp3');
		this.loadSound('paddleBas', '../static/beep_paddle_bas.mp3');
		this.loadSound('wall', '../static/wall.mp3');
		this.loadSound('bonus', '../static/bonus.mp3');
		this.loadSound('scoreP1', '../static/scoreP1.mp3');
		this.loadSound('scoreP2', '../static/scoreP2.mp3');
		this.loadSound('scoreP3', '../static/scoreP3.mp3');
		this.loadSound('scoreP4', '../static/scoreP4.mp3');

		this.initializeGlobalListeners();
	}

	/**
	 * @brief Annule les annonces en cours et dans la queue.
	 */
	public cancelSpeech(): void {
		console.log(`🗣️ [cancelSpeech] Annulation de la lecture en cours et effacement de la file.`);
		this.speechSynthesis.cancel();
		this.queue = [];
		this.speaking = false;
		this.clearSpeakTimeout();
	}

	/**
	 * @brief Détecte le navigateur utilise.
	 */
	private detectBrowser(): string {
		const userAgent = navigator.userAgent.toLowerCase();

		if (userAgent.includes('firefox')) return 'firefox';
		if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';

		return 'unknown';
	}

	/**
	 * @brief Configuration pour Firefox.
	 */
	private setupFirefoxOptimizations(): void {

		setTimeout(() => {
			this.loadVoices();
		}, 1000);

		setInterval(() => {
			if (this.speechSynthesis.getVoices().length === 0)
				this.loadVoices();
		}, 30000);
	}
	/**
	 * @brief  Charge les voix disponible.
	 */
	private loadVoices(): void {
		if (this.isFirefox)
			this.speechSynthesis.cancel();

		const voices = this.speechSynthesis.getVoices();
		const currentLang = getCurrentLang();

		// Map les langues aux codes de lange pour les voix.
		const langMap: Record<string, string[]> = {
			'fr': ['fr-FR', 'fr-CA', 'fr'],
			'en': ['en-US', 'en-GB', 'en-AU', 'en'],
			'es': ['es-ES', 'es-MX', 'es-AR', 'es']
		};

		const targetLangCodes = langMap[currentLang] || ['en'];

		let selectedVoice = this.findBestVoiceForBrowser(voices, currentLang, targetLangCodes);
		if (!selectedVoice && voices.length > 0)
			selectedVoice = voices[0];

		this.voice = selectedVoice;

		this.adjustParametersForBrowserAndVoice(currentLang, this.voice);
	}

	/**
	 * @brief Trouve la meilleure voix selon le navigateur.
	 * @param voices voix.
	 * @param lang langue.
	 * @param langCodes code de langue.
	 */
	private findBestVoiceForBrowser(voices: SpeechSynthesisVoice[], lang: string, langCodes: string[]): SpeechSynthesisVoice {
		if (this.isFirefox)
			return this.findBestFirefoxVoice(voices, lang, langCodes);
		else
			return this.findBestChromeVoice(voices, lang, langCodes);
	}

	private findBestFirefoxVoice(voices: SpeechSynthesisVoice[], lang: string, langCodes: string[]): SpeechSynthesisVoice{

		const firefoxPreferred: Record<string, string[]> = {
			'fr': [
				'Microsoft Hortense', // Windows
				'Amélie', 'Virginie', 'Thomas', // macOS
				'French', 'Français', // Générique
				'eSpeak French' // Linux backup
			],
			'en': [
				'Microsoft Zira', 'Microsoft David', // Windows
				'Alex', 'Samantha', 'Victoria', // macOS
				'English', 'US English', 'UK English' // Générique
			],
			'es': [
				'Microsoft Helena', 'Microsoft Sabina', // Windows
				'Monica', 'Paulina', // macOS
				'Spanish', 'Español' // Générique
			]
		};

		const preferred = firefoxPreferred[lang] || [];

		// 1. Cherche dans les voix préférées Firefox
		for (const prefName of preferred) {
			const voice = voices.find(v =>
				v.name.toLowerCase().includes(prefName.toLowerCase()) &&
				langCodes.some(code => v.lang.toLowerCase().includes(code.toLowerCase()))
			);
			if (voice)
				return voice;
		}

		// 2. Priorise les voix locales (meilleures en général)
		for (const langCode of langCodes) {
			const localVoice = voices.find(voice =>
				voice.lang === langCode && voice.localService
			);
			if (localVoice)
				return localVoice;
		}

		// 3. Correspondance exacte
		for (const langCode of langCodes) {
			const exactMatch = voices.find(voice => voice.lang === langCode);
			if (exactMatch) return exactMatch;
		}

		// 4. Correspondance partielle
		for (const langCode of langCodes) {
			const partialMatch = voices.find(voice =>
				voice.lang.startsWith(langCode.split('-')[0])
			);
			if (partialMatch) return partialMatch;
		}

		return voices[0];
	}

	/**
	 * @brief Optimisation pour Chrome/autres navigateurs.
	 * @param voices voix.
	 * @param lang langue.
	 * @param langCodes code de langue.
	 */
	private findBestChromeVoice(voices: SpeechSynthesisVoice[], lang: string, langCodes: string[]): SpeechSynthesisVoice {
		// Chrome préfère les voix Google en ligne.
		const chromePreferred: Record<string, string[]> = {
			'fr': ['Google français', 'Microsoft Hortense', 'Amélie'],
			'en': ['Google US English', 'Google UK English Female', 'Microsoft Zira'],
			'es': ['Google español', 'Microsoft Helena', 'Monica']
		};

		const preferred = chromePreferred[lang] || [];

		for (const prefName of preferred) {
			const voice = voices.find(v =>
				v.name.toLowerCase().includes(prefName.toLowerCase())
			);
			if (voice)
				return voice;
		}

		// Fallback standard.
		for (const langCode of langCodes) {
			const exactMatch = voices.find(voice => voice.lang === langCode);
			if (exactMatch) return exactMatch;
		}

		return voices[0];
	}

	/**
	 * @brief Ajuste les paramètres en fonction du navigateur et de la voix.
	 * @param lang langue.
	 * @param voice voix.
	 */
	private adjustParametersForBrowserAndVoice(lang: string, voice: SpeechSynthesisVoice | null): void {
		const baseRate = 1.0;
		const basePitch = 1.0;

		switch (lang) {
			case 'fr':
				this.rate = baseRate * 0.9;
				break;

			case 'es':
				this.rate = baseRate * 0.95;
				break;

			default:
				this.rate = baseRate;
				break;
		}

		if (!voice)
			return ;

		const voiceName = voice.name.toLowerCase();

		// Ajustement spécifiques a Firefox.
		if (this.isFirefox) {
			// firefox avec eSpeak (Linux) - pas ouf.
			if (voiceName.includes('espeak') || voiceName.includes('festival')) {
				this.rate *= 0.7;
				this.pitch = basePitch * 1.2;
				this.volume = Math.min(1.0, this.volume * 1.1);
			}

			// Firefox avec voix Microsoft (Windows).
			else if (voiceName.includes('microsoft'))
				this.rate *= 0.95;

			// Autres voix Firefox.
			else
				this.rate *= 0.85;
		}

		// Ajustements Chrome/autres.
		else {
			if (voiceName.includes('google'))
				this.pitch = basePitch * 0.95;
		}

		// Limites de securite.
		this.rate = Math.max(0.1, Math.min(10, this.rate));
		this.pitch = Math.max(0, Math.min(2, this.pitch));
	}

	/**
	 * @brief Active ou désactive le screen reader.
	 * @param enabled actif ou non.
	 */
	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		localStorage.setItem('screenReaderEnabled', enabled.toString());

		if (enabled) {
			// Utilise une cle de traduction si disponible.
			const message = this.getLocalizedMessage('screenReaderEnabled', "Lecteur d'écran activé");
			this.speak(message);
		} else {
			const message = this.getLocalizedMessage('screenReaderDisabled', "Lecteur d'écran désactivé");
			this.speak(message);
			this.cancelSpeech();
		}
	}

	/**
	 * @brief Obtient un message localise ou utilise un fallback.
	 * @param key phrase à traduire.
	 * @param fallback si fonctionne pas.
	 * @param vars a mettre dans la phrase.
	 * @private
	 */
	private getLocalizedMessage(key: string, fallback: string, vars?: Record<string, string | number | null>): string {

		try {
			// Essaie d'abord d'obtenir la traduction sans variables.
			const rawTranslation = t(key);

			// Si on a une traduction valide (différente de la cle.)
			if (rawTranslation && rawTranslation !== key) {
				// Applique manuellement les variables.
				if (vars) {
					let text = rawTranslation;
					for (const [k, v] of Object.entries(vars))
						text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
					return text;
				}
				return rawTranslation;
			}

			// Sinon utilise le fallback.
			console.log('⚠️ No translation found, using fallback');
			if (vars && fallback) {
				let text = fallback;
				for (const [k, v] of Object.entries(vars))
					text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
				return text;
			}
			return fallback;

		} catch (error) {
			console.error('❌ Error in getLocalizedMessage:', error);
			// En cas d'erreur, utilise le fallback avec substitution.
			if (vars && fallback) {
				let text = fallback;
				for (const [k, v] of Object.entries(vars)) {
					text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
				}
				console.log('🔧 Error fallback with substitution:', text);
				return text;
			}
			return fallback;
		}
	}

	/**
	 * @brief Vérifie si le screen reader est actif.
	 */
	public isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * @brief Lit le texte.
	 * @param text texte à lire.
	 * @param priority priorité du texte.
	 */
	public speak(text: string, priority: boolean = false): void {
		console.log(`🗣️ [speak] Demande: "${text.substring(0, 30)}...", Priority: ${priority}, Enabled: ${this.enabled}`);

		if (!this.enabled) {
			return;
		}

		// Si priorité, annule l'annonce en cours et nettoie la queue.
		if (priority) {
			const now = Date.now();
			const timeSinceLastButton = now - this.lastButtonAnnouncement;

			if (timeSinceLastButton < this.BUTTON_ANNOUNCEMENT_DELAY) {
				console.log(`🗣️ [speak] Annonce de bouton récente, délai avant interruption pour message prioritaire.`);
				setTimeout(() => {
					this.speak(text, true);
				}, this.BUTTON_ANNOUNCEMENT_DELAY - timeSinceLastButton);
				return;
			}

			console.log(`🗣️ [speak] Message prioritaire - Annulation en cours.`);
			this.speechSynthesis.cancel();
			this.queue = [];
			this.speaking = false;
			this.clearSpeakTimeout();
		}

		// Ajoute à la queue.
		this.queue.push(text);
		console.log(`🗣️ [speak] Ajouté à la queue. Taille: ${this.queue.length}`);

		// Si aucune annonce en cours, démarre la queue.
		if (!this.speaking) {
			console.log(`🗣️ [speak] Pas de lecture en cours, démarrage de processQueue.`);
			this.processQueue();
		} else
			console.log(`🗣️ [speak] Lecture en cours, ajout à la queue.`);
	}

	/**
	 * @brief Traite la file d'attente.
	 */
	private processQueue(): void {
		console.log(`📋 [processQueue] Queue: ${this.queue.length}, Speaking: ${this.speaking}`);

		if (this.queue.length === 0) {
			this.speaking = false; // No more items to speak
			console.log(`📋 [processQueue] File d'attente vide, speaking = false.`);
			return;
		}

		const text = this.queue.shift() || "";
		if (!text) {
			this.processQueue();
			return;
		}

		// Divide long texts into chunks
		if (text.length > 100) {
			console.log(`📋 [processQueue] Texte long détecté (${text.length} chars), division.`);
			const chunks = this.splitTextSafely(text);
			this.queue.unshift(...chunks.slice(1));
			this.speakChunk(chunks[0]);
		} else
			this.speakChunk(text);
	}

	private splitTextSafely(text: string): string[] {
		const maxLength = 80; // Très court pour éviter les problèmes
		const chunks: string[] = [];

		// Divise par phrases
		const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

		let currentChunk = '';

		for (const sentence of sentences) {
			const trimmed = sentence.trim();

			if (currentChunk.length + trimmed.length > maxLength && currentChunk.length > 0) {
				chunks.push(currentChunk.trim() + '.');
				currentChunk = trimmed;
			} else {
				currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmed;
			}
		}

		if (currentChunk.trim().length > 0) {
			chunks.push(currentChunk.trim() + (currentChunk.endsWith('.') ? '' : '.'));
		}

		// Si pas de division possible, force la division par mots
		if (chunks.length === 1 && chunks[0].length > maxLength) {
			const words = chunks[0].split(' ');
			chunks.length = 0;
			currentChunk = '';

			for (const word of words) {
				if (currentChunk.length + word.length > maxLength && currentChunk.length > 0) {
					chunks.push(currentChunk.trim());
					currentChunk = word;
				} else
					currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
			}

			if (currentChunk.trim().length > 0) {
				chunks.push(currentChunk.trim());
			}
		}

		console.log(`✂️ Texte divisé en ${chunks.length} chunks:`, chunks.map(c => `"${c.substring(0, 30)}..."`));
		return chunks.length > 0 ? chunks : [text];
	}

	/**
	 * @brief Prononce un chunk de texte.
	 * @param text texte a prononcer.
	 */
	private speakChunk(text: string): void {
		if (!this.enabled) {
			this.clearSpeakTimeout();
			return;
		}

		if (!text) {
			console.warn(`⚠️ [speakChunk] Tentative de parler un texte vide.`);
			this.processQueue();
			return;
		}

		this.clearSpeakTimeout();

		const utterance = new SpeechSynthesisUtterance(text);
		this.currentUtterance = utterance;

		utterance.volume = this.volume;
		utterance.rate = this.rate;
		utterance.pitch = this.pitch;

		if (this.voice) {
			utterance.voice = this.voice;
		}

		const timeoutDuration = 15000;

		// Set le timeout avant d'appeler speak.
		this.currentSpeakTimeoutId = window.setTimeout(() => {
			console.error(`❌ [speakChunk] TIMEOUT après ${timeoutDuration}ms pour: "${text.substring(0, 50)}..."`);
			console.warn(`❌ [speakChunk] État au timeout - speaking: ${this.speaking}, pending: ${this.speechSynthesis.pending}`);

			// Important : si timeout arrive, assume que le speech a foiré, annule, et passe au texte d'après.
			this.speechSynthesis.cancel();
			this.speaking = false;
			this.clearSpeakTimeout();
			this.processQueue();
		}, timeoutDuration);

		utterance.onstart = () => {
			console.log(`✅ [speakChunk] ONSTART: "${text.substring(0, 50)}..."`);
			this.speaking = true; // Met speaking à TRUE seulement si ca parle.
			this.clearSpeakTimeout(); // Enlève timeout seulement quand le texte commence.
		};

		utterance.onend = () => {
			console.log(`✅ [speakChunk] ONEND: "${text.substring(0, 50)}..."`);
			this.speaking = false;
			this.clearSpeakTimeout();
			this.processQueue();
		};

		utterance.onerror = (event) => {
			console.error(`❌ [speakChunk] ONERROR: ${event.error} pour "${text.substring(0, 50)}..."`);
			this.clearSpeakTimeout();

			if (event.error === 'interrupted') {
				console.log(`🔄 [speakChunk] Reprise après erreur`);
				this.speaking = false;
				this.processQueue();
			} else {
				console.error(`🔴 [speakChunk] Erreur non gérée: ${event.error}`);
				this.speaking = false;
				this.processQueue();
			}
		};

		utterance.onpause = () => {
			console.log(`⏸️ [speakChunk] ONPAUSE: "${text.substring(0, 50)}..."`);
		};

		utterance.onresume = () => {
			console.log(`▶️ [speakChunk] ONRESUME: "${text.substring(0, 50)}..."`);
		};

		try {
			console.log(`🎤 [speakChunk] Appel à speechSynthesis.speak()`);
			this.speechSynthesis.speak(utterance);
		} catch (error) {
			console.error(`❌ [speakChunk] Exception lors du lancement:`, error);
			this.clearSpeakTimeout();
			this.speaking = false;
			setTimeout(() => this.processQueue(), 500);
		}
	}

	private clearSpeakTimeout(): void {
		if (this.currentSpeakTimeoutId !== null) {
			clearTimeout(this.currentSpeakTimeoutId);
			this.currentSpeakTimeoutId = null;
		}
	}

	/**
	 * @brief Récupère l'instance de screenReader.
	 */
	public static getInstance(): screenReader {
		if (!screenReader.instance)
			screenReader.instance = new screenReader();
		return screenReader.instance;
	}

	/**
	 * @brief Annonce le score.
	 * @param player1Score score du j1.
	 * @param player2Score score du j2.
	 * @param player3Score score du j3.
	 * @param player4Score score du j4.
	 */
	public announceScore(player1Score: number, player2Score: number, player3Score: number | null, player4Score: number | null): void {
		if (!this.enabled)
			return ;

		const player1Name = localStorage.getItem('player1Alias') || this.getLocalizedMessage('player1Default', 'Joueur 1');
		const player2Name = localStorage.getItem('player2Alias') || this.getLocalizedMessage('player2Default', 'Joueur 2');

		if (!player3Score) {
			const scoreMessage = this.getLocalizedMessage('scoreAnnouncement', 'Score: {{player1}} {{score1}}, {{player2}} {{score2}}', {
				player1: player1Name,
				score1: player1Score,
				player2: player2Name,
				score2: player2Score
			});
			this.speak(scoreMessage);
		}

		if (player3Score) {
			const player3Name = localStorage.getItem('player3Alias') || this.getLocalizedMessage('player3Default', 'Joueur 3');
			const player4Name = localStorage.getItem('player4Alias') || this.getLocalizedMessage('player4Default', 'Joueur 4');

			const scoreMessage = this.getLocalizedMessage('scoreAnnouncement4Players', 'Score: {{player1}} {{score1}}, {{player2}} {{score2}}, {{player3}} {{score3}}, {{player4}} {{score4}}', {
				player1: player1Name,
				score1: player1Score,
				player2: player2Name,
				score2: player2Score,
				player3: player3Name,
				score3: player3Score,
				player4: player4Name,
				score4: player4Score
			});
			this.speak(scoreMessage);
		}
	}

	/**
	 * @brief Annonce un événement du jeu.
	 * @param event event à annoncer.
	 */
	public announceGameEvent(event: string): void {
		if (!this.enabled)
			return ;
		this.cancelSpeech();
		this.speak(event);
	}

	/**
	 * @brief Annonce un changement de page.
	 * @param pageName nom de la page.
	 */
	public announcePageChange(pageName: string): void {
		if (!this.enabled)
			return ;

		this.cancelSpeech();

		const message = this.getLocalizedMessage('pageLoaded', 'Page {{pageName}} chargée', { pageName });
		this.speak(message, true);
	}

	/**
	 * @brief Annonce l'élément focus.
	 * @param element element focus.
	 */
	public announceFocusedElement(element: HTMLElement): void {
		if (!this.enabled)
			return;

		let announcement = '';

		// Priorité à aria-label, puis title, ensuite textContent, ensuite alt
		const text = element.getAttribute('aria-label') ||
			element.getAttribute('title') ||
			element.textContent?.trim() ||
			element.getAttribute('alt') || '';

		const role = element.getAttribute('role') || element.tagName.toLowerCase();

		if (role === 'button' || element.tagName.toLowerCase() === 'button') {
			const buttonText = this.getLocalizedMessage('buttonFocused', 'Bouton {{text}}', { text });
			announcement = buttonText;
		} else if (element.tagName.toLowerCase() === 'img') {
			const imageText = this.getLocalizedMessage('imageFocused', 'Image {{text}}', { text });
			announcement = imageText;
		} else {
			announcement = text || this.getLocalizedMessage('elementFocused', 'Élément sélectionné');
		}

		if (announcement) {
			this.speak(announcement, true);
		}
	}

	/**
	 * @brief Initialise les event listeners globaux.
	 */
	public initializeGlobalListeners(): void {
		// Évite de dupliquer les listeners.
		if (this.listenersInitialized) return;
		this.listenersInitialized = true;

		// Écouteur global pour tous les elements qui reçoivent le focus.
		document.addEventListener('focusin', (event) => {
			const target = event.target as HTMLElement;
			if (target && (
				target.tagName === 'BUTTON' ||
				target.getAttribute('role') === 'button' ||
				target.tagName === 'A' ||
				target.tagName === 'INPUT' ||
				target.tagName === 'SELECT' ||
				target.tagName === 'TEXTAREA'
			)) {
				this.announceFocusedElement(target);
			}
		});
	}

	/**
	 * @brief Charge les sons.
	 * @param name du son.
	 * @param path du son.
	 */
	private loadSound(name: string, path: string): void {
		const audio = new Audio(path);
		this.sounds.set(name, audio);
	}

	/**
	 * @brief Joue le son.
	 * @param name du son.
	 */
	public playSound(name: string): void {
		if (this.enabled) {
			const sound = this.sounds.get(name);
			if (sound) {
				sound.currentTime = 0;
				sound.play();
			}
		}
	}

	// Méthodes pour les événements de jeu spécifiques.
	public handleLeftPaddleHit(): void {
		this.playSound('paddleGauche');
	}

	public handleRightPaddleHit(): void {
		this.playSound('paddleDroit');
	}

	public handleUpPaddleHit(): void {
		this.playSound('paddleHaut');
	}

	public handleDownPaddleHit(): void {
		this.playSound('paddleBas');
	}

	public handleWallHit(): void {
		this.playSound('wall');
	}

	public handleBonusHit(): void {
		this.playSound('bonus');
	}

	public handleScoreP1Hit(): void {
		this.playSound('scoreP1');
	}

	public handleScoreP2Hit(): void {
		this.playSound('scoreP2');
	}

	public handleScoreP3Hit(): void {
		this.playSound('scoreP3');
	}

	public handleScoreP4Hit(): void {
		this.playSound('scoreP4');
	}
}