import db from "../db.js";

/**
 * @brief Créer un tournoi.
 */
export const createTournament = () => {
	const stmt = db.prepare('INSERT INTO tournaments (status) VALUES (?)');
	const result = stmt.run('pending');
	return result.lastInsertRowid;
};

/**
 * @brief Récupère tous les tournois.
 */
export const getTournaments = () => {
	return db.prepare('SELECT * FROM tournaments').all();
};

/**
 * @brief Récupère un tournoi par son ID.
 * @param id
 * @returns {unknown}
 */
export const getTournamentById = (id) => {
	return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
};

/**
 * @brief Update le status d'un tournoi.
 * @param id
 * @param status
 * @returns {boolean}
 */
export const updateTournamentStatus = (id, status) => {
	const stmt = db.prepare('UPDATE tournaments SET status = ? WHERE id = ?');
	const result = stmt.run(status, id);
	return result.changes > 0;
};

/**
 * @brief Ajoute un joueur au tournoi.
 * @param playerId
 * @param tournamentId
 * @returns {boolean}
 */
export const addPlayerToTournament = (playerId, tournamentId) => {
	const stmt = db.prepare('UPDATE players SET tournament_id = ? WHERE id = ?');
	const result = stmt.run(tournamentId, playerId);
	return result.changes > 0;
};

/**
 * @brief Récupère les joueurs d'un tournoi.
 * @param tournamentId
 * @returns {unknown[]}
 */
export const getTournamentPlayers = (tournamentId) => {
	return db.prepare('SELECT * FROM players WHERE tournament_id = ?').all(tournamentId);
};

/**
 * @brief Créer un match entre deux joueurs dans un tournoi.
 * @param tournamentId
 * @param player1Id
 * @param player2Id
 * @returns {number | bigint}
 */
export const createMatch = (tournamentId, player1Id, player2Id) => {
	const stmt = db.prepare('INSERT INTO matches (tournament_id, player1_id, player2_id) VALUES (?, ?, ?)');
	const result = stmt.run(tournamentId, player1Id, player2Id);
	return result.lastInsertRowid;
};

/**
 * @brief Récupère les matchs d'un tournoi.
 * @param tournamentId
 * @returns {unknown[]}
 */
export const getTournamentMatches = (tournamentId) => {
	return db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(tournamentId);
};

/**
 * @brief Update le score d'un match.
 * @param matchId
 * @param player1Score
 * @param player2Score
 * @returns {boolean}
 */
export const updateMatchScore = (matchId, player1Score, player2Score) => {
	const stmt = db.prepare('UPDATE matches SET player1_score = ?, player2_score = ? WHERE id = ?');
	const result = stmt.run(player1Score, player2Score, matchId);
	return result.changes > 0;
};

/**
 * @brief Update le status du match et défini le gagnant.
 * @param matchId
 * @param status
 * @param winnerId
 * @returns {boolean}
 */
export const updateMatchStatus = (matchId, status, winnerId = null) => {
	const stmt = db.prepare('UPDATE matches SET status = ?, winner_id = ? WHERE id = ?');
	const result = stmt.run(status, winnerId, matchId   );
	return result.changes > 0;
};

export const getMatchById = (matchId) => {
	return db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
};