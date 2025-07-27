import { showHome, startGame } from "./script.js";
import { t } from "../lang/i18n.js"
import {screenReader} from "./screenReader.js";
import {navigate, onNavigate} from "./popstate.js";

enum KeyBindings{
	UP = 87,
	DOWN = 83,
	UP2 = 38,
	DOWN2 = 40
}

const MAX_SCORE = 5;

let isPaused = false; // Variable pour gérer l'état de pause
let pauseDuration = 2000; // Durée de la pause en millisecondes (2 secondes)
let gameOver = false;

export class Game{
	private readonly gameCanvas: HTMLCanvasElement | null;
	private readonly gameContext: CanvasRenderingContext2D | null;
	private gameStartTime: number = Date.now();
	public static keysPressed: boolean[] = [];
	public static player1Score: number = 0;
	public static player2Score: number = 0;
	private readonly player1: Paddle;
	private readonly player2: Paddle2;

	private readonly ball: Ball;

	private cleanupNavigateListener: (() => void) | null = null; // Pour stocker la fonction de désabonnement

	public static ScreenReader = screenReader.getInstance();

	private readonly keydownHandler: (e: KeyboardEvent) => void;
	private readonly keyupHandler: (e: KeyboardEvent) => void;
	private readonly popstateHandler: (e: PopStateEvent) => void;

	constructor() {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
		if (!canvas)
			throw new Error("Element canvas non-trouve");

		this.gameCanvas = canvas;
		this.gameContext = this.gameCanvas.getContext("2d");
		if (!this.gameContext)
			throw new Error("Impossible de récupérer 2D rendering context");

		this.gameContext.font = "30px Orbitron";

		this.keydownHandler = (e) => { Game.keysPressed[e.which] = true; };
		this.keyupHandler = (e) => { Game.keysPressed[e.which] = false; };
		this.popstateHandler = this.handlePopState.bind(this);
		window.addEventListener("keydown", this.keydownHandler);
		window.addEventListener("keyup", this.keyupHandler);
		window.addEventListener("popstate", this.popstateHandler);

		this.cleanupNavigateListener = onNavigate(() => {
			if (!Game.isGameOver()) {
				Game.setGameOver(true);
				this.handlePlayerLeave();
			}
		});

		const paddleWidth:number = 20, paddleHeight:number = 50, ballSize:number = 10, wallOffset:number = 20;

		this.player1 = new Paddle(paddleWidth, paddleHeight, wallOffset, this.gameCanvas.height / 2 - paddleHeight / 2);
		this.player2 = new Paddle2(paddleWidth, paddleHeight, this.gameCanvas.width - (wallOffset + paddleWidth), this.gameCanvas.height / 2 - paddleHeight / 2);

		this.ball = new Ball(ballSize, ballSize, this.gameCanvas.width / 2 - ballSize / 2, this.gameCanvas.height / 2 - ballSize / 2);

		// Check if we're in tournament mode and if players are AI
		const tournamentMode = localStorage.getItem('tournamentMode') === 'true';
		const player1Alias = localStorage.getItem('player1Alias') || '';
		const player2Alias = localStorage.getItem('player2Alias') || '';
		const isPlayer1AI = player1Alias.toLowerCase() === 'ai';
		const isPlayer2AI = player2Alias.toLowerCase() === 'ai';

		// Store AI status in localStorage
		localStorage.setItem('isPlayer1AI', isPlayer1AI.toString());
		localStorage.setItem('isPlayer2AI', isPlayer2AI.toString());

		// Enable AI for player 1 if in tournament mode and player 1 is AI
		if (tournamentMode && isPlayer1AI) {
			Paddle.setAIEnabled(true);
		}

		// Enable AI for player 2 if it is AI
		if (isPlayer2AI) {
			Paddle2.setAIEnabled(true);
		}
	}

	private handlePlayerLeave() {
		const victoryMessageElement = document.getElementById("Pong");
		if (victoryMessageElement) {
			const menu_btn = document.getElementById("menu-btn");
			if (menu_btn) {
				menu_btn.addEventListener("click", () => {
					const lang: any = localStorage.getItem('lang');
					const text: any = localStorage.getItem('textSize');
					const theme: any = localStorage.getItem('theme');

					localStorage.clear()

					// Nettoyer le stockage local si nécessaire
					localStorage.removeItem('currentMatchId');
					localStorage.removeItem("player1Alias");
					localStorage.removeItem("player2Alias");
					localStorage.removeItem("player3Alias");
					localStorage.removeItem("player4Alias");
					localStorage.removeItem('tournamentMode');
					localStorage.removeItem('semifinal1Id');
					localStorage.removeItem('semifinal2Id');
					localStorage.removeItem('semifinal1Winner');
					localStorage.removeItem('semifinal1Loser');
					localStorage.removeItem('semifinal2Winner');
					localStorage.removeItem('semifinal2Loser');
					localStorage.removeItem('player1Id');
					localStorage.removeItem('player2Id');
					localStorage.removeItem('player3Id');
					localStorage.removeItem('player4Id');
					localStorage.removeItem('currentTournamentId');
					localStorage.removeItem('tournamentWinnerAlias');
					localStorage.removeItem('isPlayer1AI');
					localStorage.removeItem('isPlayer2AI');
					Paddle.setAIEnabled(false);
					Paddle2.setAIEnabled(false);

					localStorage.setItem('lang', lang);
					localStorage.setItem('text', text);
					localStorage.setItem('theme', theme);

					navigate('/home');
					showHome();
				});
			}
		}
		Game.setGameOver(true);
	}

