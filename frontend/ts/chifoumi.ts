import { showHome } from "./script.js";
import {t} from "../lang/i18n.js";
import {MatchType} from "./Utilities.js";
import {screenReader} from "./screenReader.js"
import {isValidString} from "./sanitize.js";
import { handleRoute, navigate } from "./popstate.js";

type Choix = 'pierre' | 'feuille' | 'ciseaux';

let scoreJ1 = 0;
let scoreJ2 = 0;
let choixJ1: Choix | null = null;
let choixJ2: Choix | null = null;

let handleKeydownGlobal: (e: KeyboardEvent) => void;

const symbols: Record<Choix, string> = {
	pierre: "🪨",
	feuille: "🧻",
	ciseaux: "✂️"
};

const touchesJ1: Record<string, Choix> = { q: 'pierre', w: 'feuille', e: 'ciseaux' };
const touchesJ2: Record<string, Choix> = { j: 'pierre', k: 'feuille', l: 'ciseaux' };

const ScreenReader = screenReader.getInstance();


function creerElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, textContent?: string): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (textContent) el.textContent = textContent;
	return el;
}

/**
 * @brief Gere le pfc.
 */
export function init() {
	scoreJ1 = 0;
	scoreJ2 = 0;
	choixJ1 = null;
	choixJ2 = null;

	const container = document.getElementById("pfc");
	if (!container)
		return ;

	container.innerHTML = "";

	const title = creerElement("h1", "", t("pfc"));

	let isWaiting = false;
	const rockSymbol = symbols.pierre;
	const paperSymbol = symbols.feuille;
	const scissorSymbol = symbols.ciseaux;
	const instructions1 = creerElement("p", "", `${t("player")} 1 : Q = ${rockSymbol} | W = ${paperSymbol} | E = ${scissorSymbol}`);
	const instructions2 = creerElement("p", "", `${t("player")} 2 : J = ${rockSymbol} | K = ${paperSymbol} | L = ${scissorSymbol}`);

	const arena = creerElement("div", "arena", "");
	arena.id = "arena";

	const colJ1 = creerElement("div", "player-column", "");
	const colJ2 = creerElement("div", "player-column", "");
	const fightZone = creerElement("div", "fight-zone", "");

	const fightJ1 = creerElement("div", "fight-symbol", "");
	fightJ1.id = "fight-j1";
	const fightJ2 = creerElement("div", "fight-symbol", "");
	fightJ2.id = "fight-j2";

	fightZone.append(fightJ1, fightJ2);

	for (let c of ['pierre', 'feuille', 'ciseaux'] as Choix[]) {
		colJ1.appendChild(creerElement("div", "choice", symbols[c]));
		colJ2.appendChild(creerElement("div", "choice", symbols[c]));
	}

	arena.append(colJ1, fightZone, colJ2);

	const resultat = creerElement("div", "", "");
	resultat.id = "resultat";

	const scores = creerElement("div", "", `${t("score")} ${t("player")} 1: 0 | ${t("score")} ${t("player")} 2: 0`);
	scores.id = "scores";

	const vainqueur = creerElement("div", "", "");
	vainqueur.id = "vainqueur";

	container.append(title, instructions1, instructions2, arena, resultat, scores, vainqueur);

	ScreenReader.announceGameEvent(t("pfc_explanation"));

	function handleKeydown(e: KeyboardEvent) {
		// Ignore les entree pendant le délai.
		if (isWaiting)
			return ;

		const key = e.key.toLowerCase();

		if (!choixJ1 && touchesJ1[key])
			choixJ1 = touchesJ1[key];
		else if (!choixJ2 && touchesJ2[key])
			choixJ2 = touchesJ2[key];

		if (choixJ1 && choixJ2) {
			// Bloque les entrees.
			isWaiting = true;

			afficherCombat(fightZone, fightJ1, fightJ2, choixJ1, choixJ2);
			setTimeout(() => {
				const result = comparer(choixJ1!, choixJ2!);

				const choixJ1Traduit = t(getChoixTranslationKey(choixJ1!));
				const choixJ2Traduit = t(getChoixTranslationKey(choixJ2!));

				// Recuperation des alias des joueurs.
				const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
				const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

				const chooseText = t("choose");
				ScreenReader.announceGameEvent(`${player1Alias} ${chooseText} ${choixJ1}`);
				ScreenReader.announceGameEvent(`${player2Alias} ${chooseText} ${choixJ2}`);

				resultat.innerHTML = `${player1Alias}: ${choixJ1Traduit} | ${player2Alias}: ${choixJ2Traduit} <br> ${result}`;
				scores.innerHTML = `${t("score")} ${player1Alias}: ${scoreJ1} | ${t("score")} ${player2Alias}: ${scoreJ2}`;
				if (scoreJ1 >= 5 || scoreJ2 >= 5)
					verifierVainqueur();

				setTimeout(() => {
					fightZone.classList.remove("fight-in");
					fightJ1.textContent = "";
					fightJ2.textContent = "";

					// Reinitialisation des choix et déblocage.
					choixJ1 = null;
					choixJ2 = null;
					isWaiting = false;
				}, 1000);
			}, 500);
		}
	}

	document.removeEventListener("keydown", handleKeydownGlobal);
	handleKeydownGlobal = handleKeydown;
	document.addEventListener("keydown", handleKeydown);

	function verifierVainqueur() {
		const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
		const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

		if (container) {
			container.innerHTML = `
				<p class="font-extrabold text-2xl mb-4">${scoreJ1 >= 5 ? player1Alias + t("as_won") : player2Alias + t("as_won")}</p>
				<div class="flex justify-center mt-4">
					<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
				</div>
			`;
			const returnButton = document.getElementById("menu-btn");
			if (returnButton) {
				returnButton.addEventListener("click", () => {
					navigate('/home');
					showHome();
				});
			}
		}

		document.removeEventListener("keydown", handleKeydown);

		const matchId = localStorage.getItem('currentMatchId');
		if (matchId) {
			fetch('api/players/match/score', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					matchId: parseInt(matchId),
					player1Score: scoreJ1,
					player2Score: scoreJ2
				}),
			}).catch(error => {});
		}
	}
}

