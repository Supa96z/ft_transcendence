import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import path from 'path';
import { fileURLToPath } from 'url';
import playerRoutes from "./src/routes/playerRoutes.js";
import scoreRoutes from './src/routes/scoreRoutes.js';
import tournamentRoutes from './src/routes/tournamentRoutes.js';
import setupWebsockets from './src/websockets/index.js';
import fs from 'fs';
import db, { setupDatabase } from './src/db.js';

import dotenv from 'dotenv';
dotenv.config();

// Pour obtenir le __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setupDatabase();

const fastify = Fastify({
	logger: true,
	https: {
		key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
		cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
	}
});

fastify.setErrorHandler((error, request, reply) => {
	fastify.log.error(error);
	reply.status(500).send({
		success: false,
		message: 'Une erreur est survenue sur le serveur'
	});
});

fastify.register(cors, {
	origin: (origin, cb) => {
		const allowedOrigins = ['https://127.0.0.1:3000', 'https://'+process.env.IP+':3000'];
		if (!origin || allowedOrigins.includes(origin)) {
			cb(null, true);
		} else {
			cb(new Error('Not allowed'), false);
		}
	},
	credentials: true
});

fastify.register(fastifyCookie);

fastify.register(fastifySession, {
	secret: process.env.SESSION_SECRET,
	cookie: {
		secure: true,
		httpOnly: true,
	},
	saveUninitialized: false
});

fastify.register(fastifyWebsocket);

// This static plugin serves all your frontend files.
// The path is correct for your structure: from /backend up to / and into /frontend.
fastify.register(fastifyStatic, {
	root: path.join(__dirname, '../frontend'),
	prefix: '/'
});

// Routes
fastify.register(playerRoutes, { prefix: '/api/players' });
fastify.register(scoreRoutes, { prefix: '/api/scores' });
fastify.register(tournamentRoutes, { prefix: '/api/tournaments' });

// Config WebSockets
setupWebsockets(fastify);

// REMOVED the specific fastify.get('/', ...) route as it's no longer needed.

// ADDED this handler to serve index.html for any page that is not an API route or a static file.
// This is the fix for the 404 error on refresh for SPA routes.
fastify.setNotFoundHandler((_request, reply) => {
	return reply.sendFile('index.html');s
});


const start = async () => {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		console.log('Listening on port 3000');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