	private handlePopState() {
		if (!Game.isGameOver()) {
			Game.setGameOver(true);
		}

		const lang: any = localStorage.getItem('lang');
		const text: any = localStorage.getItem('textSize');
		const theme: any = localStorage.getItem('theme');

		localStorage.clear()

		localStorage.removeItem('currentMatchId');
		localStorage.removeItem("player1Alias");
		localStorage.removeItem("player2Alias");
		localStorage.removeItem("player3Alias");
		localStorage.removeItem("player4Alias");
		localStorage.removeItem('tournamentMode');
		localStorage.removeItem('semifinal1Id');
		localStorage.removeItem('semifinal2Id');
		localStorage.removeItem('semifinal1Winner');
		localStorage.removeItem('semifinal1Loser');
		localStorage.removeItem('semifinal2Winner');
		localStorage.removeItem('semifinal2Loser');
		localStorage.removeItem('player1Id');
		localStorage.removeItem('player2Id');
		localStorage.removeItem('player3Id');
		localStorage.removeItem('player4Id');
		localStorage.removeItem('currentTournamentId');
		localStorage.removeItem('tournamentWinnerAlias');
		localStorage.removeItem('isPlayer1AI');
		localStorage.removeItem('isPlayer2AI');
		Paddle.setAIEnabled(false);
		Paddle2.setAIEnabled(false);

		localStorage.setItem('lang', lang);
		localStorage.setItem('text', text);
		localStorage.setItem('theme', theme);

		if (this.cleanupNavigateListener) {
			this.cleanupNavigateListener();
			this.cleanupNavigateListener = null;
		}
	}

	getCanvasColors() {
		const styles = getComputedStyle(document.body);
		return {
			bgColor: styles.getPropertyValue('--canvas-bg-color').trim() || '#000',
			lineColor: styles.getPropertyValue('--canvas-line-color').trim() || '#fff',
			textColor: styles.getPropertyValue('--canvas-text-color').trim() || '#fff',
			entityColor: styles.getPropertyValue('--canvas-entity-color').trim() || '#fff',
		};
	}

	drawBoardDetails(){
		if (!this.gameContext || !this.gameCanvas)
			return ;

		const { lineColor, textColor } = this.getCanvasColors();

		// Trace les contours du terrain.
		this.gameContext.strokeStyle = lineColor;
		this.gameContext.lineWidth = 5;
		this.gameContext.strokeRect(10,10,this.gameCanvas.width - 20 ,this.gameCanvas.height - 20);

		// Trace la ligne au centre du terrain.
		for (let i = 0; i + 30 < this.gameCanvas.height; i += 30) {
			this.gameContext.fillStyle = lineColor;
			this.gameContext.fillRect(this.gameCanvas.width / 2 - 2, i + 10, 5, 20); // Censé être 2.5 mais vu que pixel = entier, arrondi à 2.
		}

		// Défini les informations du match et des joueurs.
		const currentMatchId = localStorage.getItem('currentMatchId');
		const currentMatchType = localStorage.getItem('currentMatchType');
		const tournamentMode = localStorage.getItem('tournamentMode') === 'true';

		// Récupère les bons noms de joueurs.
		let player1Alias = localStorage.getItem('player1Alias') || 'Joueur 1';
		let player2Alias = localStorage.getItem('player2Alias') || 'Joueur 2';

		// S'assure d'afficher les bons noms en fonction du match lors d'un tournoi.
		if (tournamentMode && currentMatchType) {
			if (currentMatchType === 'final') {
				player1Alias = localStorage.getItem('finalPlayer1Alias') || player1Alias;
				player2Alias = localStorage.getItem('finalPlayer2Alias') || player2Alias;
			} else if (currentMatchType === 'third-place') {
				player1Alias = localStorage.getItem('thirdPlacePlayer1Alias') || player1Alias;
				player2Alias = localStorage.getItem('thirdPlacePlayer2Alias') || player2Alias;
			}
		}

		this.gameContext!.font = "20px Orbitron";
		this.gameContext!.fillStyle = textColor;
		this.gameContext!.textAlign = "center";

		// Affiche le nom des joueurs au-dessus du score.
		this.gameContext!.fillText(player1Alias, this.gameCanvas!.width / 4, 30);
		this.gameContext!.fillText(player2Alias, (3 * this.gameCanvas!.width) / 4, 30);

		// Affiche les scores.
		this.gameContext.textAlign = "center";
		this.gameContext.fillText(Game.player1Score.toString(), this.gameCanvas.width / 4, 55);
		this.gameContext.fillText(Game.player2Score.toString(), (3 * this.gameCanvas.width) / 4, 55);
	}

