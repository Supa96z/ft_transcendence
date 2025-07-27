import db from '../db.js';

export const getMatchHistoryPong = () => {
	return db.prepare(`
	SELECT
		m.id,
		p1.name AS player1,
		p2.name AS player2,
		m.player1_score,
		m.player2_score,
		w.name AS winner
	FROM matches m
	JOIN players p1 ON m.player1_id = p1.id
	JOIN players p2 ON m.player2_id = p2.id
	LEFT JOIN players w ON m.winner_id = w.id
	WHERE m.status = 'completed' AND m.game_type = 'pong'
	ORDER BY m.id DESC
  `).all();
};

export const getMatchHistoryFourPong = () => {
	return db.prepare(`
	SELECT
		m.id,
		p1.name AS player1,
		p2.name AS player2,
		p3.name AS player3,
		p4.name AS player4,
		m.player1_score,
		m.player2_score,
		m.player3_score,
		m.player4_score,
		w.name AS winner
	FROM matches_4 m
	JOIN players p1 ON m.player1_id = p1.id
	JOIN players p2 ON m.player2_id = p2.id
	JOIN players p3 ON m.player3_id = p3.id
	JOIN players p4 ON m.player4_id = p4.id
	LEFT JOIN players w ON m.winner_id = w.id
	WHERE m.status = 'completed' AND m.game_type = 'pong' AND m.player3_id IS NOT NULL AND m.player4_id IS NOT NULL
	ORDER BY m.id DESC
  `).all();
};

export const getMatchHistoryPfc = () => {
	return db.prepare(`
	SELECT
		m.id,
		p1.name AS player1,
		p2.name AS player2,
		m.player1_score,
		m.player2_score,
		w.name AS winner
	FROM matches m
	JOIN players p1 ON m.player1_id = p1.id
	JOIN players p2 ON m.player2_id = p2.id
	LEFT JOIN players w ON m.winner_id = w.id
	WHERE m.status = 'completed' AND m.game_type = 'pfc'
	ORDER BY m.id DESC
  `).all();
};
