import { homePage } from './home.js'
import { startTournament } from './tournament.js';
import { Game } from './mypong.js';
import { GameBonus, Paddle2 as Paddle2Bonus } from "./mypongBonus.js";
import { GameFour, Paddle2, Paddle3, Paddle4 } from './fourpong.js';
import { GameFourBonus, Paddle2 as Paddle2FourBonus, Paddle3 as Paddle3Bonus, Paddle4 as Paddle4Bonus } from "./fourpongBonus.js";
import { loadLanguage, t } from '../lang/i18n.js';
import { attachLanguageListeners, attachHomePageListeners } from './listeners.js'
import {disableUnrelatedButtons, GameType, MatchType} from "./Utilities.js";
import {attachThemeListeners, initTheme } from './themeSwitcher.js';
import {attachTextListeners, initText} from "./textSwitcher.js";
import {screenReader} from "./screenReader.js";
import {handleRoute, navigate} from "./popstate.js";
import {isValidString} from "./sanitize.js";
import {init, init_bonus} from "./chifoumi.js";

// At the top of the file, add a global variable to store the current game instance
let currentGameInstance: any = null;

function initializeScreenReader() {
	const ScreenReader = screenReader.getInstance();

	// Initialise les listeners globaux pour la navigation au clavier
	ScreenReader.initializeGlobalListeners();

	// Récupère le bouton par son ID.
	const screenReaderButton: any = document.getElementById('screen-reader-toggle');

	if (screenReaderButton) {
		let isProcessing = false; // Flag pour éviter les clics multiples.

		// Fonction pour mettre à jour l'état du bouton
		function updateButtonState(newState: any) {
			// Change l'apparence du bouton avec couleur différente selon l'état
			screenReaderButton.className = newState ?
				'transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent bg-green-500 text-white border-2 border-green-600 active' :
				'transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent bg-gray-100 hover:bg-gray-200 border-2 border-gray-300';

			// Change le texte alternatif de l'image.
			const img = screenReaderButton.querySelector('img');
			if (img) {
				img.alt = newState ? t("disable_screen_reader") : t("enable_screen_reader");
			}

			// Met à jour l'aria-label pour refléter l'action disponible
			screenReaderButton.setAttribute('aria-label',
				newState ? t("disable_screen_reader") : t("enable_screen_reader"));

			// Met à jour l'aria pressed pour l'accessibilité
			screenReaderButton.setAttribute('aria-pressed', newState.toString());
		}

		// Listener pour l'événement focus (navigation avec TAB)
		screenReaderButton.addEventListener('focus', () => {
			if (isProcessing)
				return ;

			const currentState = ScreenReader.isEnabled();
			const actionText = currentState ? t("disable_screen_reader") : t("enable_screen_reader");

			// Annonce l'action qui sera effectuée si on appuie sur le bouton
			ScreenReader.speak(`${t("screen_reader_button")}: ${actionText}`, false);
		});

		// Listener pour le clic
		screenReaderButton.addEventListener('click', () => {
			if (isProcessing) return; // Empêche les clics multiples

			const currentState = ScreenReader.isEnabled();
			const newState = !currentState;

			isProcessing = true;
			screenReaderButton.disabled = true;

			if (newState) {
				// Activation : on peut activer immédiatement
				ScreenReader.setEnabled(true);
				updateButtonState(true);
				ScreenReader.speak(t("screen_reader_enabled"), true);

				// Réactive le bouton après un court délai
				setTimeout(() => {
					isProcessing = false;
					screenReaderButton.disabled = false;
				}, 500);

			} else {
				// Désactivation : on annonce d'abord, puis on désactive après un délai
				ScreenReader.speak(t("screen_reader_disabled"), true);
				updateButtonState(false);

				// Désactive le lecteur d'écran après que l'annonce est terminée
				setTimeout(() => {
					ScreenReader.setEnabled(false);
					isProcessing = false;
					screenReaderButton.disabled = false;
				}, 2000);
			}
		});

		// Listener pour la touche Entrée (même comportement que le clic)
		screenReaderButton.addEventListener('keydown', (event: any) => {
			if (isProcessing)
				return ;

			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				screenReaderButton.click(); // Déclenche l'événement click
			}
		});

		// Initialise l'état du bouton au chargement
		updateButtonState(ScreenReader.isEnabled());
	}

	// Annonce le chargement de la page.
	ScreenReader.announcePageChange(t("home"));
}