	draw() {
		if (!this.gameContext || !this.gameCanvas)
			return ;

		const { bgColor } = this.getCanvasColors();

		this.gameContext.fillStyle = bgColor;
		this.gameContext.fillRect(0,0,this.gameCanvas.width,this.gameCanvas.height);

		this.drawBoardDetails();
		this.player1.draw(this.gameContext);
		this.player2.draw(this.gameContext);
		this.ball.draw(this.gameContext);
	}

	update() {
		if (!this.gameCanvas)
			return ;

		this.player1.update(this.gameCanvas, this.ball);
		this.player2.update(this.gameCanvas, this.ball);
		this.ball.update(this.player1, this.player2, this.gameCanvas);
	}

	gameLoop() {
		if (gameOver) return;

		const currentTime = Date.now();
		if (currentTime - this.gameStartTime < pauseDuration) {
			this.draw();
			requestAnimationFrame(() => this.gameLoop());
			return;
		}
		this.update();
		this.draw();
		requestAnimationFrame(() => this.gameLoop());
	}

	public static setGameOver(state: boolean): void {
		gameOver = state;
	}

	public static isGameOver(): boolean {
		return gameOver;
	}

	public cleanup() {
		window.removeEventListener("keydown", this.keydownHandler);
		window.removeEventListener("keyup", this.keyupHandler);
		window.removeEventListener("popstate", this.popstateHandler);
	}

	public static resetGlobalState() {
		gameOver = false;
		isPaused = false;
		// Add any other global/static resets if needed
	}
}

class Entity{
	width:number;
	height:number;
	x:number;
	y:number;
	xVal:number = 0;
	yVal:number = 0;
	constructor(w:number, h:number, x:number, y:number){
		this.width = w;
		this.height = h;
		this.x = x;
		this.y =y;
	}

	private getCanvasColors() {
		const styles = getComputedStyle(document.body);
		return {
			entityColor: styles.getPropertyValue('--canvas-entity-color').trim() || '#fff',
		}
	}

	draw(context: CanvasRenderingContext2D){
		const { entityColor } = this.getCanvasColors();
		context.fillStyle = entityColor;
		context.fillRect(this.x,this.y,this.width,this.height);
	}
}

class Paddle extends Entity{
	private speed:number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerY: number = 0;
	
	// Simulated keyboard state
	private isUpPressed: boolean = false;
	private isDownPressed: boolean = false;
	
	// Movement control
	private targetY: number = 0;
	private approachingBall: boolean = false;

	constructor(w:number, h:number, x:number, y:number){
		super(w,h,x,y);
		this.centerY = y;
		this.targetY = y;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	public static isAIActive(): boolean {
		return this.isAIEnabled;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerY;

		const distanceX = ball.x - this.x;
		const estimatedBallSpeed = 5;
		const timeToReach = Math.abs(distanceX / (ball.xVal * estimatedBallSpeed));
		
		// Initial prediction
		let predictedY = ball.y + (ball.yVal * estimatedBallSpeed * timeToReach);
		
		// Account for bounces
		while (predictedY < 0 || predictedY > canvas.height) {
			if (predictedY < 0) {
				predictedY = Math.abs(predictedY);
			} else if (predictedY > canvas.height) {
				predictedY = canvas.height - (predictedY - canvas.height);
			}
		}
		
		return Math.max(20, Math.min(canvas.height - 20 - this.height, predictedY));
	}

	private updateMovement() {
		const paddleCenter = this.y + this.height / 2;
		const distanceToTarget = this.targetY - paddleCenter;
		const stoppingDistance = 15; // Distance to start slowing down
		
		// Reset both keys
		this.isUpPressed = false;
		this.isDownPressed = false;
		
		if (Math.abs(distanceToTarget) > stoppingDistance) {
			// Move towards target
			if (distanceToTarget < 0) {
				this.isUpPressed = true;
			} else {
				this.isDownPressed = true;
			}
		} else if (this.approachingBall) {
			// Fine adjustment when ball is approaching
			if (Math.abs(distanceToTarget) > 5) {
				if (distanceToTarget < 0) {
					this.isUpPressed = true;
				} else {
					this.isDownPressed = true;
				}
			}
		}
	}

	update(canvas: HTMLCanvasElement, ball?: Ball){
		// Check if we're in tournament mode and if player 1 is AI
		const tournamentMode = localStorage.getItem('tournamentMode') === 'true';
		const isPlayer1AI = localStorage.getItem('isPlayer1AI') === 'true';

		if (tournamentMode && isPlayer1AI && ball) {
			const currentTime = Date.now();
			
			// Update AI decisions every second
			if (currentTime - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = currentTime;
				
				// Check if ball is moving towards AI
				this.approachingBall = ball.xVal < 0;
				
				if (this.approachingBall) {
					// Ball is coming towards us
					if (ball.x < 300) { // Only predict when ball is in our half
						this.targetY = this.predictBallPosition(ball, canvas);
					}
				} else {
					// Ball moving away, return to center if we're far from it
					const paddleCenter = this.y + this.height / 2;
					const distanceToCenter = Math.abs(paddleCenter - this.centerY);
					
					if (distanceToCenter > 50) {
						this.targetY = this.centerY;
					}
				}
			}
			
			// Update movement every frame based on current target
			this.updateMovement();
			
			// Apply simulated keyboard input
			if (this.isUpPressed) {
				this.yVal = -1;
			} else if (this.isDownPressed) {
				this.yVal = 1;
			} else {
				this.yVal = 0;
			}
		} else {
			// Human player control
			if (Game.keysPressed[KeyBindings.UP]){
				this.yVal = -1;
				if (this.y <= 20){
					this.yVal = 0
				}
			}
			else if (Game.keysPressed[KeyBindings.DOWN]){
				this.yVal = +1;
				if (this.y + this.height >= canvas.height - 20){
					this.yVal = 0
				}
			}
			else{
				this.yVal = 0;
			}
		}

		// Apply movement with boundary checks
		if (this.y <= 20 && this.yVal < 0) {
			this.yVal = 0;
		}
		if (this.y + this.height >= canvas.height - 20 && this.yVal > 0) {
			this.yVal = 0;
		}

		this.y += this.yVal * this.speed;
	}
}

export class Paddle2 extends Entity {
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerY: number = 0;
	
