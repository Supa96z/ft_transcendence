import db from "../db.js";

export const addPlayer = (name) => {
	const stmt = db.prepare('INSERT INTO players (name) VALUES (?)');
	const result = stmt.run(name);
	return result.lastInsertRowid;
};

export const getPlayers = () => {
	return db.prepare('SELECT * FROM players').all();
};

export const deletePlayer = (playerId) => {
	// Supprimer les scores associés
	const deleteScoresStmt = db.prepare('DELETE FROM scores WHERE player_id = ?');
	deleteScoresStmt.run(playerId);

	// Supprimer le joueur
	const deletePlayerStmt = db.prepare('DELETE FROM players WHERE id = ?');
	const result = deletePlayerStmt.run(playerId);
	return result.changes > 0; // Renvoie true si le joueur a été supprimé
};