// A new function to handle rendering the application
function renderApp() {
	const appElement = document.getElementById('app');
	if (appElement) {
		appElement.innerHTML = homePage();

		// Attach listeners for the home page content
		attachHomePageListeners();
		attachLanguageListeners();
		attachThemeListeners();
		initTheme();
		attachTextListeners();
		initText();
		initializeScreenReader();
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	// Listen for the 'languageChanged' event to render the app
	document.addEventListener('languageChanged', renderApp);

	// Load the initial language. This will trigger the 'languageChanged'
	// event, which will then call renderApp() for the first time.
	let savedLang = localStorage.getItem('lang');
	if (savedLang !== 'en' && savedLang !== 'es') {
		savedLang = 'fr';
	}
	await loadLanguage(savedLang as 'fr' | 'en' | 'es');

	renderApp();

	handleRoute(window.location.pathname);
});

export type ButtonType = 'match' | 'tournoi'

/**
 * @brief Affiche le sélecteur du nombre de joueurs.
 * @param buttonType type de match (simple/tournoi).
 * @param matchType normal/bonus.
 */
export function showPlayerCountSelection(buttonType: ButtonType, matchType: MatchType) {
	// Récupère le contenu de la div "Pong".
	const container = document.getElementById("Pong");
	if (!container)
		return ;

	// Cache les boutons d'historiques.
	const pong_hist_btn = document.getElementById('history-pong');
	if (pong_hist_btn)
		pong_hist_btn.classList.add('hidden');

	const pfc_hist_btn = document.getElementById('pfc-hist-btn');
	if (pfc_hist_btn)
		pfc_hist_btn.classList.add('hidden');

	// Fait en sorte que le bouton retour soit au-dessus des boutons de selection du nombre de joueurs.
	container.classList.remove("grid-cols-2");
	container.classList.add("grid-cols-1");

	// Créer les boutons de selection du nombre de joueurs.
	container.innerHTML = `
		<div class="flex flex-col items-center gap-4">
			<button aria-label="${t("back")}" id="back-button" class="btn btn-fixed rounded-lg border p-4 shadow">${t("back")}</button>
			<h2 class="text-xl font-semibold">${t("how_many_players")}</h2>
		</div>
		<div class="flex justify-center gap-4 mt-4">
			<button id="2p-button" class="player-count-btn btn btn-fixed rounded-lg border p-4 shadow" data-count="2">2</button>
			<button id="4p-button" class="player-count-btn btn btn-fixed rounded-lg border p-4 shadow" data-count="4">4</button>
		</div>
	`;

	// Apply text style and listeners after rendering
	attachTextListeners();
	initText();

	// Empêche d'appuyer sur tous les autres boutons en dehors de la div de Pong.
	disableUnrelatedButtons('pong');

	const ScreenReader = screenReader.getInstance();
	ScreenReader.cancelSpeech();
	ScreenReader.announcePageChange(t("player_number_choice"));

	// Bouton retour.
	const backButton = document.getElementById("back-button");
	if (backButton) {
		backButton.addEventListener("click", () => {
			window.history.back();
		});
	}

	// Boutons de selection du nombre de joueurs.
	document.querySelectorAll(".player-count-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const target = event.target as HTMLButtonElement;
			const playerCount = parseInt(target.dataset.count || "2", 10);
			navigate('/pong/'+matchType+'/select/players/' +(playerCount === 2 ? 'two' : 'four'));
			showAliasInputs(playerCount, buttonType, matchType, 'pong');
		});
	});
}

/**
 * @brief Affiche les champs pour rentrer les alias des joueurs.
 * @param playerCount nombre de joueurs.
 * @param buttonType type de match (simple/tournoi).
 * @param gameType type de jeu (pong/pfc).
 * @param matchType normal/bonus.
 */