	// Simulated keyboard state
	private isUpPressed: boolean = false;
	private isDownPressed: boolean = false;
	
	// Movement control
	private targetY: number = 0;
	private approachingBall: boolean = false;
	
	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerY = y;
		this.targetY = y;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	public static isAIActive(): boolean {
		return this.isAIEnabled;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerY;

		const distanceX = this.x - ball.x;
		const estimatedBallSpeed = 5;
		const timeToReach = distanceX / (ball.xVal * estimatedBallSpeed);
		
		// Initial prediction
		let predictedY = ball.y + (ball.yVal * estimatedBallSpeed * timeToReach);
		
		// Account for bounces
		while (predictedY < 0 || predictedY > canvas.height) {
			if (predictedY < 0) {
				predictedY = Math.abs(predictedY);
			} else if (predictedY > canvas.height) {
				predictedY = canvas.height - (predictedY - canvas.height);
			}
		}
		
		return Math.max(20, Math.min(canvas.height - 20 - this.height, predictedY));
	}

	private updateMovement() {
		const paddleCenter = this.y + this.height / 2;
		const distanceToTarget = this.targetY - paddleCenter;
		const stoppingDistance = 15; // Distance to start slowing down
		
		// Reset both keys
		this.isUpPressed = false;
		this.isDownPressed = false;
		
		if (Math.abs(distanceToTarget) > stoppingDistance) {
			// Move towards target
			if (distanceToTarget < 0) {
				this.isUpPressed = true;
			} else {
				this.isDownPressed = true;
			}
		} else if (this.approachingBall) {
			// Fine adjustment when ball is approaching
			if (Math.abs(distanceToTarget) > 5) {
				if (distanceToTarget < 0) {
					this.isUpPressed = true;
				} else {
					this.isDownPressed = true;
				}
			}
		}
	}

