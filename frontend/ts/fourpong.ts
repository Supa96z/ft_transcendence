import { t } from "../lang/i18n.js"
import {screenReader} from "./screenReader.js";
import {navigate, onNavigate} from "./popstate.js";
import {showHome} from "./script.js";

enum KeyBindings{
	UPONE = 87, //W
	DOWNONE = 83, //S
	UPTWO = 38, //Flèche haut
	DOWNTWO = 40, //Flèche bas
	RIGHTONE = 79, //O
	LEFTONE = 73, //I
	RIGHTTWO = 86, //V
	LEFTTWO = 67 //C
}

const MAX_SCORE = 5;

let isPaused = false; // Variable pour gérer l'état de pause
let pauseDuration = 2000; // Durée de la pause en millisecondes (2 secondes)
let gameOver = false;

export class GameFour {
	private readonly gameCanvas: HTMLCanvasElement | null;
	private readonly gameContext: CanvasRenderingContext2D | null;
	private gameStartTime: number = Date.now();
	private lastFrameTime: number = 0;
	private readonly frameInterval: number = 1000 / 60;
	private readonly cachedColors: any = null;
	public static keysPressed: boolean[] = [];
	public static player1Score: number = 0;
	public static player2Score: number = 0;
	public static player3Score: number = 0;
	public static player4Score: number = 0;
	private readonly player1: Paddle;
	private readonly player2: Paddle2;
	private readonly player3: Paddle3;
	private readonly player4: Paddle4;

	private readonly ball: Ball;

	public static ScreenReader = screenReader.getInstance();

	private readonly keydownHandler: (e: KeyboardEvent) => void;
	private readonly keyupHandler: (e: KeyboardEvent) => void;
	private readonly popstateHandler: (e: PopStateEvent) => void;

	public static resetGameState(): void {
		GameFour.player1Score = 0;
		GameFour.player2Score = 0;
		GameFour.player3Score = 0;
		GameFour.player4Score = 0;
		GameFour.keysPressed = [];
		gameOver = false;
		isPaused = false;
	}

	public static resetGlobalState() {
		gameOver = false;
		isPaused = false;
		// Add any other global/static resets if needed
	}

	constructor(){
		GameFour.resetGameState();  // Reset state when creating new game

		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
		if (!canvas)
			throw new Error("Element canvas non-trouve");

		this.gameCanvas = canvas;
		this.gameContext = this.gameCanvas.getContext("2d");
		if (!this.gameContext)
			throw new Error("Impossible de récupérer 2D rendering context");

		this.gameContext.font = "30px Orbitron";

		// Cache colors on init
		this.cachedColors = this.getCanvasColors();

		this.keydownHandler = (e) => { GameFour.keysPressed[e.which] = true; };
		this.keyupHandler = (e) => { GameFour.keysPressed[e.which] = false; };
		this.popstateHandler = this.handlePopState.bind(this);
		window.addEventListener("keydown", this.keydownHandler);
		window.addEventListener("keyup", this.keyupHandler);
		window.addEventListener("popstate", this.popstateHandler);

		let paddleWidth:number = 15, paddleHeight:number = 50, ballSize:number = 10, wallOffset:number = 20;

		this.player1 = new Paddle(paddleWidth, paddleHeight, wallOffset, this.gameCanvas.height / 2 - paddleWidth / 2 - paddleHeight / 2);
		this.player2 = new Paddle2(paddleWidth, paddleHeight, this.gameCanvas.width - (wallOffset + paddleWidth), this.gameCanvas.height / 2 - paddleHeight / 2);
		this.player3 = new Paddle3(paddleHeight, paddleWidth, this.gameCanvas.width / 2 - paddleHeight / 2, wallOffset);
		this.player4 = new Paddle4(paddleHeight, paddleWidth, this.gameCanvas.width / 2 - paddleHeight / 2, this.gameCanvas.height - (wallOffset + paddleWidth));
		this.ball = new Ball(ballSize, ballSize, 0, 0, this.gameCanvas.width, this.gameCanvas.height);

		this.cleanupNavigateListener = onNavigate(() => {
			if (!GameFour.isGameOver()) {
				GameFour.setGameOver(true);
				this.handlePlayerLeave();
			}
		});
	}

