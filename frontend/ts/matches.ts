import { startGame } from "./script.js";
import {MatchType} from "./Utilities.js";
import {isValidString} from "./sanitize.js";
import {t} from "../lang/i18n.js";

/**
 * @brief Créer les matchs a deux joueurs.
 * @param startButton bouton pour commencer le match.
 * @param matchType normal/bonus.
 */
export function twoPlayersMatch(startButton: HTMLElement, matchType: MatchType) {
	startButton.addEventListener("click", async () => {
		await showMatch(matchType);
	});
}

export async function showMatch(matchType: MatchType) {
	// Stock les alias des joueurs.
	const player1 = (document.getElementById('playerAlias1') as HTMLInputElement).value;
	const player2 = (document.getElementById('playerAlias2') as HTMLInputElement).value;

	if (!isValidString(player1) || !isValidString(player2)) {
		alert("" + t("error_invalid_alias") + "\n" + t("error_alias_format"));
		return ;
	}

	// Stock les alias pour l'affichage en match.
	localStorage.setItem('player1Alias', player1);
	localStorage.setItem('player2Alias', player2);

	try {
		// Créer les joueurs dans le back.
		const player1Response = await fetch('/api/players', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name: player1}),
		}).then(res => res.json());

		const player2Response = await fetch("/api/players", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({name: player2}),
		}).then(res => res.json());

		// Créer le match dans le back.
		if (player1Response.success && player2Response.success) {
			const matchResponse = await fetch("/api/players/match", {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify({
					player1Id: player1Response.id,
					player2Id: player2Response.id,
					gameType: 'pong'
				}),
			}).then(res => res.json());

			if (matchResponse.success) {
				// Stocker l'ID du match pour l'utiliser à la fin de la partie
				localStorage.setItem('currentMatchId', matchResponse.matchId.toString());
				startGame(2, matchType);
			}
		}
	} catch (error) {}
}

/**
 * @brief Créer les matchs a quatre joueurs.
 * @param startButton bouton pour commencer le match.
 * @param matchType normal/bonus.
 */
export function fourPlayersMatch(startButton: HTMLElement, matchType: MatchType) {
	startButton.addEventListener("click", async () => {
		await showFourPlayersMatch(matchType);
	})
}

export async function showFourPlayersMatch(matchType: MatchType) {
	// Stock les alias des joueurs.
	const player1 = (document.getElementById('playerAlias1') as HTMLInputElement).value;
	const player2 = (document.getElementById('playerAlias2') as HTMLInputElement).value;
	const player3 = (document.getElementById('playerAlias3') as HTMLInputElement).value;
	const player4 = (document.getElementById('playerAlias4') as HTMLInputElement).value;

	if (!isValidString(player1) || !isValidString(player2)) {
		alert("" + t("error_invalid_alias") + "\n" + t("error_alias_format"));
		return ;
	}

	// Stock les alias pour l'affichage en match.
	localStorage.setItem('player1Alias', player1);
	localStorage.setItem('player2Alias', player2);
	localStorage.setItem('player3Alias', player3);
	localStorage.setItem('player4Alias', player4);

	try {
		// Créer les joueurs dans le back.
		const player1Response = await fetch('/api/players', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name: player1}),
		}).then(res => res.json());

		const player2Response = await fetch("/api/players", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({name: player2}),
		}).then(res => res.json());

		const player3Response = await fetch("/api/players", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({name: player3}),
		}).then(res => res.json());

		const player4Response = await fetch("/api/players", {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({name: player4}),
		}).then(res => res.json());

		// Créer le match dans le back.
		if (player1Response.success && player2Response.success && player3Response.success && player4Response.success) {
			const matchResponse = await fetch("/api/players/match4", {
				method : "POST",
				headers: {"Content-Type": "application/json"},
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
}