export function showAliasInputs(playerCount: number, buttonType: ButtonType, matchType: MatchType, gameType: GameType) {
	// Récupère le conteneur approprié en fonction du type de jeu
	const containerID = gameType === 'pong' ? "Pong" : "pfc";
	const container = document.getElementById(containerID);

	if (!container)
		return;

	// Cache les boutons d'historiques.
	const pong_hist_btn = document.getElementById('pong-hist-btn');
	if (pong_hist_btn)
		pong_hist_btn.classList.add('hidden');

	const fourpong_hist_btn = document.getElementById('fourpong-hist-btn');
	if (fourpong_hist_btn)
		fourpong_hist_btn.classList.add('hidden');

	const pfc_hist_btn = document.getElementById('pfc-hist-btn');
	if (pfc_hist_btn)
		pfc_hist_btn.classList.add('hidden');

	// Fait en sorte que le bouton retour soit au-dessus des boutons de selection du nombre de joueurs.
	container.classList.remove("grid-cols-2");
	container.classList.add("grid-cols-1");

	// Créer les champs pour rentrer les alias selon le nombre de joueurs.
	let inputsHTML = "";
	for (let i = 1; i <= playerCount; i++) {
		if ((i === 2 && gameType === 'pong' && playerCount === 2) ||
			(i >= 2 && i <= 4 && gameType === 'pong' && playerCount === 4)) {
			// Add AI toggle for player 2 in 2-player mode, and players 2,3,4 in 4-player mode
			inputsHTML += `
				<div class="mt-2 w-full">
					<div class="flex items-center w-full">
						<input aria-label="${t("player_alias_ph")} ${i}" type="text" id="playerAlias${i}" class="border p-2 rounded-l w-full" placeholder="${t("player")} ${i}">
						<button aria-label="${t("AI")}" id="aiToggleBtn${i}" style="width: 42px; min-width: 42px;" class="btn !w-[42px] h-[42px] border flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-r text-sm">AI</button>
					</div>
				</div>
			`;
		} else {
			inputsHTML += `
				<div class="mt-2 w-full">
					<input aria-label="${t("player_alias_ph")} ${i}" type="text" id="playerAlias${i}" class="border p-2 rounded w-full" placeholder="${t("player")} ${i}">
				</div>
			`;
		}
	}

	// Créer la div complete.
	container.innerHTML = `
		<div class="flex flex-col item-center gap-4">
			<button aria-label="${t("back")}" id="back-button-${gameType}" class="btn btn-fixed rounded-lg border p-4 shadow">${t("back")}</button>
			<h2 class="text-xl font-semibold">${t("players_names")}</h2>
		</div>
		<div class="flex flex-col items-center w-full mb-2">
			${inputsHTML}
		</div>
		<div class="flex justify-center">
			<button id="start-${gameType}" class="btn rounded-lg border px-4 py-2 shadow justify-center">${t("begin")}</button>
		</div>
	`;

	// Apply text style and listeners after rendering
	attachTextListeners();
	initText();

	// Empêche d'appuyer sur les autres boutons en dehors de la div appropriée.
	disableUnrelatedButtons(gameType);

	const ScreenReader = screenReader.getInstance();
	ScreenReader.cancelSpeech();
	ScreenReader.announcePageChange(t("player_alias_input"));

	// Bouton retour avec ID spécifique au type de jeu.
	const backButton = document.getElementById(`back-button-${gameType}`);
	if (backButton) {
		backButton.addEventListener("click", () => {
				window.history.back();
		});

	}

	// Set up AI toggles for all applicable players
	if (gameType === 'pong') {
		if (playerCount === 2) {
			setupAIToggle(2);
		} else if (playerCount === 4) {
			setupAIToggle(2);
			setupAIToggle(3);
			setupAIToggle(4);
		}
	}

	// Helper function to set up AI toggle for a player
	function setupAIToggle(playerNum: number) {
		const aiToggleBtn = document.getElementById(`aiToggleBtn${playerNum}`);
		const playerInput = document.getElementById(`playerAlias${playerNum}`) as HTMLInputElement;
		let isAIEnabled = false;

		if (aiToggleBtn && playerInput) {
			aiToggleBtn.onclick = () => {
				isAIEnabled = !isAIEnabled;
				aiToggleBtn.classList.toggle('bg-blue-500', isAIEnabled);
				aiToggleBtn.classList.toggle('text-white', isAIEnabled);
				aiToggleBtn.classList.toggle('bg-gray-200', !isAIEnabled);
				playerInput.disabled = isAIEnabled;
				if (isAIEnabled) {
					playerInput.value = "AI";
				} else {
					playerInput.value = "";
				}
			};
		}
	}

	// Set up start button
	const startButtonId = `start-${gameType}`;
	const startButton = document.getElementById(startButtonId);
	if (startButton) {
		if (gameType === 'pong') {
			if (buttonType === 'match') {
				if (playerCount === 2) {
					const player2Input = document.getElementById('playerAlias2') as HTMLInputElement;

					startButton.onclick = async () => {
						const alias1Elem = document.getElementById('playerAlias1') as HTMLInputElement;
						const alias1 = alias1Elem ? alias1Elem.value.trim() : '';
						const alias2 = player2Input ? player2Input.value.trim() : '';
						const isAIEnabled = player2Input?.disabled || false;

						if (!alias1 || (!isAIEnabled && !alias2)) {
							alert(t("missing_player_name"));
							return;
						}

						if (!isValidString(alias1) || !isValidString(alias2)) {
							alert(t("error_invalid_alias") + "\n" + t("error_alias_format"));
							return;
						}

						localStorage.setItem('player1Alias', alias1);
						localStorage.setItem('player2Alias', alias2);

						// Enable AI if toggled
						if (isAIEnabled) {
							if (matchType === 'normal') {
								Paddle2.setAIEnabled(true);
							} else {
								Paddle2Bonus.setAIEnabled(true);
							}
						}

						try {
							// Create players in backend
							const player1Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias1}),
							}).then(res => res.json());

							const player2Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias2}),
							}).then(res => res.json());

							if (player1Response.success && player2Response.success) {
								const matchResponse = await fetch('/api/players/match', {
									method: 'POST',
									headers: {'Content-Type': 'application/json'},
									body: JSON.stringify({
										player1Id: player1Response.id,
										player2Id: player2Response.id,
										gameType: 'pong'
									}),
								}).then(res => res.json());

								if (matchResponse.success) {
									localStorage.setItem('currentMatchId', matchResponse.matchId.toString());
									startGame(2, matchType);
								}
							}
						} catch (error) {}
					};
				} else if (playerCount === 4) {
					startButton.onclick = async () => {
						const alias1Elem = document.getElementById('playerAlias1') as HTMLInputElement;
						const alias2Elem = document.getElementById('playerAlias2') as HTMLInputElement;
						const alias3Elem = document.getElementById('playerAlias3') as HTMLInputElement;
						const alias4Elem = document.getElementById('playerAlias4') as HTMLInputElement;

						const alias1 = alias1Elem ? alias1Elem.value.trim() : '';
						const alias2 = alias2Elem ? alias2Elem.value.trim() : '';
						const alias3 = alias3Elem ? alias3Elem.value.trim() : '';
						const alias4 = alias4Elem ? alias4Elem.value.trim() : '';

						const isAI2Enabled = alias2Elem?.disabled || false;
						const isAI3Enabled = alias3Elem?.disabled || false;
						const isAI4Enabled = alias4Elem?.disabled || false;

						if (!alias1 ||
							(!isAI2Enabled && !alias2) ||
							(!isAI3Enabled && !alias3) ||
							(!isAI4Enabled && !alias4)) {
							alert('Please enter player names');
							return;
						}

						if (!isValidString(alias1) || !isValidString(alias2)|| !isValidString(alias3)|| !isValidString(alias4)) {
							alert(t("error_invalid_alias") + "\n" + t("error_alias_format"));
							return;
						}

						localStorage.setItem('player1Alias', alias1);
						localStorage.setItem('player2Alias', alias2);
						localStorage.setItem('player3Alias', alias3);
						localStorage.setItem('player4Alias', alias4);

						// Enable AI for each toggled player
						if (matchType === 'normal') {
							if (isAI2Enabled) Paddle2.setAIEnabled(true);
							if (isAI3Enabled) Paddle3.setAIEnabled(true);
							if (isAI4Enabled) Paddle4.setAIEnabled(true);
						} else {
							if (isAI2Enabled) Paddle2FourBonus.setAIEnabled(true);
							if (isAI3Enabled) Paddle3Bonus.setAIEnabled(true);
							if (isAI4Enabled) Paddle4Bonus.setAIEnabled(true);
						}

						try {
							// Create players in backend
							const player1Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias1}),
							}).then(res => res.json());

							const player2Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias2}),
							}).then(res => res.json());

							const player3Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias3}),
							}).then(res => res.json());

							const player4Response = await fetch('/api/players', {
								method: 'POST',
								headers: {'Content-Type': 'application/json'},
								body: JSON.stringify({name: alias4}),
							}).then(res => res.json());

							if (player1Response.success && player2Response.success &&
								player3Response.success && player4Response.success) {
								const matchResponse = await fetch('/api/players/match4', {
									method: 'POST',
									headers: {'Content-Type': 'application/json'},
									body: JSON.stringify({
										player1Id: player1Response.id,
										player2Id: player2Response.id,
										player3Id: player3Response.id,
										player4Id: player4Response.id,
										gameType: 'pong'
									}),
								}).then(res => res.json());

								if (matchResponse.success) {
									localStorage.setItem('currentMatchId', matchResponse.matchId.toString());
									startGame(4, matchType);
								}
							}
						} catch (error) {}
					};
				}
			} else if (buttonType === 'tournoi') {
				startButton.addEventListener('click', startTournament);
			}
		} else if (gameType === 'pfc') {
			startButton.onclick = async () => {
				const player1Input = document.getElementById("playerAlias1") as HTMLInputElement;
				const player2Input = document.getElementById("playerAlias2") as HTMLInputElement;
				const player1 = player1Input.value;
				const player2 = player2Input.value;

				if (!isValidString(player1) || !isValidString(player2)) {
					alert("" + t("error_invalid_alias") + "\n" + t("error_alias_format"));
					return;
				}

				localStorage.setItem('player1Alias', player1);
				localStorage.setItem('player2Alias', player2);

				try {
					const player1Response = await fetch('/api/players', {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({name: player1}),
					}).then(res => res.json());

					const player2Response = await fetch('/api/players', {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({name: player2}),
					}).then(res => res.json());

					if (player1Response.success && player2Response.success) {
						const matchResponse = await fetch("/api/players/match", {
							method: 'POST',
							headers: {'Content-Type': 'application/json'},
							body: JSON.stringify({
								player1Id: player1Response.id,
								player2Id: player2Response.id,
								gameType: 'pfc'
							}),
						}).then(res => res.json());

						if (matchResponse.success) {
							localStorage.setItem('currentMatchId', matchResponse.matchId.toString());
							if (matchType === 'normal')
								init();
							else if (matchType === 'bonus')
								init_bonus();
						}
					}
				} catch (error) {
					console.error("Failed to start PFC match:", error);
				}
			}
		}
	}
}