	update(canvas: HTMLCanvasElement, ball?: Ball) {
		if (Paddle2.isAIEnabled && ball) {
			const currentTime = Date.now();
			
			// Update AI decisions every second
			if (currentTime - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = currentTime;
				
				// Check if ball is moving towards AI
				this.approachingBall = ball.xVal > 0;
				
				if (this.approachingBall) {
					// Ball is coming towards us
					if (ball.x > 300) { // Only predict when ball is in our half
						this.targetY = this.predictBallPosition(ball, canvas);
					}
				} else {
					// Ball moving away, return to center if we're far from it
					const paddleCenter = this.y + this.height / 2;
					const distanceToCenter = Math.abs(paddleCenter - this.centerY);
					
					if (distanceToCenter > 50) {
						this.targetY = this.centerY;
					}
				}
			}
			
			// Update movement every frame based on current target
			this.updateMovement();
			
			// Apply simulated keyboard input
			if (this.isUpPressed) {
				this.yVal = -1;
			} else if (this.isDownPressed) {
				this.yVal = 1;
			} else {
				this.yVal = 0;
			}
		} else {
			// Human player control
			if (Game.keysPressed[KeyBindings.UP2]) {
				this.yVal = -1;
			} else if (Game.keysPressed[KeyBindings.DOWN2]) {
				this.yVal = +1;
			} else {
				this.yVal = 0;
			}
		}

		// Apply movement with boundary checks
		if (this.y <= 20 && this.yVal < 0) {
			this.yVal = 0;
		}
		if (this.y + this.height >= canvas.height - 20 && this.yVal > 0) {
			this.yVal = 0;
		}

		this.y += this.yVal * this.speed;
	}
}

class Ball extends Entity {
	private baseSpeed: number = 5;
	private currentSpeed: number = 5;
	private lastSpeedIncreaseTime: number = 0;
	private roundStartTime: number = 0;
	private readonly INITIAL_WAIT_TIME: number = 10000; // Changed from 20000 to 10000 (10 seconds before first increase)
	private readonly SPEED_INCREASE_INTERVAL: number = 5000; // Already at 5 seconds between increases
	private readonly SPEED_INCREASE_AMOUNT: number = 0.5; // Speed increase per interval
	private readonly MAX_SPEED: number = 12; // Maximum speed cap
	private lastTouchedBy: 'player1' | 'player2' | null = null;

	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.resetRound();
	}

	private resetRound() {
		const randomDirection = Math.floor(Math.random() * 2) + 1;
		this.xVal = randomDirection % 2 ? 1 : -1;
		this.yVal = 1;
		this.currentSpeed = this.baseSpeed;
		this.roundStartTime = Date.now();
		this.lastSpeedIncreaseTime = this.roundStartTime;
	}

	private updateSpeed() {
		const currentTime = Date.now();
		const timeSinceStart = currentTime - this.roundStartTime;
		
		// Only start increasing speed after initial wait time
		if (timeSinceStart >= this.INITIAL_WAIT_TIME) {
			const timeSinceLastIncrease = currentTime - this.lastSpeedIncreaseTime;
			
			// Check if it's time for another speed increase
			if (timeSinceLastIncrease >= this.SPEED_INCREASE_INTERVAL) {
				this.lastSpeedIncreaseTime = currentTime;
				
				// Increase speed if not at max
				if (this.currentSpeed < this.MAX_SPEED) {
					this.currentSpeed += this.SPEED_INCREASE_AMOUNT;
				}
			}
		}
	}

	update(player1: Paddle, player2: Paddle2, canvas: HTMLCanvasElement) {
		// If the game is paused, don't update position
		if (isPaused)
			return;

		// Update speed based on time
		this.updateSpeed();

		// Check top wall
		if (this.y <= 10) {
			this.yVal = 1;
			screenReader.getInstance().handleWallHit();
		}

		// Check bottom wall
		if (this.y + this.height >= canvas.height - 10) {
			this.yVal = -1;
			screenReader.getInstance().handleWallHit();
		}

		// Check player 2 goal
		if (this.x <= 0) {
			Game.player2Score += 1;

			screenReader.getInstance().handleScoreP2Hit();

			this.resetPosition(canvas);
			if (!this.checkGameEnd("Joueur 2")) {
			} else
				return;
		}

		// Check player 1 goal
		if (this.x + this.width >= canvas.width) {
			Game.player1Score += 1;

			screenReader.getInstance().handleScoreP1Hit();

			this.resetPosition(canvas);
			if (!this.checkGameEnd("Joueur 1")) {
			} else
				return;
		}

		// Collision with player 1
		if (this.x <= player1.x + player1.width &&
			this.x >= player1.x &&
			this.y + this.height >= player1.y &&
			this.y <= player1.y + player1.height) {
			let relativeY = (this.y + this.height / 2) - (player1.y + player1.height / 2);
			let normalizedY = relativeY / (player1.height / 2);
			this.xVal = 1;
			this.yVal = normalizedY * 1.2;
			this.lastTouchedBy = 'player1';

			screenReader.getInstance().handleLeftPaddleHit();
		}

		// Collision with player 2
		if (this.x + this.width >= player2.x &&
			this.x <= player2.x + player2.width &&
			this.y + this.height >= player2.y &&
			this.y <= player2.y + player2.height) {
			let relativeY = (this.y + this.height / 2) - (player2.y + player2.height / 2);
			let normalizedY = relativeY / (player2.height / 2);
			this.xVal = -1;
			this.yVal = normalizedY * 1.2;
			this.lastTouchedBy = 'player2';

			screenReader.getInstance().handleRightPaddleHit();
		}

		// Ensure constant velocity regardless of direction
		const length = Math.sqrt(this.xVal * this.xVal + this.yVal * this.yVal);
		this.x += (this.xVal / length) * this.currentSpeed;
		this.y += (this.yVal / length) * this.currentSpeed;
	}

