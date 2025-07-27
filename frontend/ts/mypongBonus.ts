import { showHome} from "./script.js";
import { t } from "../lang/i18n.js"
import {screenReader} from "./screenReader.js";
import {navigate, onNavigate} from "./popstate.js";

enum KeyBindings{
	UP = 87,
	DOWN = 83,
	UP2 = 38,
	DOWN2 = 40
}

enum BonusType {
	WALL,
	ICE,
	POTION,
	SPEED
}


const MAX_SCORE = 5;

let isPaused = false; // Variable pour gérer l'état de pause
let pauseDuration = 2000; // Durée de la pause en millisecondes (2 secondes)
let gameOver = false;

export class GameBonus{
	private readonly gameCanvas: HTMLCanvasElement | null;
	private readonly gameContext: CanvasRenderingContext2D | null;
	private gameStartTime: number = Date.now();
	public static keysPressed: boolean[] = [];
	public static player1Score: number = 0;
	public static player2Score: number = 0;
	private readonly player1: Paddle;
	private readonly player2: Paddle2;

	private bonuses: Bonus[] = [];
	private lastBonusTime: number = 0;
	private bonusStartTime: number = Date.now();
	public staticWalls: StaticWall[] = []; // Liste pour le bonus Wall

	private readonly ball: Ball;

	private readonly keydownHandler: (e: KeyboardEvent) => void;
	private readonly keyupHandler: (e: KeyboardEvent) => void;
	private readonly popstateHandler: (e: PopStateEvent) => void;

	private createStaticWallLater(x: number, y: number) { //Bonus WALL
		setTimeout(() =>
		{
			const wall = new StaticWall(x, y);
			this.staticWalls.push(wall);
			if (this.staticWalls.length > 3)
			{
				this.staticWalls.shift();
			}
		}, 300) // Ajout différé
	}

	private freezePlayers(except: 'player1' | 'player2' | null)  //Bonus ICE
	{
		const freezeDuration = 1250;

		if (except !== 'player1') this.player1.freeze(freezeDuration);
		if (except !== 'player2') this.player2.freeze(freezeDuration);
	}

	private invertPlayersControls(except: 'player1' | 'player2' | null) {
		const invertDuration = 4000; // 4 secondes

		if (except !== 'player1') this.player1.invertControls(invertDuration);
		if (except !== 'player2') this.player2.invertControls(invertDuration);
	}