interface Match {
	player1: string;
	player1_score: number;
	player2: string;
	player2_score: number;
	player3?: string;
	player3_score?: number;
	player4?: string;
	player4_score?: number;
	winner: string | null;
	playerCount?: number;
}

/**
 * @brief Affiche les tableaux des historiques.
 * @param gameType type de jeu (pong/pfc).
 */
export async function showHistory(gameType: string) {
	// Récupère le contenu de la div "history" en fonction du type de jeu.
	const historyContainer = document.getElementById(`history-${gameType === 'fourpong' ? 'pong' : gameType}`);
	if (!historyContainer)
		return ;

	// Cache les boutons d'historiques.
	const pong_hist_btn = document.getElementById('pong-hist-btn');
	if (pong_hist_btn)
		pong_hist_btn.classList.add('hidden');

	const fourpong_hist_btn = document.getElementById('fourpong-hist-btn');
	if (fourpong_hist_btn)
		fourpong_hist_btn.classList.add('hidden');

	const pfc_hist_btn = document.getElementById('pfc-hist-btn');
	if (pfc_hist_btn)
		pfc_hist_btn.classList.add('hidden');

	// Check si des matchs existent dans la DB.
	try {
		const response = await fetch(`/api/scores/history/${gameType}`, {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({})
		});
		const data = await response.json();

		if (gameType === 'pong' || gameType === 'fourpong' || gameType === 'pfc')
			historyContainer.className = 'flex flex-col items-center max-h-60 overflow-y-auto';

		// On vide d'abord le conteneur d'historique.
		historyContainer.innerHTML = "";

		// Creation de deux div distinctes : une pour l'en tete et une pour les tableaux.
		const headerDiv = document.createElement('div');
		headerDiv.className = 'flex items-center justify-center gap-2 mb-4 mt-2';
		headerDiv.innerHTML = `
    		<button aria-label="${t("back")}" id="back-button-${gameType}" class="btn btn-fixed rounded-lg border p-4 shadow">${t("back")}</button>
    		<h2 class="hidden">${t("history")} ${gameType}</h2>
		`;
		historyContainer.appendChild(headerDiv);

		// Div pour les tableaux d'historique.
		const tablesDiv = document.createElement('div');
		tablesDiv.className = 'w-full space-y-2';

		if (data.success && data.matches && data.matches.length > 0) {
			// Separation des matchs 2 ou 4 joueurs.
			const twoPlayerMatches = data.matches.filter((match: Match) => !match.player3);
			const fourPlayerMatches = data.matches.filter((match: Match) => match.player3);

			// Afficher les matchs a 2 joueurs pour 'pong'
			if (gameType === 'pong' && twoPlayerMatches.length > 0) {

				twoPlayerMatches.forEach((match: Match) => {
					const tableEl = document.createElement('table');
					tableEl.className = 'border-collapse border w-full text-center table-fixed';
					tableEl.innerHTML = `
						<tr>
							<th class="bg-hist bg-hist-text border p-2 w-1/2" title="${match.player1}">
								${match.player1.length > 7 ? match.player1.substring(0, 7) + '...' : match.player1}
							</th>
							<th class="bg-hist bg-hist-text border p-2 w-1/2" title="${match.player2}">
								${match.player2.length > 7 ? match.player2.substring(0, 7) + '...' : match.player2}
							</th>
						</tr>
						<tr>
							<td class="border p-2">${match.player1_score}</td>
							<td class="border p-2">${match.player2_score}</td>
						</tr>
					`;
					tablesDiv.appendChild(tableEl);
				});
			}

			// Afficher les matchs a 4 joueurs pour 'fourpong'
			if (gameType === 'fourpong' && fourPlayerMatches.length > 0) {


				fourPlayerMatches.forEach((match: Match) => {
					const tableEl = document.createElement('table');
					tableEl.innerHTML = `
						<tr class="mt-10">
							<th class="bg-hist bg-hist-text border p-2 w-1/2">${match.player1}</th>
							<th class="bg-hist bg-hist-text border p-2 w-1/2">${match.player2}</th>
						</tr>
						<tr>
							<td class="border p-2">${match.player1_score}</td>
							<td class="border p-2">${match.player2_score}</td>
						</tr>
						<tr>
							<th class="bg-hist bg-hist-text border p-2 w-1/4">${match.player3}</th>
							<th class="bg-hist bg-hist-text border p-2 w-1/4">${match.player4}</th>
						</tr>
						<tr>
							<td class="border p-2">${match.player3_score}</td>
							<td class="border p-2">${match.player4_score}</td>
						</tr>
					`;
					tableEl.className = 'border-collapse border w-full text-center table-fixed';
					tablesDiv.appendChild(tableEl);
				});
			}

			// Pour PFC.
			if (gameType === 'pfc') {
				twoPlayerMatches.forEach((match: Match) => {
					const tableEl = document.createElement('table');
					tableEl.className = 'border-collapse border w-full text-center table-fixed';
					tableEl.innerHTML = `
						<tr>
							<th class="bg-hist bg-hist-text border p-2 w-1/2">${match.player1}</th>
							<th class="bg-hist bg-hist-text border p-2 w-1/2">${match.player2}</th>
						</tr>
						<tr>
							<td class="border p-2">${match.player1_score}</td>
							<td class="border p-2">${match.player2_score}</td>
						</tr>
					`;
					tablesDiv.appendChild(tableEl);
				});
			}
		} else {
			const noMatchesEl = document.createElement('p');
			noMatchesEl.textContent = `${t("no_matches")}`;
			tablesDiv.appendChild(noMatchesEl);
		}

		historyContainer.appendChild(tablesDiv);

		// Empêche d'appuyer sur les boutons en dehors des div d'historiques.
		disableUnrelatedButtons(gameType === 'pong' || gameType === 'fourpong' ? 'pfc' : 'pong');

		const ScreenReader = screenReader.getInstance();
		ScreenReader.announcePageChange(t("history"));

		// Bouton retour.
		const backButton = document.getElementById(`back-button-${gameType}`);
		if (backButton) {
			backButton.addEventListener("click", () => {
				window.history.back();
			});
		}

		// After rendering the history content, re-apply text style and listeners
		attachTextListeners();
		initText();
	} catch (error) {
		historyContainer.innerHTML = `
			<div class="flex items-center justify-center gap-2 mb-4">
				<button id="back-button-${gameType}" class="little_btn rounded-lg border p-2 shadow"><</button>
				<h2 class="text-xl font-semibold">Erreur</h2>
			</div>
			<p>${t("hist_error")}</p>
		`;
	}
}