	private cleanupNavigateListener: (() => void) | null = null; // Pour stocker la fonction de désabonnement

	private handlePlayerLeave() {
		const victoryMessageElement = document.getElementById("");
		if (victoryMessageElement) {
			const menu_btn = document.getElementById("menu-btn");
			if (menu_btn) {
				menu_btn.addEventListener("click", () => {
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
					localStorage.removeItem('isPlayer2AI');
					localStorage.removeItem('isPlayer3AI');
					localStorage.removeItem('isPlayer4AI');
					Paddle2.setAIEnabled(false);
					Paddle3.setAIEnabled(false);
					Paddle4.setAIEnabled(false);
					navigate('/home');
					showHome();
				});
			}
		}
		GameFour.setGameOver(true);
	}

	private handlePopState() {
		if (!GameFour.isGameOver()) {
			GameFour.setGameOver(true);
		}

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
		localStorage.removeItem('isPlayer2AI');
		localStorage.removeItem('isPlayer3AI');
		localStorage.removeItem('isPlayer4AI');
		Paddle2.setAIEnabled(false);
		Paddle3.setAIEnabled(false);
		Paddle4.setAIEnabled(false);

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

		const { lineColor, textColor } = this.cachedColors;

		// Trace les contours du terrain.
		this.gameContext.strokeStyle = lineColor;
		this.gameContext.lineWidth = 5;
		this.gameContext.strokeRect(10,10,this.gameCanvas.width - 20 ,this.gameCanvas.height - 20);

		// Affiche la couleur.
		for (let i = 0; i + 30 < this.gameCanvas.height; i += 30) {
			this.gameContext.fillStyle = lineColor;
		}

		// Affiche noms des joueurs.
		const player1Alias = localStorage.getItem('player1Alias') || 'Joueur 1';
		const player2Alias = localStorage.getItem('player2Alias') || 'Joueur 2';
		const player3Alias = localStorage.getItem('player3Alias') || 'Joueur 3';
		const player4Alias = localStorage.getItem('player4Alias') || 'Joueur 4';

		this.gameContext!.font = "20px Orbitron";
		this.gameContext!.fillStyle = textColor;
		this.gameContext!.textAlign = "center";

		// Position des noms des joueurs.
		this.gameContext.fillText(player1Alias, this.gameCanvas.width / 3, (this.gameCanvas.height / 2) - 25);
		this.gameContext.fillText(player2Alias, (3 * this.gameCanvas.width) / 4.60, (this.gameCanvas.height / 2) - 25);
		this.gameContext.fillText(player3Alias, this.gameCanvas.width / 2, (this.gameCanvas.height / 4) - 25);
		this.gameContext.fillText(player4Alias, this.gameCanvas.width / 2, ((3 * this.gameCanvas.height) / 4) - 25);

		// Affiche les scores.
		this.gameContext.textAlign = "center";
		this.gameContext.fillText(GameFour.player1Score.toString(), this.gameCanvas.width / 3, this.gameCanvas.height / 2);
		this.gameContext.fillText(GameFour.player2Score.toString(), (3 * this.gameCanvas.width) / 4.60, this.gameCanvas.height / 2);
		this.gameContext.fillText(GameFour.player3Score.toString(), this.gameCanvas.width / 2, this.gameCanvas.height / 4);
		this.gameContext.fillText(GameFour.player4Score.toString(), this.gameCanvas.width / 2, (3 * this.gameCanvas.height) / 4);


	}

	draw(){
		if (!this.gameContext || !this.gameCanvas)
			return ;

		const { bgColor } = this.cachedColors;

		this.gameContext.fillStyle = bgColor;
		this.gameContext.fillRect(0,0,this.gameCanvas.width,this.gameCanvas.height);

		this.drawBoardDetails();
		this.player1.draw(this.gameContext);
		this.player2.draw(this.gameContext);
		this.player3.draw(this.gameContext);
		this.player4.draw(this.gameContext);
		this.ball.draw(this.gameContext);
	}

