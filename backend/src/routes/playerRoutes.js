import { addPlayer, getPlayers, deletePlayer } from "../models/playerModel.js";
import db from "../db.js"

export default async function playerRoutes(fastify) {
	// Validation des données d'entrée pour la sécurité
	const playerSchema = {
		body: {
			type: 'object',
			required: ['name'],
			properties: {
				name: { type: 'string', minLength: 2, maxLength: 15 }
			}
		}
	};

	fastify.post('/', { schema: playerSchema }, async (request, reply) => {
		const { name } = request.body;
		try {
			const id = addPlayer(name);
			return { success: true, id };
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				message: 'Impossible d\'ajouter le joueur.'
			});
		}
	});

	fastify.get('/', async(request, reply) => {
		try {
			const players = getPlayers();
			return { success: true, players };
		} catch (error) {
			fastify.log.error(error);
			return reply.status(400).send({
				success: false,
				message: 'Impossible d\'ajouter le joueur.'
			});
		}
	});

	fastify.get('/:id', async (request, reply) => {
		const { id } = request.params;
		try {
			const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);

			if (player)
				return { success: true, player };
			else {
				return reply.status(404).send({
					success: false,
					message: `Joueur avec l'ID ${id} non trouvé.`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer les informations du joueur.'
			});
		}
	})

	fastify.delete('/:id', async (request, reply) => {
		const { id } = request.params;
		try {
			const result = deletePlayer(id);
			if (result) {
				return { success: true, message: `Joueur avec l'ID ${id} supprimé` };
			} else {
				return reply.status(404).send({
					success: false,
					message: `Joueur avec l'ID ${id} non trouvé.`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de supprimer le joueur.'
			});
		}
	});

	fastify.post('/match', async (request, reply) => {
		const { player1Id, player2Id, gameType } = request.body;

		if (!player1Id || !player2Id || !gameType)
			return reply.status(400).send({ success: false, message: "IDs des joueurs et type de jeu requis." });

		try {
			const stmt = db.prepare(`
			INSERT INTO matches (player1_id, player2_id, game_type, status)
			VALUES (?, ?, ?, 'pending')
		`);
			const result = stmt.run(player1Id, player2Id, gameType);
			reply.send({ success: true, matchId: result.lastInsertRowid });
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({ success: false, message: "Erreur lors de la création du match." });
		}
	});

	fastify.post('/match/score', async (request, reply) => {
		try {
			const { matchId, player1Score, player2Score } = request.body;

			if (!matchId || player1Score === undefined || player2Score === undefined) {
				return reply.status(400).send({ success: false, message: "ID du match et score requis." });
			}

			let winnerId = null;
			const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId);

			if (!match) {
				return reply.status(404).send({ success: false, message: "Match non trouvé." });
			}

			if (player1Score > player2Score)
				winnerId = match.player1_id;
			else if (player2Score > player1Score)
				winnerId = match.player2_id;

			const winnerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(winnerId);
			const safeWinnerId = winnerExists ? winnerId : null;

			db.prepare(`
				UPDATE matches
				SET player1_score = ?, player2_score = ?, winner_id = ?, status = 'completed'
				WHERE id = ?
			`).run(player1Score, player2Score, safeWinnerId, matchId);


			reply.send({ success: true, message: "Score enregistré avec succès." });

		} catch (error) {
			return reply.status(500).send({ success: false, message: "Erreur lors de l'enregistrement du score." });
		}
	});

	fastify.post('/match4', async (request, reply) => {
		const { player1Id, player2Id, player3Id, player4Id, gameType } = request.body;

		if (!player1Id || !player2Id || !player3Id || !player4Id || !gameType)
			return reply.status(400).send({ success: false, message: "IDs des joueurs et type de jeu requis." });

		try {
			const stmt = db.prepare(`
			INSERT INTO matches_4 (player1_id, player2_id, player3_id, player4_id, game_type, status)
			VALUES (?, ?, ?, ?, ?, 'pending')
		`);
			const result = stmt.run(player1Id, player2Id, player3Id, player4Id, gameType);
			reply.send({ success: true, matchId: result.lastInsertRowid });
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({ success: false, message: "Erreur lors de la création du match." });
		}
	});

	fastify.post('/match4/score', async (request, reply) => {
		try {
			const { matchId, player1Score, player2Score, player3Score, player4Score } = request.body;

			if (!matchId || player1Score === undefined || player2Score === undefined || player3Score === undefined || player4Score === undefined) {
				return reply.status(400).send({ success: false, message: "ID du match et score requis." });
			}

			let winnerId = null;
			const match = db.prepare("SELECT * FROM matches_4 WHERE id = ?").get(matchId);

			if (!match) {
				return reply.status(404).send({ success: false, message: "Match non trouvé." });
			}

			const scores = [
				{ id: match.player1_id, score: player1Score },
				{ id: match.player2_id, score: player2Score },
				{ id: match.player3_id, score: player3Score },
				{ id: match.player4_id, score: player4Score },
			];

			scores.sort((a, b) => b.score - a.score);
			winnerId = scores[0].id;

			const winnerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(winnerId);
			const safeWinnerId = winnerExists ? winnerId : null;

			db.prepare(`
				UPDATE matches_4
				SET player1_score = ?, player2_score = ?, player3_score = ?, player4_score = ?, winner_id = ?, status = 'completed'
				WHERE id = ?
			`).run(player1Score, player2Score, player3Score, player4Score, safeWinnerId, matchId);

			reply.send({ success: true, message: "Score enregistré avec succès." });

		} catch (error) {
			return reply.status(500).send({ success: false, message: "Erreur lors de l'enregistrement du score." });
		}
	});


}