/**
 * @brief Initialise les matchs.
 * @param playerCount nombre de joueurs.
 * @param matchType normal/bonus.
 */
export function startGame(playerCount: number, matchType: MatchType) {
	// Récupère le contenu de la div "Pong".
	const container = document.getElementById("Pong");
	if (!container)
		return;

	const ScreenReader = screenReader.getInstance();

	console.log("Starting game with players:");
	console.log("Player 1:", localStorage.getItem('player1Alias'));
	console.log("Player 2:", localStorage.getItem('player2Alias'));
	if (playerCount === 4) {
		console.log("Player 3:", localStorage.getItem('player3Alias'));
		console.log("Player 4:", localStorage.getItem('player4Alias'));
	}

	// Cleanup previous game instance if it exists
	if (currentGameInstance && typeof currentGameInstance.cleanup === 'function') {
		currentGameInstance.cleanup();
		currentGameInstance = null;
	}

	// Reset global/static state for the correct game mode
	if (playerCount === 2) {
		if (matchType === 'normal') {
			Game.resetGlobalState();
		} else if (matchType === 'bonus') {
			GameBonus.resetGlobalState();
		}
	} else if (playerCount === 4) {
		if (matchType === 'normal') {
			GameFour.resetGlobalState();
		} else if (matchType === 'bonus') {
			GameFourBonus.resetGlobalState();
		}
	}

	// Reset les scores avant de commencer un match.
	Game.player1Score = 0;
	Game.player2Score = 0;
	Game.setGameOver(false);

	/**
	 * @brief Calcul le délai du lecteur d'écran.
	 * @param text texte à définir le délai.
	 */
	function getScreenReaderDelay(text: string): number {
		if (!ScreenReader.isEnabled())
			return 100; // Délai minimal.

		const wordsPerMinute = 180;
		const wordsPerSecond = wordsPerMinute / 60;
		const wordCount = text.split(' ').length;
		const readingTimeMs = (wordCount / wordsPerSecond) * 1000;

		// Marge de securite de 1.5sec.
		return Math.max(readingTimeMs + 2000, 3000); // Minimum 3sec.
	}

	// Set-up l'espace de jeu.
	if (playerCount === 2) {
		container.innerHTML = `
			<div class="flex justify-center w-full">
				<canvas id="game-canvas" width="600" height="400"
						class="max-w-full border border-gray-300 rounded"></canvas>
			</div>
		`;

		// Empêche d'appuyer sur les autres boutons en dehors de la div "Pong".
		disableUnrelatedButtons('pong');

		// Only set tournament mode if we're actually in a tournament
		const inTournament = localStorage.getItem('currentTournamentId') !== null;
		if (!inTournament) {
			localStorage.removeItem('tournamentMode');
		}

		if (matchType === 'normal') {
			const delay = getScreenReaderDelay(t("pong_explanation"));

			setTimeout(() => {
				currentGameInstance = new Game();

				Game.ScreenReader.announceGameEvent(t("pong_explanation"));

				// Check if AI was enabled in player selection
				const player2Input = document.getElementById('playerAlias2') as HTMLInputElement;
				if (player2Input?.disabled) {
					Paddle2.setAIEnabled(true);
				}

				setTimeout(() => {
					requestAnimationFrame(currentGameInstance.gameLoop.bind(currentGameInstance));
				}, delay);
			}, 100);
		} else if (matchType === 'bonus') {
			const delay = getScreenReaderDelay(t("pong_explanation"));

			setTimeout(() => {
				currentGameInstance = new GameBonus();

				Game.ScreenReader.announceGameEvent(t("pong_explanation"));

				// Check if AI was enabled in player selection
				const player2Input = document.getElementById('playerAlias2') as HTMLInputElement;
				if (player2Input?.disabled) {
					Paddle2Bonus.setAIEnabled(true);
				}

				setTimeout(() => {
					requestAnimationFrame(currentGameInstance.gameLoop.bind(currentGameInstance));
				}, delay);
			}, 100);
		}
	} else if (playerCount === 4) {
		container.innerHTML = `
			<div class="flex justify-center w-full">
				<canvas id="game-canvas" width="500" height="500" 
						class="max-w-full border border-gray-300 rounded"></canvas>
			</div>
		`;

		GameFour.player1Score = 0;
		GameFour.player2Score = 0;
		GameFour.player3Score = 0;
		GameFour.player4Score = 0;

		if (matchType === 'normal') {
			const delay = getScreenReaderDelay(t("pong-four_explanation"));

			setTimeout(() => {
				currentGameInstance = new GameFour();

				GameFour.ScreenReader.announceGameEvent(t("pong-four_explanation"));

				setTimeout(() => {
					requestAnimationFrame(currentGameInstance.gameLoop.bind(currentGameInstance));
				}, delay);
			}, 100);
		} else if (matchType === 'bonus') {
			const delay = getScreenReaderDelay(t("pong-four_explanation"));

			setTimeout(() => {
				currentGameInstance = new GameFourBonus();

				GameFour.ScreenReader.announceGameEvent(t("pong-four_explanation"));

				setTimeout(() => {
					requestAnimationFrame(currentGameInstance.gameLoop.bind(currentGameInstance));
				}, delay);
			}, 100);
		}
	}
}

