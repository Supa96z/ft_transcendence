import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('pong.db');

export function setupDatabase() {
	db.pragma('foreign_keys = ON');

	db.exec(`
		CREATE TABLE IF NOT EXISTS tournaments
		(
			id		INTEGER PRIMARY KEY AUTOINCREMENT,
			status	TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
			name	TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS players
		(
			id				INTEGER PRIMARY KEY AUTOINCREMENT,
			name			TEXT NOT NULL,
			tournament_id	INTEGER,
			FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS scores
		(
			id			INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id	INTEGER NOT NULL,
			score		INTEGER NOT NULL,
			FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS matches
		(
			id				INTEGER PRIMARY KEY AUTOINCREMENT,
			tournament_id	INTEGER,
			player1_id		INTEGER NOT NULL,
			player2_id		INTEGER NOT NULL,
			player1_score	INTEGER DEFAULT 0,
			player2_score	INTEGER DEFAULT 0,
			status			TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
			winner_id		INTEGER,
			game_type		TEXT NOT NULL DEFAULT 'pong',
			FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
			FOREIGN KEY (player1_id) REFERENCES players (id),
			FOREIGN KEY (player2_id) REFERENCES players (id),
			FOREIGN KEY (winner_id) REFERENCES players (id)
		);

		CREATE TABLE IF NOT EXISTS matches_4
		(
			id				INTEGER PRIMARY KEY AUTOINCREMENT,
			tournament_id	INTEGER,
			player1_id		INTEGER NOT NULL,
			player2_id		INTEGER NOT NULL,
			player3_id		INTEGER NOT NULL,
			player4_id		INTEGER NOT NULL,
			player1_score	INTEGER DEFAULT 0,
			player2_score	INTEGER DEFAULT 0,
			player3_score	INTEGER DEFAULT 0,
			player4_score	INTEGER DEFAULT 0,
			status			TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
			winner_id		INTEGER,
			game_type		TEXT NOT NULL DEFAULT 'pong',
			FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
			FOREIGN KEY (player1_id) REFERENCES players (id),
			FOREIGN KEY (player2_id) REFERENCES players (id),
			FOREIGN KEY (player3_id) REFERENCES players (id),
			FOREIGN KEY (player4_id) REFERENCES players (id),
			FOREIGN KEY (winner_id) REFERENCES players (id)
		);

		CREATE TABLE IF NOT EXISTS game_settings
		(
			id			INTEGER PRIMARY KEY AUTOINCREMENT,
			player_id	INTEGER NOT NULL,
			theme		TEXT    DEFAULT 'default',
			power_ups	BOOLEAN DEFAULT 0
		);
	`);
}

console.log('Database Connected!');

export default db;