function afficherCombat(zone: HTMLElement, el1: HTMLElement, el2: HTMLElement, c1: Choix, c2: Choix) {
	el1.textContent = symbols[c1];
	el2.textContent = symbols[c2];
	zone.classList.add("fight-in");
}

function comparer(c1: Choix, c2: Choix): string {
	// Récupération des alias des joueurs.
	const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
	const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

	if (c1 === c2) {
		ScreenReader.announceGameEvent(t("equality"));
		return t("equality") || "Égalité !";
	}
	if (
		(c1 === "pierre" && c2 === "ciseaux") ||
		(c1 === "feuille" && c2 === "pierre") ||
		(c1 === "ciseaux" && c2 === "feuille")
	) {
		scoreJ1++;
		ScreenReader.announceGameEvent(`${player1Alias} ${t("wins_round")}`);
		return `${player1Alias} ${t("wins_round")}` || `${player1Alias} gagne la manche !`;
	} else {
		scoreJ2++;
		ScreenReader.announceGameEvent(`${player2Alias} ${t("wins_round")}`);
		return `${player2Alias} ${t("wins_round")}` || `${player2Alias} gagne la manche !`;
	}
}

function getChoixTranslationKey(choix: Choix): string {
	switch(choix) {
		case 'pierre': return 'rock';
		case 'feuille': return 'paper';
		case 'ciseaux': return 'scissors';
		default: return choix;
	}
}



//////////////////////////////////////////////// BONUS ///////////////////////////////////////////