/**
 * @brief Affiche la page d'accueil.
 */
export function showHome() {
	const appElement = document.getElementById('app');
	if (appElement) {
		const ScreenReader = screenReader.getInstance();
		ScreenReader.cancelSpeech();

		const lang: any = localStorage.getItem('lang');
		const text: any = localStorage.getItem('textSize');
		const theme: any = localStorage.getItem('theme');

		localStorage.clear();

		// Clean up tournament mode and AI state
		localStorage.removeItem('tournamentMode');
		localStorage.removeItem('currentMatchId');
		localStorage.removeItem('pendingMatchId');
		localStorage.removeItem('semifinal1Id');
		localStorage.removeItem('semifinal2Id');
		localStorage.removeItem('semifinal1Winner');
		localStorage.removeItem('semifinal1Loser');
		localStorage.removeItem('semifinal2Winner');
		localStorage.removeItem('semifinal2Loser');
		localStorage.removeItem('player1Id');
		localStorage.removeItem('player2Id');
		localStorage.removeItem('player3Id');
		localStorage.removeItem('player4Id');
		localStorage.removeItem('currentTournamentId');
		localStorage.removeItem('tournamentWinnerAlias');
		localStorage.removeItem('isPlayer1AI');
		localStorage.removeItem('isPlayer2AI');
		localStorage.removeItem('isPlayer3AI');
		localStorage.removeItem('isPlayer4AI');
		localStorage.removeItem('player1Alias');
		localStorage.removeItem('player2Alias');
		localStorage.removeItem('player3Alias');
		localStorage.removeItem('player4Alias');

		if (lang) {
			localStorage.setItem('lang', lang);
		}
		if (text) {
			localStorage.setItem('textSize', text);
		}
		if (theme) {
			localStorage.setItem('theme', theme);
		}

		appElement.innerHTML = homePage();

		const pongContainer = document.getElementById("Pong");
		if (pongContainer) {
			pongContainer.classList.remove("grid-cols-1");
			pongContainer.classList.add("grid-cols-2");
		}

		// Reactive les boutons en dehors de divs spécifiques.
		disableUnrelatedButtons('home');

		attachHomePageListeners();
		attachLanguageListeners();
		attachTextListeners();
		initText();
		initializeScreenReader();
	}
}