	update(){
		if (!this.gameCanvas)
			return ;

		this.player1.update(this.gameCanvas);
		this.player2.update(this.gameCanvas, this.ball);
		this.player3.update(this.gameCanvas, this.ball);
		this.player4.update(this.gameCanvas, this.ball);
		this.ball.update(this.player1, this.player2, this.player3, this.player4, this.gameCanvas);
	}

	gameLoop = () => {
		if (gameOver) return;

		const currentTime = Date.now();
		if (currentTime - this.gameStartTime < pauseDuration) {

			this.draw();
			requestAnimationFrame(this.gameLoop);
			return;
		}

		const deltaTime = currentTime - this.lastFrameTime;
		if (deltaTime > this.frameInterval) {
			this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
			this.update();
			this.draw();
		}

		requestAnimationFrame(this.gameLoop);
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

	constructor(w:number, h:number, x:number, y:number){
		super(w,h,x,y);
	}

	update(canvas: HTMLCanvasElement){
		if (GameFour.keysPressed[KeyBindings.UPONE]){
			this.yVal = -1;
			if (this.y <= 20){
				this.yVal = 0
			}
		}
		else if (GameFour.keysPressed[KeyBindings.DOWNONE]){
			this.yVal = +1;
			if (this.y + this.height >= canvas.height - 20){
				this.yVal = 0
			}
		}
		else
			this.yVal = 0;

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

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerY;

		const currentBallSpeed = ball.getSpeed(); // Ou Math.sqrt(ball.xVal² + ball.yVal²)

		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;

		// Simulate ball movement until it reaches our x-position
		while (predictedX < this.x && predictedX > 0) {
			// Update predicted position
			predictedX += velocityX * currentBallSpeed;
			predictedY += velocityY * currentBallSpeed;

			// Account for bounces off top/bottom walls only
			if (predictedY < 0) {
				predictedY = Math.abs(predictedY);
				velocityY *= -1;
			} else if (predictedY > canvas.height) {
				predictedY = canvas.height - (predictedY - canvas.height);
				velocityY *= -1;
			}
		}

		return Math.max(20, Math.min(canvas.height - 20 - this.height, predictedY));
	}

	private updateMovement() {
		const paddleCenter = this.y + this.height / 2;
		const distanceToTarget = this.targetY - paddleCenter;
		const deadzone = 5; // Add deadzone to prevent wiggling

		// Reset both keys
		this.isUpPressed = false;
		this.isDownPressed = false;

		// Only move if we're outside the deadzone
		if (Math.abs(distanceToTarget) > deadzone) {
			if (distanceToTarget < 0) {
				this.isUpPressed = true;
			} else {
				this.isDownPressed = true;
			}
		}
	}

	update(canvas: HTMLCanvasElement, ball?: Ball) {
		if (Paddle2.isAIEnabled && ball && !isPaused) {
			const currentTime = Date.now();

			if (currentTime - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = currentTime;
				this.approachingBall = ball.xVal > 0;

				if (this.approachingBall) {
					// Always predict when ball is moving towards us
					this.targetY = this.predictBallPosition(ball, canvas);
				} else {
					// Return to center more aggressively
					const paddleCenter = this.y + this.height / 2;
					const distanceToCenter = Math.abs(paddleCenter - this.centerY);

					if (distanceToCenter > 20) { // More aggressive return to center
						this.targetY = this.centerY;
					}
				}
			}

			this.updateMovement();

			if (this.isUpPressed) {
				this.yVal = -1;
			} else if (this.isDownPressed) {
				this.yVal = 1;
			} else {
				this.yVal = 0;
			}
		} else {
			if (GameFour.keysPressed[KeyBindings.UPTWO]) {
				this.yVal = -1;
			} else if (GameFour.keysPressed[KeyBindings.DOWNTWO]) {
				this.yVal = 1;
			} else {
				this.yVal = 0;
			}
		}

		if (this.yVal < 0 && this.y <= 20) {
			this.yVal = 0;
		}
		if (this.yVal > 0 && this.y + this.height >= canvas.height - 20) {
			this.yVal = 0;
		}

		this.y += this.yVal * this.speed;
	}
}

export class Paddle3 extends Entity {
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerX: number = 0;

	// Simulated keyboard state
	private isLeftPressed: boolean = false;
	private isRightPressed: boolean = false;

