import {
	createTournament,
	getTournaments,
	getTournamentById,
	updateTournamentStatus,
	addPlayerToTournament,
	getTournamentPlayers,
	createMatch,
	getTournamentMatches,
	updateMatchScore,
	updateMatchStatus,
	getMatchById
} from "../models/tournamentModel.js";

export default async function tournamentRoutes(fastify) {
	const createTournamentSchema = {
		body: {
			type: 'object',
			properties: {}
		}
	};

	const addPlayerSchema = {
		body: {
			type: 'object',
			required: ['player_id'],
			properties: {
				player_id: {type: 'integer'}
			}
		}
	};

	const createMatchSchema = {
		body: {
			type: 'object',
			required: ['player1_id', 'player2_id'],
			properties: {
				player1_id: {type: 'integer'},
				player2_id: {type: 'integer'}
			}
		}
	};

	const updateScoreSchema = {
		body: {
			type: 'object',
			required: ['player1_score', 'player2_score'],
			properties: {
				player1_id: {type: 'integer', minimum: 0},
				player2_id: {type: 'integer', minimum: 0}
			}
		}
	};

	const updateTournamentStatusSchema = {
		body: {
			type: 'object',
			required: ['status'],
			properties: {
				status: {type: 'string', enum: ['pending', 'active', 'completed']}
			}
		}
	};

	/**
	 * @brief Créer un tournoi.
	 */
	fastify.post('/', createTournamentSchema, async (request, reply) => {
		try {
			const tournamentId = createTournament();

			fastify.websocketServer.clients.forEach(client=> {
				if (client.readyState === 1) {
					client.send(JSON.stringify({
						type: 'TOURNAMENT_CREATED',
						payload: {id: tournamentId}
					}));
				}
			});
			return {success: true, id: tournamentId};
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de créer le tournoi'
			});
		}
	});

	/**
	 * @brief Récupère les tournois.
	 */
	fastify.get('/', async (request, reply) => {
		try {
			const tournaments = getTournaments();
			return {success: true, tournaments};
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer les tournois'
			});
		}
	});

	/**
	 * @brief Récupère un tournoi avec son ID.
	 */
	fastify.get('/:id', async (request, reply) => {
		const { id } = request.params;
		try {
			const tournament = getTournamentById(id);
			if (tournament) {
				return { success: true, tournament };
			} else {
				return reply.status(404).send({
					success: false,
					message: `Tournoi avec l'ID ${id} non trouvé`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer le tournoi'
			});
		}
	});

	/**
	 * @brief Update le status du tournoi.
	 */
	fastify.put('/:id/status', updateTournamentStatusSchema, async (request, reply) => {
		const {id} = request.params;
		const {status} = request.body;

		try {
			const result = updateTournamentStatus(id, status);
			if (result) {
				fastify.websocketServer.clients.forEach(client => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({
							type: 'TOURNAMENT_STATUS_UPDATED',
							payload: {id, status}
						}));
					}
				});

				return {success: true, message: `Status du tournoi ${id} mis à jour: ${status}`};
			} else {
				return reply.status(404).send({
					success: false,
					message: `Tournoi avec l'ID ${id} non trouvé`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de mettre à jour le status du tournoi'
			});
		}
	});

	/**
	 * @brief Ajoute un joueur au tournoi.
	 */
	fastify.post('/:id/players', addPlayerSchema, async (request, reply) => {
		const {id} = request.params;
		const {player_id} = request.body;

		try {
			const result = addPlayerToTournament(player_id, id);
			if (result) {
				fastify.websocketServer.clients.forEach(client => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({
							type: 'PLAYER_ADDED_TO_TOURNAMENT',
							payload: {tournament_id: id, player_id}
						}));
					}
				});

				return {success: true, id: player_id, message: `Joueur ${player_id} ajouté au tournoi ${id}`};
			} else {
				return reply.status(404).send({
					success: false,
					mesage: `Joueur ou tournoi non trouvé`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible d\'ajouter le joueur au tournoi'
			});
		}
	});

	/**
	 * @brief Récupère les joueurs d'un tournoi.
	 */
	fastify.get('/:id/players', async (request, reply) => {
		const {id} = request.params;

		try {
			const players = getTournamentPlayers(id);
			return {success: true, players};
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer les joueurs du tournoi'
			});
		}
	});

	fastify.post('/:id/activate', async (request, reply) => {
		const { id } = request.params;

		try {
			const success = updateTournamentStatus(id, 'active');
				if (success)
					return reply.code(200).send({ message: `Tournament ${id} activated` });
			else
				return reply.code(404).send({ error: 'Tournament not found' });
		} catch (error) {
			return reply.code(500).send({error: 'Internal server error', details: error.message});
		}
	});

	/**
	 * @brief Créer un match dans le tournoi.
	 */
	fastify.post('/:id/matches', createMatchSchema, async (request, reply) => {
		const {id} = request.params;
		const {player1_id, player2_id} = request.body;

		try {
			const matchId = createMatch(id, player1_id, player2_id);

			fastify.websocketServer.clients.forEach(client => {
				if (client.readyState === 1) {
					client.send(JSON.stringify({
						type: 'MATCH_CREATED',
						payload: {tournament_id: id, match: matchId, player1_id, player2_id}
					}));
				}
			});

			return { success: true, matchId: matchId };
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de créer le match'
			});
		}
	});

	/**
	 * @brief Récupère les matchs d'un tournoi.
	 */
	fastify.get('/:id/matches', async (request, reply) => {
		const {id} = request.params;

		try {
			const matches = getTournamentMatches(id);
			return {success: true, matches};
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer les matchs du tournoi'
			});
		}
	});

	/**
	 * @brief Recup le status du match
	 */
	fastify.get('/:id/matches/:matchId/status', async (request, reply) => {
		const { matchId } = request.params;

		try {
			const match = getMatchById(matchId);
			if (match)
				return { success: true, match };
			else {
				return reply.status(404).send({
					success: false,
					message: `Match avec l'ID ${matchId} non trouvé.`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer le status du match.'
			});
		}
	});

	/**
	 * @brief Récupère le gagnant du match
	 */
	fastify.get('/:id/matches/:matchId/winner', async (request, reply) => {
		const { matchId } = request.params;

		try {
			const match = await getMatchById(matchId);
			if (match) {
				return {
					success: true,
					winner_id: match.winner_id
				};
			} else {
				return reply.status(404).send({
					success: false,
					message: `Match avec l'ID ${matchId} non trouvé.`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de récupérer le gagnant du match.'
			});
		}
	});

	/**
	 * @brief Update le core d'un match.
	 */
	fastify.put('/:tournamentId/matches/:matchId/score', updateScoreSchema, async (request, reply) => {
		const {matchId} = request.params;
		const {player1_score, player2_score} = request.body;

		try {
			const result = updateMatchScore(matchId, player1_score, player2_score);
			if (result) {
				fastify.websocketServer.clients.forEach(client => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({
							type: 'MATCH_SCORE_UPDATED',
							payload: {match_id: matchId, player1_score, player2_score}
						}));
					}
				});

				return {success: true, message: `Score du match ${matchId} mis à jour`};
			} else {
				return reply.status(404).send({
					success: false,
					message: `Match avec l'ID ${matchId} non trouvé`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de mettre à jour le score du match'
			});
		}
	});

	/**
	 * @brief Termine un match avec le gagnant.
	 */
	fastify.put('/:tournamentId/matches/:matchId/complete', async (request, reply) => {
		const {matchId} = request.params;
		const {winner_id} = request.body;

		try {
			const result = updateMatchStatus(matchId, 'completed', winner_id);
			if (result) {
				fastify.websocketServer.clients.forEach(client => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({
							type: 'MATCH_COMPLETE',
							payload: {match_id: matchId, winner_id}
						}));
					}
				});

				return {success: true, message: `Match ${matchId} terminé avec le vainqueur ${winner_id}`};
			} else {
				return reply.status(404).send({
					success: false,
					message: `Match avec l'ID ${matchId} non trouvé`
				});
			}
		} catch (error) {
			fastify.log.error(error);
			return reply.status(500).send({
				success: false,
				message: 'Impossible de terminer le match'
			});
		}
	});
}