	// Reset ball position
	private resetPosition(canvas: HTMLCanvasElement) {
		this.x = canvas.width / 2 - this.width / 2;
		this.y = canvas.height / 2 - this.height / 2;
		isPaused = true;

		// Reset AI states for both paddles
		if (Paddle.isAIActive()) {
			this.lastTouchedBy = null;
			Paddle.setAIEnabled(false);
			setTimeout(() => Paddle.setAIEnabled(true), 0);
		}
		if (Paddle2.isAIActive()) {
			this.lastTouchedBy = null;
			Paddle2.setAIEnabled(false);
			setTimeout(() => Paddle2.setAIEnabled(true), 0);
		}

		setTimeout(() => {
			isPaused = false;
			this.resetRound(); // Reset speed and start time for new round
		}, pauseDuration);
	}

	private async checkGameEnd(winner: string): Promise<boolean> {
		if (Game.player1Score >= MAX_SCORE || Game.player2Score >= MAX_SCORE) {
			// Sauvegarde les scores pour le match actuel.
			const matchId = localStorage.getItem('currentMatchId');
			if (matchId) {
				try {
					const response = await fetch("/api/players/match/score", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							matchId: parseInt(matchId),
							player1Score: Game.player1Score,
							player2Score: Game.player2Score
						}),
					});
					const result = await response.json();
				} catch (error) {}
			}

			// Check si on est dans un tournoi et si un match est en attente.
			const tournamentMode = localStorage.getItem('tournamentMode') === 'true';
			const pendingMatchId = localStorage.getItem('pendingMatchId');
			const semifinal1Id = localStorage.getItem('semifinal1Id');
			const semifinal2Id = localStorage.getItem('semifinal2Id');
			const currentMatchType = localStorage.getItem('currentMatchType');

			// Vérifie d'abord si c'est la finale du tournoi
			if (tournamentMode && currentMatchType === 'final') {
				// Après la finale (dernier match du tournoi)
				const tournamentWinnerAlias = this.getWinnerAlias(winner);
				localStorage.setItem('tournamentWinnerAlias', tournamentWinnerAlias);

				// Afficher le message de victoire du tournoi
				const victoryMessageElement = document.getElementById("Pong");
				if (victoryMessageElement) {
					const screenReaderInstance = screenReader.getInstance();
					screenReaderInstance.announceScore(Game.player1Score, Game.player2Score, null, null);
					screenReaderInstance.speak(`${tournamentWinnerAlias} ${t("tournament_win")}`);

					victoryMessageElement.innerHTML = `
					<p class="font-extrabold">${tournamentWinnerAlias} ${t("tournament_win")}</p>
					<div class="flex justify-center mt-4">
						<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
					</div>
				`;

					const menu_btn = document.getElementById("menu-btn");
					if (menu_btn) {
						menu_btn.addEventListener("click", () => {

							const lang: any = localStorage.getItem('lang');
							const text: any = localStorage.getItem('textSize');
							const theme: any = localStorage.getItem('theme');

							localStorage.clear();

							// Nettoyage du mode tournoi
							localStorage.removeItem('tournamentMode');
							localStorage.removeItem('semifinal1Id');
							localStorage.removeItem('semifinal2Id');
							localStorage.removeItem('semifinal1Winner');
							localStorage.removeItem('semifinal1Loser');
							localStorage.removeItem('semifinal2Winner');
							localStorage.removeItem('semifinal2Loser');
							localStorage.removeItem('player1Id');
							localStorage.removeItem('player2Id');
							localStorage.removeItem('player3Id');
							localStorage.removeItem('player4Id');
							localStorage.removeItem('currentTournamentId');
							localStorage.removeItem('tournamentWinnerAlias');
							localStorage.removeItem('finalPlayer1Alias');
							localStorage.removeItem('finalPlayer2Alias');
							localStorage.removeItem('thirdPlacePlayer1Alias');
							localStorage.removeItem('thirdPlacePlayer2Alias');
							localStorage.removeItem('pendingMatchId');
							localStorage.removeItem('currentMatchType');
							localStorage.removeItem('pendingMatchType');
							localStorage.removeItem('currentMatchId');
							localStorage.removeItem('isPlayer1AI');
							localStorage.removeItem('isPlayer2AI');
							Paddle.setAIEnabled(false);
							Paddle2.setAIEnabled(false);

							localStorage.setItem('lang', lang);
							localStorage.setItem('text', text);
							localStorage.setItem('theme', theme);

							navigate('/home');
							showHome();
						});
					}
				}

				gameOver = true;
				return true;
			}
			else if (tournamentMode && pendingMatchId) {
				// S'affiche lorsqu'un autre match est encore en attente.
				const victoryMessageElement = document.getElementById("Pong");
				if (victoryMessageElement) {
					const winnerAlias = this.getWinnerAlias(winner);

					const screenReaderInstance = screenReader.getInstance();
					screenReaderInstance.announceScore(Game.player1Score, Game.player2Score, null, null);
					screenReaderInstance.speak(`${winnerAlias} ${t("as_won")}`);

					victoryMessageElement.innerHTML = `
					<p class="font-extrabold">${this.getWinnerAlias(winner)} ${t("as_won")}</p>
					<p>${t("?next_match")}</p>
					<div class="flex justify-center mt-4">
						<button id="next-match-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("next_match_btn")}</button>
					</div>
				`;

					const nextMatchBtn = document.getElementById("next-match-btn");
					if (nextMatchBtn) {
						nextMatchBtn.addEventListener("click", async () => {
							try {
								// Sauvegarde le gagnant du match actuel.
								if (matchId === semifinal1Id) {
									localStorage.setItem('semifinal1Winner', winner === 'Joueur 1' ?
										localStorage.getItem('player1Id') || '' :
										localStorage.getItem('player2Id') || '');
									localStorage.setItem('semifinal1Loser', winner === 'Joueur 1' ?
										localStorage.getItem('player2Id') || '' :
										localStorage.getItem('player1Id') || '');

									// Set le match en attente en tant que match actuel.
									localStorage.setItem('currentMatchId', pendingMatchId);

									// Met à jour les noms des joueurs pour le prochain match.
									localStorage.setItem('player1Alias', localStorage.getItem('player3Alias') || 'Joueur 3');
									localStorage.setItem('player2Alias', localStorage.getItem('player4Alias') || 'Joueur 4');

									// Met à jour les infos AI pour le prochain match.
									const player3Id = localStorage.getItem('player3Id') || '';
									const player4Id = localStorage.getItem('player4Id') || '';
									await updateAIStatus(player3Id, player4Id);

									// Reset l'état du jeu.
									Game.player1Score = 0;
									Game.player2Score = 0;
									Game.setGameOver(false);

									// Démarre le prochain match.
									startGame(2, 'normal');
								} else if (matchId === semifinal2Id) {
									// Stock le gagnant de la semi-finale.
									localStorage.setItem('semifinal2Winner', winner === 'Joueur 1' ?
										localStorage.getItem('player3Id') || '' :
										localStorage.getItem('player4Id') || '');
									localStorage.setItem('semifinal2Loser', winner === 'Joueur 1' ?
										localStorage.getItem('player4Id') || '' :
										localStorage.getItem('player3Id') || '');

									// Créer les matchs finaux après cette semi-finale.
									const currentTournamentId = localStorage.getItem('currentTournamentId');
									if (currentTournamentId) {
										try {
											// Récupère les gagnants des deux semi-finales.
											const semifinal1Winner = localStorage.getItem('semifinal1Winner') || '';
											const semifinal2Winner = localStorage.getItem('semifinal2Winner') || '';
											const semifinal1Loser = localStorage.getItem('semifinal1Loser') || '';
											const semifinal2Loser = localStorage.getItem('semifinal2Loser') || '';

											// Créer la finale (gagnants).
											const finalMatchResponse = await fetch(`/api/tournaments/${currentTournamentId}/matches`, {
												method: 'POST',
												headers: {'Content-Type': 'application/json'},
												body: JSON.stringify({
													player1_id: semifinal1Winner,
													player2_id: semifinal2Winner,
													round: 'final',
													match_number: 3,
													gameType: 'pong'
												})
											});

											const finalMatchData = await finalMatchResponse.json();

											// Créer le match de la troisième place (perdants).
											const thirdPlaceMatchResponse = await fetch(`/api/tournaments/${currentTournamentId}/matches`, {
												method: 'POST',
												headers: {'Content-Type': 'application/json'},
												body: JSON.stringify({
													player1_id: semifinal1Loser,
													player2_id: semifinal2Loser,
													round: 'third-place',
													match_number: 4,
													gameType: 'pong'
												})
											});

											const thirdPlaceMatchData = await thirdPlaceMatchResponse.json();

											// Récupère le nom des joueurs pour les deux nouveaux matchs.
											const winner1Name = await getAliasById(semifinal1Winner);
											const winner2Name = await getAliasById(semifinal2Winner);
											const loser1Name = await getAliasById(semifinal1Loser);
											const loser2Name = await getAliasById(semifinal2Loser);

											// Stock le nom des joueurs pour la finale.
											localStorage.setItem("finalPlayer1Alias", winner1Name);
											localStorage.setItem("finalPlayer2Alias", winner2Name);

											// Stock le nom des joueurs pour le match de la troisième place.
											localStorage.setItem("thirdPlacePlayer1Alias", loser1Name);
											localStorage.setItem("thirdPlacePlayer2Alias", loser2Name);

											// Setup du match pour la 3ème place d'abord.
											localStorage.setItem("currentMatchId", thirdPlaceMatchData.matchId.toString());
											localStorage.setItem("pendingMatchId", finalMatchData.matchId.toString());
											localStorage.setItem("currentMatchType", "third-place");
											localStorage.setItem("pendingMatchType", "final");

											// Met à jour les noms des joueurs pour le match de la 3ème place.
											localStorage.setItem('player1Alias', loser1Name);
											localStorage.setItem('player2Alias', loser2Name);

											// Met a jour les infos AI pour le match de 3ème place.
											await updateAIStatus(semifinal1Loser, semifinal2Loser);

											// Reset l'état du jeu.
											Game.player1Score = 0;
											Game.player2Score = 0;
											Game.setGameOver(false);

											// Démarre le match pour la 3ème place.
											startGame(2, 'normal');
										} catch (error) {}
									}
								} else if (currentMatchType === 'third-place') {
									// Après le match pour la 3ème place, on lance la finale.
									localStorage.setItem('currentMatchId', localStorage.getItem('pendingMatchId') || '');
									localStorage.removeItem('pendingMatchId');
									localStorage.setItem('currentMatchType', 'final');
									localStorage.removeItem('pendingMatchType');

									// Met à jour le nom des joueurs pour la finale.
									localStorage.setItem('player1Alias', localStorage.getItem('finalPlayer1Alias') || 'Joueur 1');
									localStorage.setItem('player2Alias', localStorage.getItem('finalPlayer2Alias') || 'Joueur 2');

									// Met à jour les infos AI pour la finale.
									const semifinal1Winner = localStorage.getItem('semifinal1Winner') || '';
									const semifinal2Winner = localStorage.getItem('semifinal2Winner') || '';
									await updateAIStatus(semifinal1Winner, semifinal2Winner);

									// Reset l'état du jeu.
									Game.player1Score = 0;
									Game.player2Score = 0;
									Game.setGameOver(false);

									// Démarre la finale.
									startGame(2, 'normal');
								}
							} catch (error) {}
						});
					}
				}
			} else {
				// Fin de match normal (hors tournoi).
				const victoryMessageElement = document.getElementById("Pong");
				if (victoryMessageElement) {
					const winnerAlias = this.getWinnerAlias(winner);

					const screenReaderInstance = screenReader.getInstance();
					screenReaderInstance.announceScore(Game.player1Score, Game.player2Score, null, null);
					screenReaderInstance.speak(`${winnerAlias} ${t("as_won")}`);

					victoryMessageElement.innerHTML = `
					<p class="font-extrabold">${this.getWinnerAlias(winner)} ${t("as_won")}</p>
					<div class="flex justify-center">
						<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
					</div>
				`;

					// Nettoie le localStorage.
					const menu_btn = document.getElementById("menu-btn");
					if (menu_btn) {
						menu_btn.addEventListener("click", () => {
							localStorage.removeItem('currentMatchId');
							localStorage.removeItem("player1Alias");
							localStorage.removeItem("player2Alias");
							localStorage.removeItem("player3Alias");
							localStorage.removeItem("player4Alias");
							localStorage.removeItem('isPlayer1AI');
							localStorage.removeItem('isPlayer2AI');
							Paddle.setAIEnabled(false);
							Paddle2.setAIEnabled(false);
							navigate('/home');
							showHome();
						});
					}
				}
			}

			gameOver = true;
			return true;
		}
		return false;
	}

	private getWinnerAlias(winner: string): string {
		if (winner === 'Joueur 1')
			return localStorage.getItem('player1Alias') || 'Joueur 1';
		else
			return localStorage.getItem('player2Alias') || 'Joueur 2';
	}
}

