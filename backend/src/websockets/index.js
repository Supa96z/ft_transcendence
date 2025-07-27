export default function setupWebsockets(fastify) {
	fastify.register(async function (fastify) {
		fastify.get('/ws/game', { websocket: true }, (connection, req) => {
			connection.socket.on('message', message => {
				const data = JSON.parse(message.toString());

				try {
					const data = JSON.parse(message.toString());
					// Gestion des différents types de messages
					switch (data.type) {
						case 'join':
							connection.socket.send(JSON.stringify({
								type: 'join_ack',
								message: `Bienvenue ${data.alias}.`
							}));
							break;
						case 'move':
							break;
						case 'matchmaking':
							break;
						default:
							connection.socket.send(JSON.stringify({
								type: 'error',
								message: 'Type de message inconnu.'
							}));
					}
				} catch (error) {
					connection.socket.send(JSON.stringify({
						type: 'error',
						message: 'Données invalides.'
					}));
				}
			});

			connection.socket.on('close', () => {});
		});
	});
};