	// Movement control
	private targetX: number = 0;
	private approachingBall: boolean = false;

	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerX = x;
		this.targetX = x;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerX;

		const currentBallSpeed = ball.getSpeed(); // Ou Math.sqrt(ball.xVal² + ball.yVal²)

		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;

		// Simulate ball movement until it reaches our y-position
		while (predictedY > this.y && predictedY < canvas.height) {
			// Update predicted position
			predictedX += velocityX * currentBallSpeed;
			predictedY += velocityY * currentBallSpeed;

			// Account for bounces off left/right walls only
			if (predictedX < 0) {
				predictedX = Math.abs(predictedX);
				velocityX *= -1;
			} else if (predictedX > canvas.width) {
				predictedX = canvas.width - (predictedX - canvas.width);
				velocityX *= -1;
			}
		}

		return Math.max(20, Math.min(canvas.width - 20 - this.width, predictedX));
	}

	private updateMovement() {
		const paddleCenter = this.x + this.width / 2;
		const distanceToTarget = this.targetX - paddleCenter;
		const deadzone = 5; // Add deadzone to prevent wiggling

		// Reset both keys
		this.isLeftPressed = false;
		this.isRightPressed = false;

		// Only move if we're outside the deadzone
		if (Math.abs(distanceToTarget) > deadzone) {
			if (distanceToTarget < 0) {
				this.isLeftPressed = true;
			} else {
				this.isRightPressed = true;
			}
		}
	}

	update(canvas: HTMLCanvasElement, ball?: Ball) {
		if (Paddle3.isAIEnabled && ball && !isPaused) {
			const currentTime = Date.now();

			if (currentTime - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = currentTime;
				this.approachingBall = ball.yVal < 0;

				if (this.approachingBall) {
					// Always predict when ball is moving towards us
					this.targetX = this.predictBallPosition(ball, canvas);
				} else {
					// Return to center more aggressively
					const paddleCenter = this.x + this.width / 2;
					const distanceToCenter = Math.abs(paddleCenter - this.centerX);

					if (distanceToCenter > 20) { // More aggressive return to center
						this.targetX = this.centerX;
					}
				}
			}

			this.updateMovement();

			if (this.isLeftPressed) {
				this.xVal = -1;
			} else if (this.isRightPressed) {
				this.xVal = 1;
			} else {
				this.xVal = 0;
			}
		} else {
			if (GameFour.keysPressed[KeyBindings.LEFTONE]) {
				this.xVal = -1;
			} else if (GameFour.keysPressed[KeyBindings.RIGHTONE]) {
				this.xVal = 1;
			} else {
				this.xVal = 0;
			}
		}

		if (this.xVal < 0 && this.x <= 20) {
			this.xVal = 0;
		}
		if (this.xVal > 0 && this.x + this.width >= canvas.width - 20) {
			this.xVal = 0;
		}

		this.x += this.xVal * this.speed;
	}
}

export class Paddle4 extends Entity {
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerX: number = 0;

	// Simulated keyboard state
	private isLeftPressed: boolean = false;
	private isRightPressed: boolean = false;

	// Movement control
	private targetX: number = 0;
	private approachingBall: boolean = false;

	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerX = x;
		this.targetX = x;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerX;

		const currentBallSpeed = ball.getSpeed(); // Ou Math.sqrt(ball.xVal² + ball.yVal²)

		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;

		// Simulate ball movement until it reaches our y-position (paddle du haut)
		while (predictedY < this.y && predictedY > 0) {
			// Update predicted position
			predictedX += velocityX * currentBallSpeed;
			predictedY += velocityY * currentBallSpeed;

			// Account for bounces off left/right walls only
			if (predictedX < 0) {
				predictedX = Math.abs(predictedX);
				velocityX *= -1;
			} else if (predictedX > canvas.width) {
				predictedX = canvas.width - (predictedX - canvas.width);
				velocityX *= -1;
			}
		}

