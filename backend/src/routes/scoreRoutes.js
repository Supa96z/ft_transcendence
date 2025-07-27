import {
	getMatchHistoryPong,
	getMatchHistoryFourPong,
	getMatchHistoryPfc,
} from "../models/scoreModel.js";

export default async function scoreRoutes(fastify) {
	fastify.post('/history/pong', async (request, reply) => {
		try {
			const matches = getMatchHistoryPong();
			return { success: true, matches };
		} catch (error) {
			fastify.log.error(error);
			reply.status(500).send({
				success: false,
				message: "Impossible de récupérer l'historique des matchs pong.",
			});
		}
	});

	fastify.post('/history/fourpong', async (request, reply) => {
		try {
			const matches = getMatchHistoryFourPong();
			return { success: true, matches };
		} catch (error) {
			fastify.log.error(error);
			reply.status(500).send({
				success: false,
				message: "Impossible de récupérer l'historique des matchs pong 4 joueurs.",
			});
		}
	});

	fastify.post('/history/pfc', async (request, reply) => {
		try {
			const matches = getMatchHistoryPfc();
			return { success: true, matches };
		} catch (error) {
			fastify.log.error(error);
			reply.status(500).send({
				success: false,
				message: "Impossible de récupérer l'historique des matchs chifoumi.",
			});
		}
	});
}