	constructor() {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
		if (!canvas)
			throw new Error("Element canvas non-trouve");

		this.gameCanvas = canvas;
		this.gameContext = this.gameCanvas.getContext("2d");
		if (!this.gameContext)
			throw new Error("Impossible de récupérer 2D rendering context");

		this.gameContext.font = "30px Orbitron";

		this.keydownHandler = (e) => { GameBonus.keysPressed[e.which] = true; };
		this.keyupHandler = (e) => { GameBonus.keysPressed[e.which] = false; };
		this.popstateHandler = this.handlePopState.bind(this);
		window.addEventListener("keydown", this.keydownHandler);
		window.addEventListener("keyup", this.keyupHandler);
		window.addEventListener("popstate", this.popstateHandler);

		const paddleWidth:number = 20, paddleHeight:number = 50, ballSize:number = 10, wallOffset:number = 20;

		this.player1 = new Paddle(paddleWidth, paddleHeight, wallOffset, this.gameCanvas.height / 2 - paddleHeight / 2);
		this.player2 = new Paddle2(paddleWidth, paddleHeight, this.gameCanvas.width - (wallOffset + paddleWidth), this.gameCanvas.height / 2 - paddleHeight / 2);
		
		// Set game reference for AI paddle
		this.player2.setGameRef(this);
		
		this.ball = new Ball(ballSize, ballSize, this.gameCanvas.width / 2 - ballSize / 2, this.gameCanvas.height / 2 - ballSize / 2);
		this.ball.setGameRef(this);
		this.ball.setOnGoalCallback(() => {
			this.bonuses = []; // Supprime tous les bonus
			this.bonusStartTime = Date.now(); // Redémarre le chrono
			this.lastBonusTime = 0; // Réinitialise le timer de cooldown
		})

		this.cleanupNavigateListener = onNavigate(() => {
			if (!GameBonus.isGameOver()) {
				GameBonus.setGameOver(true);
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
					Paddle2.setAIEnabled(false);
					navigate('/home');
					showHome();
				});
			}
		}
		GameBonus.setGameOver(true);
	}

	private handlePopState() {
		if (!GameBonus.isGameOver()) {
			GameBonus.setGameOver(true);
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
		Paddle2.setAIEnabled(false);

		if (this.cleanupNavigateListener) {
			this.cleanupNavigateListener();
			this.cleanupNavigateListener = null;
		}

		this.cleanup();
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
		this.gameContext!.fillText(player1Alias, this.gameCanvas!.width / 4, 25);
		this.gameContext!.fillText(player2Alias, (3 * this.gameCanvas!.width) / 4, 25);

		// Affiche les scores.
		this.gameContext.textAlign = "center";
		this.gameContext.fillText(GameBonus.player1Score.toString(), this.gameCanvas.width / 4, 50);
		this.gameContext.fillText(GameBonus.player2Score.toString(), (3 * this.gameCanvas.width) / 4, 50);
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
		this.bonuses.forEach(bonus => bonus.draw(this.gameContext!));
		this.staticWalls.forEach(wall => wall.draw(this.gameContext!));
	}
	update() {
		if (!this.gameCanvas)
			return ;

		this.player1.update(this.gameCanvas);
		this.player2.update(this.gameCanvas, this.ball);
		this.ball.update(this.player1, this.player2, this.gameCanvas);

		//partie bonus
		const now = Date.now();
		const elapsed = now - this.bonusStartTime;

		// Bonus à partir de 7 secondes
		if (elapsed > 7000 && now - this.lastBonusTime >= 4000)
		{
			if (this.bonuses.length >= 3)
				this.bonuses.shift();

			const bonusX = this.gameCanvas!.width / 4 + Math.random() * (this.gameCanvas!.width / 2);
			const bonusY = 20 + Math.random() * (this.gameCanvas!.height - 40);
			const bonusType = Math.floor(Math.random() * 4); // 0-3

			this.bonuses.push(new Bonus(bonusX, bonusY, bonusType));
			this.lastBonusTime = now;
		}


		this.bonuses = this.bonuses.filter(bonus =>
		{
			const collision =
				this.ball.x < bonus.x + bonus.width &&
				this.ball.x + this.ball.width > bonus.x &&
				this.ball.y < bonus.y + bonus.height &&
				this.ball.y + this.ball.height > bonus.y;

			if (collision) {
				screenReader.getInstance().handleBonusHit();

				switch (bonus.type) {
					case BonusType.WALL:

						// Retarder la création du mur à après la suppression du bonus
						this.createStaticWallLater(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2);
						break;
					case BonusType.ICE:
						const lastTouched = this.ball.getLastTouchedBy();
						this.freezePlayers(lastTouched);
						break;
					case BonusType.POTION:
						const lastTouchedPO = this.ball.getLastTouchedBy();
						this.invertPlayersControls(lastTouchedPO);
						break;
					case BonusType.SPEED:
						this.ball.increaseSpeed(1.1);
						break;
				}
				return false;
			}
			return true;
		})


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
		GameBonus.player1Score = 0;
		GameBonus.player2Score = 0;
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

	constructor(w:number, h:number, x:number, y:number){
		super(w,h,x,y);
	}

	private invertedUntil: number = 0;

	public invertControls(duration: number)
	{
		this.invertedUntil = Date.now() + duration;
	}


	private frozenUntil: number = 0;

	public freeze(duration: number)
	{
		this.frozenUntil = Date.now() + duration;
	}

	update(canvas: HTMLCanvasElement){
		if (Date.now() < this.frozenUntil)  // Lié au Bonus ICE
		{
			this.yVal = 0;
			return;
		}

		const isInverted = Date.now() < this.invertedUntil; // Lié au Bonus POTION

		if (GameBonus.keysPressed[KeyBindings.UP])
		{
			this.yVal = isInverted ? 1 : -1;
			if ((this.y <= 20 && !isInverted) || (this.y + this.height >= canvas.height - 20 && isInverted))
			{
				this.yVal = 0;
			}
		}
		else if (GameBonus.keysPressed[KeyBindings.DOWN])
		{
			this.yVal = isInverted ? -1 : 1;
			if ((this.y + this.height >= canvas.height - 20 && !isInverted) || (this.y <= 20 && isInverted))
			{
				this.yVal = 0;
			}
		}
		else
		{
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
	private gameRef: GameBonus | null = null;
	
	// Simulated keyboard state
	private isUpPressed: boolean = false;
	private isDownPressed: boolean = false;
	
	// Movement control
	private targetY: number = 0;
	private approachingBall: boolean = false;

	// Bonus states
	private invertedUntil: number = 0;
	private frozenUntil: number = 0;
	
	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerY = y;
		this.targetY = y;
	}

	public setGameRef(game: GameBonus) {
		this.gameRef = game;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerY;

		const currentBallSpeed = ball.getSpeed(); // Use actual ball speed
		
		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;
		
		// Simulate ball movement until it reaches our x-position or hits a wall
		while (predictedX < this.x && predictedX > 0) {
			// Check for collisions with static walls
			if (this.gameRef && this.gameRef.staticWalls) {
				for (const wall of this.gameRef.staticWalls) {
					if (predictedX < wall.x + wall.width &&
						predictedX + ball.width > wall.x &&
						predictedY < wall.y + wall.height &&
						predictedY + ball.height > wall.y) {
						
						// Calculate which side of the wall we'll hit
						const overlapX = Math.min(
							Math.abs(predictedX + ball.width - wall.x),
							Math.abs(predictedX - (wall.x + wall.width))
						);
						const overlapY = Math.min(
							Math.abs(predictedY + ball.height - wall.y),
							Math.abs(predictedY - (wall.y + wall.height))
						);

						if (overlapX < overlapY) {
							velocityX *= -1; // Horizontal bounce
						} else {
							velocityY *= -1; // Vertical bounce
						}
					}
				}
			}

			// Update predicted position
			predictedX += velocityX * currentBallSpeed;
			predictedY += velocityY * currentBallSpeed;
			
			// Account for bounces off top/bottom walls
			if (predictedY < 0 || predictedY > canvas.height) {
				velocityY *= -1;
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

	public freeze(duration: number) {
		this.frozenUntil = Date.now() + duration;
	}

	public invertControls(duration: number) {
		this.invertedUntil = Date.now() + duration;
	}

	update(canvas: HTMLCanvasElement, ball?: Ball) {
		const now = Date.now();
		const isFrozen = now < this.frozenUntil;
		const isInverted = now < this.invertedUntil;

		// If frozen by ICE bonus, no movement allowed
		if (isFrozen) {
			this.yVal = 0;
			return;
		}

		if (Paddle2.isAIEnabled && ball) {
			// Update AI decisions every second
			if (now - this.aiLastDecisionTime >= this.aiDecisionInterval) {
				this.aiLastDecisionTime = now;
				
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
			
			// Apply simulated keyboard input with inversion handling
			if (isInverted) {
				if (this.isUpPressed) {
					this.yVal = 1;
				} else if (this.isDownPressed) {
					this.yVal = -1;
				} else {
				this.yVal = 0;
			}
			} else {
				if (this.isUpPressed) {
					this.yVal = -1;
				} else if (this.isDownPressed) {
					this.yVal = 1;
				} else {
					this.yVal = 0;
				}
			}
		} else {
			// Human player control with bonus effects
			if (isInverted) {
				if (GameBonus.keysPressed[KeyBindings.UP2]) {
					this.yVal = 1;
				} else if (GameBonus.keysPressed[KeyBindings.DOWN2]) {
					this.yVal = -1;
				} else {
				this.yVal = 0;
			}
			} else {
				if (GameBonus.keysPressed[KeyBindings.UP2]) {
					this.yVal = -1;
				} else if (GameBonus.keysPressed[KeyBindings.DOWN2]) {
					this.yVal = 1;
				} else {
					this.yVal = 0;
				}
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

class Bonus extends Entity {
	public type: BonusType;

	constructor(x: number, y: number, type?: BonusType) {
		super(20, 20, x, y);
		this.type = type ?? Math.floor(Math.random() * 4); // bonus aléatoire
	}

	draw(context: CanvasRenderingContext2D) {
		switch (this.type) {
			case BonusType.WALL:
				context.fillStyle = "#8B4513"; // Marron
				context.fillRect(this.x, this.y, this.width, this.height);
				break;
			case BonusType.ICE:
				context.fillStyle = "#00f0ff"; // Bleu clair
				context.beginPath();
				context.moveTo(this.x + this.width / 2, this.y);
				context.lineTo(this.x + this.width, this.y + this.height);
				context.lineTo(this.x, this.y + this.height);
				context.closePath();
				context.fill();
				break;
			case BonusType.POTION:
				context.fillStyle = "#ff00ff"; // Magenta
				context.beginPath();
				context.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
				context.fill();
				break;
			case BonusType.SPEED:
				context.fillStyle = "#FFD700"; // Jaune
				context.beginPath();
				context.moveTo(this.x, this.y);
				context.lineTo(this.x + this.width, this.y + this.height / 2);
				context.lineTo(this.x, this.y + this.height);
				context.closePath();
				context.fill();
				break;
		}
	}
}

class StaticWall extends Entity {
	constructor(x: number, y: number) {
		super(40, 40, x - 10, y - 10); // Centre le mur sur le point d'impact
	}

	draw(context: CanvasRenderingContext2D) {
		context.fillStyle = "#8B4513"; //
		context.fillRect(this.x, this.y, this.width, this.height);
	}
}



class Ball extends Entity{

	private gameRef!: GameBonus;
	private lastTouchedBy: 'player1' | 'player2' | null = null;
	private baseSpeed: number = 5; // Vitesse initiale
	private speed: number = this.baseSpeed; // Lié au bonus SPEED

	public getSpeed(): number {
		return this.speed;
	}

	public setGameRef(game: GameBonus)
	{
		this.gameRef = game;
	}

	public getLastTouchedBy(): 'player1' | 'player2' | null
	{
		return this.lastTouchedBy;
	}

	public increaseSpeed(factor: number)
	{
		this.speed *= factor;
	}

	private onGoalCallback: (() => void) | null = null; //Pour réinitialiser les bonus, appel dans GameBonus

	public setOnGoalCallback(callback: () => void) {
		this.onGoalCallback = callback;
	}

	constructor(w: number, h: number, x: number, y: number){
		super(w, h, x, y);
		const randomDirection = Math.floor(Math.random() * 2) +1;
		if (randomDirection % 2)
			this.xVal = 1;
		else
			this.xVal = -1;
		this.yVal = 1;
	}

	update(player1: Paddle, player2: Paddle2, canvas: HTMLCanvasElement){
		// Si le jeu est en pause, on ne met pas à jour la position de la balle.
		if (isPaused)
			return;

		// check le haut.
		if (this.y <= 10) {
			this.yVal = 1;
			screenReader.getInstance().handleWallHit();
		}

		// check le bas.
		if (this.y + this.height >= canvas.height - 10) {
			this.yVal = -1;
			screenReader.getInstance().handleWallHit();
		}

		// check but player 2.
		if (this.x <= 0) {
			GameBonus.player2Score += 1;

			screenReader.getInstance().handleScoreP2Hit();

			this.resetPosition(canvas);
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}
			if (!this.checkGameEnd("Joueur 2")) {
			} else
				return;
		}

		// check but player 1.
		if (this.x + this.width >= canvas.width) {
			GameBonus.player1Score += 1;

			screenReader.getInstance().handleScoreP1Hit();

			this.resetPosition(canvas);
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}
			if (!this.checkGameEnd("Joueur 1")) {
			} else
				return;
		}

		// Collision avec joueur 1.
		if (this.x <= player1.x + player1.width &&
			this.x >= player1.x &&
			this.y + this.height >= player1.y &&
			this.y <= player1.y + player1.height) {
			let relativeY = (this.y + this.height / 2) - (player1.y + player1.height / 2);
			let normalizedY = relativeY / (player1.height / 2);  // Normalisation de la position verticale.
			this.xVal = 1;
			this.yVal = normalizedY * 1.2;  // Ajuste l'angle en fonction de la collision.
			this.lastTouchedBy = 'player1';

			screenReader.getInstance().handleLeftPaddleHit();
		}

		// Collision avec joueur 2.
		if (this.x + this.width >= player2.x &&
			this.x <= player2.x + player2.width &&
			this.y + this.height >= player2.y &&
			this.y <= player2.y + player2.height) {
			let relativeY = (this.y + this.height / 2) - (player2.y + player2.height / 2);
			let normalizedY = relativeY / (player2.height / 2);  // Normalisation de la position verticale.
			this.xVal = -1;
			this.yVal = normalizedY * 1.2;  // Ajuste l'angle en fonction de la collision.
			this.lastTouchedBy = 'player2';

			screenReader.getInstance().handleRightPaddleHit();
		}

		// Collision avec les murs statiques
		for (const wall of this.gameRef.staticWalls) {
			if (this.x < wall.x + wall.width &&
				this.x + this.width > wall.x &&
				this.y < wall.y + wall.height &&
				this.y + this.height > wall.y) {

				// Calculer les centres pour déterminer la direction de collision
				const ballCenterX = this.x + this.width / 2;
				const ballCenterY = this.y + this.height / 2;
				const wallCenterX = wall.x + wall.width / 2;
				const wallCenterY = wall.y + wall.height / 2;

				// Calculer les distances
				const deltaX = ballCenterX - wallCenterX;
				const deltaY = ballCenterY - wallCenterY;

				// Calculer les chevauchements
				const overlapX = (this.width + wall.width) / 2 - Math.abs(deltaX);
				const overlapY = (this.height + wall.height) / 2 - Math.abs(deltaY);

				screenReader.getInstance().handleWallHit();

				// Déterminer quelle face du mur a été touchée et repositionner la balle
				if (overlapX < overlapY) {
					// Collision horizontale
					this.xVal *= -1;

					// Repositionner la balle pour éviter qu'elle reste collée
					if (deltaX > 0) {
						// Balle à droite du mur
						this.x = wall.x + wall.width + 1;
					} else {
						// Balle à gauche du mur
						this.x = wall.x - this.width - 1;
					}
				} else {
					// Collision verticale
					this.yVal *= -1;

					// Repositionner la balle pour éviter qu'elle reste collée
					if (deltaY > 0) {
						// Balle en bas du mur
						this.y = wall.y + wall.height + 1;
					} else {
						// Balle en haut du mur
						this.y = wall.y - this.height - 1;
					}
				}

				// Sortir de la boucle après la première collision pour éviter les conflits
				break;
			}
		}

		// Fait en sorte que la balle se déplace à une vitesse constante meme en diagonale.
		const length = Math.sqrt(this.xVal * this.xVal + this.yVal * this.yVal);
		this.x += (this.xVal / length) * this.speed;
		this.y += (this.yVal / length) * this.speed;
	}

	// Reset la position de la balle.
	private resetPosition(canvas: HTMLCanvasElement) {
		this.x = canvas.width / 2 - this.width / 2;
		this.y = canvas.height / 2 - this.height / 2;
		this.speed = this.baseSpeed; // Réinitialise la vitesse
		isPaused = true;
		setTimeout(() => { isPaused = false; }, pauseDuration);
	}


	private async checkGameEnd(winner: string): Promise<boolean> {
		if (GameBonus.player1Score >= MAX_SCORE || GameBonus.player2Score >= MAX_SCORE) {
			// Sauvegarde les scores pour le match actuel.
			const matchId = localStorage.getItem('currentMatchId');
			if (matchId) {
				try {
					const response = await fetch("/api/players/match/score", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							matchId: parseInt(matchId),
							player1Score: GameBonus.player1Score,
							player2Score: GameBonus.player2Score
						}),
					});
					const result = await response.json();
				} catch (error) {}
			}

			// Always show victory message, regardless of tournament mode
			const victoryMessageElement = document.getElementById("Pong");
			if (victoryMessageElement) {
				const winnerAlias = this.getWinnerAlias(winner);

				const screenReaderInstance = screenReader.getInstance();
				screenReaderInstance.announceScore(GameBonus.player1Score, GameBonus.player2Score, null, null);
				screenReaderInstance.speak(`${winnerAlias} ${t("as_won")}`);

				victoryMessageElement.innerHTML = `
					<p class="font-extrabold">${this.getWinnerAlias(winner)} ${t("as_won")}</p>
					<div class="flex justify-center">
					<button id="menu-btn" class="btn btn-fixed rounded-lg border p-4 shadow">${t("menu")}</button>
					</div>
				`;

			// Clean up localStorage for regular matches
				const menu_btn = document.getElementById("menu-btn");
				if (menu_btn) {
					menu_btn.addEventListener("click", () => {
						localStorage.removeItem('currentMatchId');
						localStorage.removeItem('tournamentMode');
						localStorage.removeItem("player1Alias");
						localStorage.removeItem("player2Alias");
						localStorage.removeItem("player3Alias");
						localStorage.removeItem("player4Alias");
						localStorage.removeItem('isPlayer2AI');
						Paddle2.setAIEnabled(false);

						navigate('/home');
						showHome();
					});
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