		return Math.max(20, Math.min(canvas.width - 20 - this.width, predictedX));
	}

	private updateMovement() {
		const paddleCenter = this.x + this.width / 2;
		const distanceToTarget = this.targetX - paddleCenter;
		const deadzone = 5; // Add deadzone to prevent wiggling

		// Reset both keys
		this.isLeftPressed = false;
		this.isRightPressed = false;

		// Only move if we're outside the deadzone
		if (Math.abs(distanceToTarget) > deadzone) {
			if (distanceToTarget < 0) {
				this.isLeftPressed = true;
			} else {
				this.isRightPressed = true;
			}
		}
	}

	update(canvas: HTMLCanvasElement, ball?: Ball) {
		if (Paddle4.isAIEnabled && ball && !isPaused) {
			const currentTime = Date.now();

			if (currentTime - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = currentTime;
				this.approachingBall = ball.yVal > 0;

				if (this.approachingBall) {
					// Always predict when ball is moving towards us
					this.targetX = this.predictBallPosition(ball, canvas);
				} else {
					// Return to center more aggressively
					const paddleCenter = this.x + this.width / 2;
					const distanceToCenter = Math.abs(paddleCenter - this.centerX);

					if (distanceToCenter > 20) { // More aggressive return to center
						this.targetX = this.centerX;
					}
				}
			}

			this.updateMovement();

			if (this.isLeftPressed) {
				this.xVal = -1;
			} else if (this.isRightPressed) {
				this.xVal = 1;
			} else {
				this.xVal = 0;
			}
		} else {
			if (GameFour.keysPressed[KeyBindings.LEFTTWO]) {
				this.xVal = -1;
			} else if (GameFour.keysPressed[KeyBindings.RIGHTTWO]) {
				this.xVal = 1;
			} else {
				this.xVal = 0;
			}
		}

		if (this.xVal < 0 && this.x <= 20) {
			this.xVal = 0;
		}
		if (this.xVal > 0 && this.x + this.width >= canvas.width - 20) {
			this.xVal = 0;
		}

		this.x += this.xVal * this.speed;
	}
}

class Ball extends Entity{
	private baseSpeed: number = 5;
	private speed: number = this.baseSpeed;
	private currentSpeed: number = 5;
	private lastSpeedIncreaseTime: number = 0;
	private readonly INITIAL_WAIT_TIME: number = 10000; // Changed from 20000 to 10000 (10 seconds before first increase)
	private readonly SPEED_INCREASE_INTERVAL: number = 5000; // Already at 5 seconds between increases
	private readonly SPEED_INCREASE_AMOUNT: number = 0.5; // Speed increase per interval
	private readonly MAX_SPEED: number = 12; // Maximum speed cap
	private roundStartTime: number = 0;
	private readonly canvasWidth: number;
	private readonly canvasHeight: number;

	constructor(w: number, h: number, x: number, y: number, canvasWidth: number, canvasHeight: number) {
		super(w, h, x, y);
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.resetBallPosition();
	}

	public getSpeed(): number {
		return this.speed;
	}

	// Fonction pour réinitialiser la position de la balle apres un but.
	resetBallPosition() {
		let margin = 50;
		this.x = this.canvasWidth / 2 - this.width / 2 + (Math.random() * margin - margin / 2);
		this.y = this.canvasHeight / 2 - this.height / 2 + (Math.random() * margin - margin / 2);

		let randomDirection = Math.floor(Math.random() * 2) + 1;
		this.xVal = randomDirection % 2 ? 1 : -1;
		this.yVal = (Math.random() * 2 - 1) * 2;

		// Reset speed and timers for the new round
		this.currentSpeed = this.baseSpeed;
		this.roundStartTime = Date.now();
		this.lastSpeedIncreaseTime = this.roundStartTime;
	}