async function getAliasById(playerId: string | null): Promise<string> {
	if (!playerId) {
		return "Joueur ?";
	}

	try {
		const res = await fetch(`/api/players/${playerId}`);
		if (!res.ok)
			throw new Error(`API error: ${res.status}`);

		const data = await res.json();

		if (data.success && data.player && data.player.name) {
			return data.player.name;
		} else {
			return "Joueur ?";
		}
	} catch (e) {
		return "Joueur ?";
	}
}

/**
 * @brief Récupère les infos AI d'un joueur.
 * @param playerId id du joueur.
 */
async function getPlayerAIStatus(playerId: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/players/${playerId}`);
		const playerData = await response.json();
		return playerData.isAI || false; // Supposant que l'API retourne cette info
	} catch (error) {
		console.error("Erreur lors de la récupération du statut AI:", error);
		return false;
	}
}

/**
 * @brief Met a jour les infos AI d'un joueur.
 * @param player1Id id du joueur 1.
 * @param player2Id id du joueur 2.
 */
async function updateAIStatus(player1Id: string, player2Id: string) {
	const player1IsAI = await getPlayerAIStatus(player1Id);
	const player2IsAI = await getPlayerAIStatus(player2Id);

	localStorage.setItem('isPlayer1AI', player1IsAI.toString());
	localStorage.setItem('isPlayer2AI', player2IsAI.toString());

	// Mettre à jour les paddles
	Paddle.setAIEnabled(player1IsAI);
	Paddle2.setAIEnabled(player2IsAI);
}