export function init_bonus() {
	scoreJ1 = 0;
	scoreJ2 = 0;
	choixJ1 = null;
	choixJ2 = null;

	const container = document.getElementById("pfc");
	if (!container)
		return ;

	container.innerHTML = "";

	const title = creerElement("h1", "", t("pfc"));

	let isWaiting = false;
	const rockSymbol = symbols.pierre;
	const paperSymbol = symbols.feuille;
	const scissorSymbol = symbols.ciseaux;
	const instructions1 = creerElement("p", "", `${t("player")} 1 : Q = ${rockSymbol} | W = ${paperSymbol} | E = ${scissorSymbol}`);
	const instructions2 = creerElement("p", "", `${t("player")} 2 : J = ${rockSymbol} | K = ${paperSymbol} | L = ${scissorSymbol}`);

	const arena = creerElement("div", "arena", "");
	arena.id = "arena";

	const colJ1 = creerElement("div", "player-column", "");
	const colJ2 = creerElement("div", "player-column", "");
	const fightZone = creerElement("div", "fight-zone", "");

	const fightJ1 = creerElement("div", "fight-symbol", "");
	fightJ1.id = "fight-j1";
	const fightJ2 = creerElement("div", "fight-symbol", "");
	fightJ2.id = "fight-j2";

	fightZone.append(fightJ1, fightJ2);

	for (let c of ['pierre', 'feuille', 'ciseaux'] as Choix[]) {
		colJ1.appendChild(creerElement("div", "choice", symbols[c]));
		colJ2.appendChild(creerElement("div", "choice", symbols[c]));
	}

	arena.append(colJ1, fightZone, colJ2);

	const resultat = creerElement("div", "", "");
	resultat.id = "resultat";

	const scores = creerElement("div", "", `${t("score")} ${t("player")} 1: 0 | ${t("score")} ${t("player")} 2: 0`);
	scores.id = "scores";

	const vainqueur = creerElement("div", "", "");
	vainqueur.id = "vainqueur";

	container.append(title, instructions1, instructions2, arena, resultat, scores, vainqueur);

	ScreenReader.announceGameEvent(t("pfc_explanation"));


	function handleKeydown(e: KeyboardEvent) {
		if (isWaiting) return; // Ignore les entrées pendant le délai

		const key = e.key.toLowerCase();

		if (!choixJ1 && touchesJ1[key])
			choixJ1 = touchesJ1[key];
		else if (!choixJ2 && touchesJ2[key])
			choixJ2 = touchesJ2[key];

		if (choixJ1 && choixJ2) {
			isWaiting = true; // Bloque les entrées

			afficherCombat(fightZone, fightJ1, fightJ2, choixJ1, choixJ2);

			setTimeout(() => {
				const result = comparer_bonus(choixJ1!, choixJ2!);

				const choixJ1Traduit = t(getChoixTranslationKey(choixJ1!));
				const choixJ2Traduit = t(getChoixTranslationKey(choixJ2!));

				// Recuperation des alias des joueurs.
				const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
				const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

				const chooseText = t("choose");
				ScreenReader.announceGameEvent(`${player1Alias} ${chooseText} ${choixJ1}`);
				ScreenReader.announceGameEvent(`${player2Alias} ${chooseText} ${choixJ2}`);

				resultat.innerHTML = `${player1Alias}: ${choixJ1Traduit} | ${player2Alias}: ${choixJ2Traduit} <br> ${result}`;
				scores.innerHTML = `${t("score")} ${player1Alias}: ${scoreJ1} | ${t("score")} ${player2Alias}: ${scoreJ2}`;

				if (scoreJ1 >= 5 || scoreJ2 >= 5)
					verifierVainqueur();

				setTimeout(() => {
					fightZone.classList.remove("fight-in");
					fightJ1.textContent = "";
					fightJ2.textContent = "";

					// Réinitialisation des choix et déblocage
					choixJ1 = null;
					choixJ2 = null;
					isWaiting = false;
				}, 1000);
			}, 500);
		}
	}

	document.removeEventListener("keydown", handleKeydownGlobal);
	handleKeydownGlobal = handleKeydown;
	document.addEventListener("keydown", handleKeydown);

	function verifierVainqueur() {
		if (scoreJ1 >= 5 || scoreJ2 >= 5) {
			const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
			const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

			if (container) {
				container.innerHTML = `
					<p class="font-extrabold text-2xl mb-4">${scoreJ1 >= 5 ? player1Alias + t("as_won") : player2Alias + t("as_won")}</p>
					<div class="flex justify-center mt-4">
						<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
					</div>
				`;
				const returnButton = document.getElementById("menu-btn");
				if (returnButton) {
					returnButton.addEventListener("click", () => {
						navigate('/home');
						showHome();
					});
				}
			}

			document.removeEventListener("keydown", handleKeydown);

			const matchId = localStorage.getItem('currentMatchId');
			if (matchId) {
				fetch('api/players/match/score', {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({
						matchId: parseInt(matchId),
						player1Score: scoreJ1,
						player2Score: scoreJ2
					}),
				}).catch(error => {
					console.error(`${t("error_score_save")}:`, error);
				});
			}
		}
	}

	function comparer_bonus(c1: Choix, c2: Choix): string {
		// Récupération des alias des joueurs.
		const player1Alias = localStorage.getItem('player1Alias') || t("player") + " 1";
		const player2Alias = localStorage.getItem('player2Alias') || t("player") + " 2";

		if (c1 === c2) {
			let bonusText = "";

			if (scoreJ1 + 2 <= scoreJ2) {
				scoreJ1++;
				ScreenReader.announceGameEvent(`${player1Alias} ${t("wins_equalized")}`);
				bonusText = ` (${t("bonus_equalizer", {player: player1Alias}) || `Bonus ${player1Alias}`}!)`;
			} else if (scoreJ2 + 2 <= scoreJ1) {
				scoreJ2++;
				ScreenReader.announceGameEvent(`${player2Alias} ${t("wins_equalized")}`);
				bonusText = ` (${t("bonus_equalizer", {player: player2Alias}) || `Bonus ${player2Alias}`}!)`;
			} else {
				return t("equality") || "Égalité !";
			}

			ScreenReader.announceGameEvent(t("equality"));
			return (t("equality") || "Égalité !") + bonusText;
		}

		if (
			(c1 === "pierre" && c2 === "ciseaux") ||
			(c1 === "feuille" && c2 === "pierre") ||
			(c1 === "ciseaux" && c2 === "feuille")
		) {
			scoreJ1++;
			ScreenReader.announceGameEvent(`${player1Alias} ${t("wins_round")}`);
			return `${player1Alias} ${t("wins_round")}` || `${player1Alias} gagne la manche !`;
		} else {
			scoreJ2++;
			ScreenReader.announceGameEvent(`${player2Alias} ${t("wins_round")}`);
			return `${player2Alias} ${t("wins_round")}` || `${player2Alias} gagne la manche !`;
		}
	}
}