	async checkGameEnd(): Promise<boolean> {
		const highestScore = Math.max(
			GameFour.player1Score,
			GameFour.player2Score,
			GameFour.player3Score,
			GameFour.player4Score
		);

		if (highestScore >= MAX_SCORE) {
			// Determiner le gagnant.
			let winner = "";
			if (GameFour.player1Score >= MAX_SCORE) winner = "Joueur 1";
			else if (GameFour.player2Score >= MAX_SCORE) winner = "Joueur 2";
			else if (GameFour.player3Score >= MAX_SCORE) winner = "Joueur 3";
			else if (GameFour.player4Score >= MAX_SCORE) winner = "Joueur 4";

			// Enregistrer les scores.
			const matchId = localStorage.getItem('currentMatchId');
			if (matchId) {
				try {
					const response = await fetch("/api/players/match4/score", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							matchId: parseInt(matchId),
							player1Score: GameFour.player1Score,
							player2Score: GameFour.player2Score,
							player3Score: GameFour.player3Score,
							player4Score: GameFour.player4Score
						}),
					});
					const result = await response.json();
					// Supprimer l'ID du match du localStorage.
					localStorage.removeItem('currentMatchId');
				} catch (error) {}
			}

			const victoryMessageElement = document.getElementById("Pong");
			if (victoryMessageElement) {
				const winnerAlias = this.getWinnerAlias(winner);

				const screenReaderInstance = screenReader.getInstance();
				screenReaderInstance.announceScore(GameFour.player1Score, GameFour.player2Score, GameFour.player3Score, GameFour.player4Score);
				screenReaderInstance.speak(`${winnerAlias} ${t("as_lost")}`);

				victoryMessageElement.innerHTML = `
					<p class="font-extrabold">${this.getWinnerAlias(winner)} ${t("as_lost")}</p>
					<div class="flex justify-center">
						<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
					</div>
				`;

				// Import dynamique pour éviter les problèmes de reference circulaire.
				import('./script.js').then(module => {
					const menu_btn = document.getElementById("menu-btn");
					if (menu_btn)
						menu_btn.addEventListener("click", () => { navigate('/home'); module.showHome()});				});
			}
			GameFour.setGameOver(true);
			return true;
		}
		return false;
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
					console.log(`Ball speed increased to: ${this.currentSpeed}`);
				}
			}
		}
	}

	update(player1: Paddle, player2: Paddle2, player3: Paddle3, player4: Paddle4, canvas: HTMLCanvasElement) {
		// Si le jeu est en pause, on ne met pas à jour la position de la balle.
		if (isPaused) return;

		this.updateSpeed();

		// Verification des buts dans les camps respectifs.
		if (this.x <= 0) {
			GameFour.player1Score += 1;

			screenReader.getInstance().handleScoreP1Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.x + this.width >= canvas.width) {
			GameFour.player2Score += 1;

			screenReader.getInstance().handleScoreP2Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.y <= 0) {
			GameFour.player3Score += 1;

			screenReader.getInstance().handleScoreP3Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.y + this.height >= canvas.height) {
			GameFour.player4Score += 1;

			screenReader.getInstance().handleScoreP4Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
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

			screenReader.getInstance().handleRightPaddleHit();
		}

		// Collision with player 3
		if (this.y <= player3.y + player3.height &&
			this.y >= player3.y &&
			this.x + this.width >= player3.x &&
			this.x <= player3.x + player3.width) {
			let relativeX = (this.x + this.width / 2) - (player3.x + player3.width / 2);
			let normalizedX = relativeX / (player3.width / 2);
			this.yVal = 1;
			this.xVal = normalizedX * 1.2;

			screenReader.getInstance().handleUpPaddleHit();
		}

		// Collision with player 4
		if (this.y + this.height >= player4.y &&
			this.y <= player4.y + player4.height &&
			this.x + this.width >= player4.x &&
			this.x <= player4.x + player4.width) {
			let relativeX = (this.x + this.width / 2) - (player4.x + player4.width / 2);
			let normalizedX = relativeX / (player4.width / 2);
			this.yVal = -1;
			this.xVal = normalizedX * 1.2;

			screenReader.getInstance().handleDownPaddleHit();
		}

		// Update ball position with current speed
		const length = Math.sqrt(this.xVal * this.xVal + this.yVal * this.yVal);
		this.x += (this.xVal / length) * this.currentSpeed;
		this.y += (this.yVal / length) * this.currentSpeed;
	}

	private getWinnerAlias(winner: string): string {
		if (winner === "Joueur 1")
			return localStorage.getItem('player1Alias') || 'Joueur 1';
		else if (winner === "Joueur 2")
			return localStorage.getItem('player2Alias') || 'Joueur 2';
		else if (winner === "Joueur 3")
			return localStorage.getItem('player3Alias') || 'Joueur 3';
		else
			return localStorage.getItem('player4Alias') || 'Joueur 4';
	}
}