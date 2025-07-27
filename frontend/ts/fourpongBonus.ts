import { t } from "../lang/i18n.js"
import {screenReader} from "./screenReader.js";
import {showHome} from "./script.js";
import {navigate, onNavigate} from "./popstate.js";

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

export class GameFourBonus {
	private readonly gameCanvas: HTMLCanvasElement | null;
	private readonly gameContext: CanvasRenderingContext2D | null;
	private gameStartTime: number = Date.now();
	private lastFrameTime: number = 0;
	private readonly frameInterval: number = 1000 / 60;
	public static keysPressed: boolean[] = [];
	public static player1Score: number = 0;
	public static player2Score: number = 0;
	public static player3Score: number = 0;
	public static player4Score: number = 0;
	private readonly player1: Paddle;
	private readonly player2: Paddle2;
	private readonly player3: Paddle3;
	private readonly player4: Paddle4;

	private bonuses: Bonus[] = [];
	private lastBonusTime: number = 0;
	private bonusStartTime: number = Date.now();
	public staticWalls: StaticWall[] = []; // Liste pour le bonus Wall

	private readonly ball: Ball;

	private readonly keydownHandler: (e: KeyboardEvent) => void;
	private readonly keyupHandler: (e: KeyboardEvent) => void;
	private readonly popstateHandler: (e: PopStateEvent) => void;

	private createStaticWallLater(x: number, y: number) { //Bonus WALL
		setTimeout(() => {
			const ballPos = this.ball.getPosition();
			const safeDistance = 30;

			if (Math.abs(ballPos.x - x) > safeDistance || Math.abs(ballPos.y - y) > safeDistance) {
				const wall = new StaticWall(x, y);
				this.staticWalls.push(wall);
				if (this.staticWalls.length > 3) {
					this.staticWalls.shift();
				}
			}
		}, 300); // Increased from 200 to 300ms
	}

	private freezePlayers(except: 'player1' | 'player2' | 'player3' | 'player4' | null) {
		const freezeDuration = 2000;  // Increased to 2 seconds

		if (except !== 'player1') this.player1.freeze(freezeDuration);
		if (except !== 'player2') this.player2.freeze(freezeDuration);
		if (except !== 'player3') this.player3.freeze(freezeDuration);
		if (except !== 'player4') this.player4.freeze(freezeDuration);
	}

	private invertPlayersControls(except: 'player1' | 'player2' | 'player3' | 'player4'| null) {
		const invertDuration = 5000; // Increased to 5 seconds

		if (except !== 'player1') this.player1.invertControls(invertDuration);
		if (except !== 'player2') this.player2.invertControls(invertDuration);
		if (except !== 'player3') this.player3.invertControls(invertDuration);
		if (except !== 'player4') this.player4.invertControls(invertDuration);
	}

	public static resetGlobalState() {
		gameOver = false;
		isPaused = false;
		GameFourBonus.player1Score = 0;
		GameFourBonus.player2Score = 0;
		GameFourBonus.player3Score = 0;
		GameFourBonus.player4Score = 0;
		// Add any other global/static resets if needed
	}

	constructor(){
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
		if (!canvas)
			throw new Error("Element canvas non-trouve");

		this.gameCanvas = canvas;
		this.gameContext = this.gameCanvas.getContext("2d");
		if (!this.gameContext)
			throw new Error("Impossible de récupérer 2D rendering context");

		this.gameContext.font = "30px Orbitron";

		this.keydownHandler = (e) => { GameFourBonus.keysPressed[e.which] = true; };
		this.keyupHandler = (e) => { GameFourBonus.keysPressed[e.which] = false; };
		this.popstateHandler = this.handlePopState.bind(this);
		window.addEventListener("keydown", this.keydownHandler);
		window.addEventListener("keyup", this.keyupHandler);
		window.addEventListener("popstate", this.popstateHandler);

		let paddleWidth:number = 15, paddleHeight:number = 50, ballSize:number = 10, wallOffset:number = 20;

		this.player1 = new Paddle(paddleWidth, paddleHeight, wallOffset, this.gameCanvas.height / 2 - paddleWidth / 2 - paddleHeight / 2);
		this.player2 = new Paddle2(paddleWidth, paddleHeight, this.gameCanvas.width - (wallOffset + paddleWidth), this.gameCanvas.height / 2 - paddleHeight / 2);
		this.player3 = new Paddle3(paddleHeight, paddleWidth, this.gameCanvas.width / 2 - paddleHeight / 2, wallOffset);
		this.player4 = new Paddle4(paddleHeight, paddleWidth, this.gameCanvas.width / 2 - paddleHeight / 2, this.gameCanvas.height - (wallOffset + paddleWidth));

		// AI will be enabled by the player selection screen if toggled
		// Set game reference for each paddle
		this.player2.setGameRef(this);
		this.player3.setGameRef(this);
		this.player4.setGameRef(this);

		this.ball = new Ball(ballSize, ballSize, 0, 0, this.gameCanvas.width, this.gameCanvas.height);
		this.ball.setGameRef(this);
		this.ball.setOnGoalCallback(() => {
			this.bonuses = []; // Supprime tous les bonus
			this.bonusStartTime = Date.now(); // Redémarre le chrono
			this.lastBonusTime = 0; // Réinitialise le timer de cooldown
		})

		this.cleanupNavigateListener = onNavigate(() => {
			if (!GameFourBonus.isGameOver()) {
				GameFourBonus.setGameOver(true);
				this.handlePlayerLeave();
			}
		});
	}

	private cleanupNavigateListener: (() => void) | null = null;

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
		GameFourBonus.setGameOver(true);
	}

	private handlePopState() {
		if (!GameFourBonus.isGameOver()) {
			GameFourBonus.setGameOver(true);
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

	drawBoardDetails(){
		if (!this.gameContext || !this.gameCanvas)
			return ;

		const styles = getComputedStyle(document.body);
		const lineColor = styles.getPropertyValue('--canvas-line-color').trim() || '#fff';
		const textColor = styles.getPropertyValue('--canvas-text-color').trim() || '#fff';

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
		this.gameContext.fillText(GameFourBonus.player1Score.toString(), this.gameCanvas.width / 3, this.gameCanvas.height / 2);
		this.gameContext.fillText(GameFourBonus.player2Score.toString(), (3 * this.gameCanvas.width) / 4.60, this.gameCanvas.height / 2);
		this.gameContext.fillText(GameFourBonus.player3Score.toString(), this.gameCanvas.width / 2, this.gameCanvas.height / 4);
		this.gameContext.fillText(GameFourBonus.player4Score.toString(), this.gameCanvas.width / 2, (3 * this.gameCanvas.height) / 4);


	}

	draw(){
		if (!this.gameContext || !this.gameCanvas)
			return ;

		const styles = getComputedStyle(document.body);
		const bgColor = styles.getPropertyValue('--canvas-bg-color').trim() || '#000';
		this.gameContext.fillStyle = bgColor;
		this.gameContext.fillRect(0,0,this.gameCanvas.width,this.gameCanvas.height);

		this.drawBoardDetails();
		this.player1.draw(this.gameContext);
		this.player2.draw(this.gameContext);
		this.player3.draw(this.gameContext);
		this.player4.draw(this.gameContext);
		this.ball.draw(this.gameContext);
		this.bonuses.forEach(bonus => bonus.draw(this.gameContext!));
		this.staticWalls.forEach(wall => wall.draw(this.gameContext!));
	}

	update(){
		if (!this.gameCanvas)
			return ;

		this.player1.update(this.gameCanvas);
		this.player2.update(this.gameCanvas, this.ball);
		this.player3.update(this.gameCanvas, this.ball);
		this.player4.update(this.gameCanvas, this.ball);
		this.ball.update(this.player1, this.player2, this.player3, this.player4, this.gameCanvas);

		//partie bonus
		const now = Date.now();
		const elapsed = now - this.bonusStartTime;

		// Bonus à partir de 7 secondes
		if (elapsed > 7000 && now - this.lastBonusTime >= 4000)
		{
			if (this.bonuses.length >= 3)
				this.bonuses.shift();

			const bonusX = this.gameCanvas!.width / 4 + Math.random() * (this.gameCanvas!.width / 2);
			const bonusY = 60 + Math.random() * (this.gameCanvas!.height - 120);
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
						this.ball.increaseSpeed(1.2);
						break;
				}
				return false;
			}
			return true;
		})
	}

	gameLoop = () => {
		if (gameOver) return;

		const currentTime = Date.now();
		if (currentTime - this.gameStartTime < pauseDuration) {
			this.draw();
			requestAnimationFrame(() => this.gameLoop());
			return;
		}

		const deltaTime = currentTime - this.lastFrameTime;
		if (deltaTime > this.frameInterval)
		{
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
			bgColor: styles.getPropertyValue('--canvas-bg-color').trim() || '#000',
			lineColor: styles.getPropertyValue('--canvas-line-color').trim() || '#fff',
			textColor: styles.getPropertyValue('--canvas-text-color').trim() || '#fff',
			entityColor: styles.getPropertyValue('--canvas-entity-color').trim() || '#fff',
		};
	}

	draw(context: CanvasRenderingContext2D){
		const { entityColor } = this.getCanvasColors();
		context.fillStyle = entityColor;
		context.fillRect(this.x,this.y,this.width,this.height);
	}
}

export class Paddle extends Entity{

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

		if (GameFourBonus.keysPressed[KeyBindings.UPONE])
		{
			this.yVal = isInverted ? 1 : -1;
			if ((this.y <= 20 && !isInverted) || (this.y + this.height >= canvas.height - 20 && isInverted))
			{
				this.yVal = 0;
			}
		}
		else if (GameFourBonus.keysPressed[KeyBindings.DOWNONE])
		{
			this.yVal = isInverted ? -1 : 1;
			if ((this.y + this.height >= canvas.height - 20 && !isInverted) || (this.y <= 20 && isInverted))
			{
				this.yVal = 0;
			}
		}
		else
			this.yVal = 0;

		this.y += this.yVal * this.speed;
	}
}

export class Paddle2 extends Entity{
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerY: number = 0;
	private gameRef: GameFourBonus | null = null;

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

	public setGameRef(game: GameFourBonus) {
		this.gameRef = game;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	public invertControls(duration: number) {
		this.invertedUntil = Date.now() + duration;
	}

	public freeze(duration: number) {
		this.frozenUntil = Date.now() + duration;
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
		const now = Date.now();

		// Don't move if frozen by ICE power-up
		if (now < this.frozenUntil) {
			this.yVal = 0;
			return;
		}

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

			// Handle POTION power-up (inverted controls)
			const isInverted = now < this.invertedUntil;

			if (this.isUpPressed) {
				this.yVal = isInverted ? 1 : -1;
			} else if (this.isDownPressed) {
				this.yVal = isInverted ? -1 : 1;
			} else {
				this.yVal = 0;
			}
		} else {
			if (GameFourBonus.keysPressed[KeyBindings.UPTWO]) {
				this.yVal = now < this.invertedUntil ? 1 : -1;
			} else if (GameFourBonus.keysPressed[KeyBindings.DOWNTWO]) {
				this.yVal = now < this.invertedUntil ? -1 : 1;
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


export class Paddle3 extends Entity{
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerX: number = 0;
	private gameRef: GameFourBonus | null = null;

	// Simulated keyboard state
	private isLeftPressed: boolean = false;
	private isRightPressed: boolean = false;

	// Movement control
	private targetX: number = 0;
	private approachingBall: boolean = false;

	// Bonus states
	private invertedUntil: number = 0;
	private frozenUntil: number = 0;

	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerX = x;
		this.targetX = x;
	}

	public setGameRef(game: GameFourBonus) {
		this.gameRef = game;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	public invertControls(duration: number) {
		this.invertedUntil = Date.now() + duration;
	}

	public freeze(duration: number) {
		this.frozenUntil = Date.now() + duration;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerX;

		const currentBallSpeed = ball.getSpeed(); // Use actual ball speed

		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;

		// Simulate ball movement until it reaches our y-position or hits a wall
		while (predictedY > this.y && predictedY < canvas.height) {
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

			// Account for bounces off side walls
			if (predictedX < 0 || predictedX > canvas.width) {
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
		const now = Date.now();

		// Don't move if frozen by ICE power-up
		if (now < this.frozenUntil) {
			this.xVal = 0;
			return;
		}

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

			// Handle POTION power-up (inverted controls)
			const isInverted = now < this.invertedUntil;

			if (this.isLeftPressed) {
				this.xVal = isInverted ? 1 : -1;
			} else if (this.isRightPressed) {
				this.xVal = isInverted ? -1 : 1;
			} else {
				this.xVal = 0;
			}
		} else {
			if (GameFourBonus.keysPressed[KeyBindings.LEFTONE]) {
				this.xVal = now < this.invertedUntil ? 1 : -1;
			} else if (GameFourBonus.keysPressed[KeyBindings.RIGHTONE]) {
				this.xVal = now < this.invertedUntil ? -1 : 1;
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


export class Paddle4 extends Entity{
	private speed: number = 10;
	private aiLastDecisionTime: number = 0;
	private aiDecisionInterval: number = 1000;
	private static isAIEnabled: boolean = false;
	private readonly centerX: number = 0;
	private gameRef: GameFourBonus | null = null;

	// Simulated keyboard state
	private isLeftPressed: boolean = false;
	private isRightPressed: boolean = false;

	// Movement control
	private targetX: number = 0;
	private approachingBall: boolean = false;

	// Bonus states
	private invertedUntil: number = 0;
	private frozenUntil: number = 0;

	constructor(w: number, h: number, x: number, y: number) {
		super(w, h, x, y);
		this.centerX = x;
		this.targetX = x;
	}

	public setGameRef(game: GameFourBonus) {
		this.gameRef = game;
	}

	public static setAIEnabled(enabled: boolean) {
		this.isAIEnabled = enabled;
	}

	public invertControls(duration: number) {
		this.invertedUntil = Date.now() + duration;
	}

	public freeze(duration: number) {
		this.frozenUntil = Date.now() + duration;
	}

	private predictBallPosition(ball: Ball, canvas: HTMLCanvasElement): number {
		if (!ball) return this.centerX;

		const currentBallSpeed = ball.getSpeed(); // Use actual ball speed

		let predictedX = ball.x;
		let predictedY = ball.y;
		let velocityX = ball.xVal;
		let velocityY = ball.yVal;

		// Simulate ball movement until it reaches our y-position or hits a wall
		while (predictedY < this.y && predictedY > 0) {
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

			// Account for bounces off side walls
			if (predictedX < 0 || predictedX > canvas.width) {
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
		const now = Date.now();

		// Don't move if frozen by ICE power-up
		if (now < this.frozenUntil) {
			this.xVal = 0;
			return;
		}

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

			// Handle POTION power-up (inverted controls)
			const isInverted = now < this.invertedUntil;

			if (this.isLeftPressed) {
				this.xVal = isInverted ? 1 : -1;
			} else if (this.isRightPressed) {
				this.xVal = isInverted ? -1 : 1;
			} else {
				this.xVal = 0;
			}
		} else {
			if (GameFourBonus.keysPressed[KeyBindings.LEFTTWO]) {
				this.xVal = now < this.invertedUntil ? 1 : -1;
			} else if (GameFourBonus.keysPressed[KeyBindings.RIGHTTWO]) {
				this.xVal = now < this.invertedUntil ? -1 : 1;
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

	private gameRef!: GameFourBonus;
	private readonly canvasWidth: number;
	private readonly canvasHeight: number;

	private lastTouchedBy: 'player1' | 'player2' | 'player3' | 'player4' | null = null;

	public setGameRef(game: GameFourBonus)
	{
		this.gameRef = game;
	}

	public getLastTouchedBy(): 'player1' | 'player2' | 'player3' | 'player4' | null
	{
		return this.lastTouchedBy;
	}

	private baseSpeed: number = 5; // Changed from 7 to 5
	private speed: number = this.baseSpeed; // Lié au bonus SPEED

	public getSpeed(): number {
		return this.speed;
	}

	public increaseSpeed(factor: number)
	{
		this.speed = Math.min(this.speed * factor, 15);
	}

	private onGoalCallback: (() => void) | null = null; //Pour réinitialiser les bonus, appel dans Game

	public setOnGoalCallback(callback: () => void) {
		this.onGoalCallback = callback;
	}

	constructor(w: number, h: number, x: number, y: number, canvasWidth: number, canvasHeight: number) {
		super(w, h, x, y);
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.resetBallPosition(); // Positionne la balle au centre du terrain avec une direction aléatoire
	}

	// Fonction pour réinitialiser la position de la balle apres un but.
	resetBallPosition() {
		let margin = 50;
		this.x = this.canvasWidth / 2 - this.width / 2 + (Math.random() * margin - margin / 2);
		this.y = this.canvasHeight / 2 - this.height / 2 + (Math.random() * margin - margin / 2);

		let randomDirection = Math.floor(Math.random() * 2) + 1;
		this.xVal = randomDirection % 2 ? 1 : -1;
		this.yVal = (Math.random() * 2 - 1) * 2;
	}

	async checkGameEnd(): Promise<boolean> {
		const highestScore = Math.max(
			GameFourBonus.player1Score,
			GameFourBonus.player2Score,
			GameFourBonus.player3Score,
			GameFourBonus.player4Score
		);

		if (highestScore >= MAX_SCORE) {
			// Determiner le gagnant.
			let winner = "";
			if (GameFourBonus.player1Score >= MAX_SCORE) winner = "Joueur 1";
			else if (GameFourBonus.player2Score >= MAX_SCORE) winner = "Joueur 2";
			else if (GameFourBonus.player3Score >= MAX_SCORE) winner = "Joueur 3";
			else if (GameFourBonus.player4Score >= MAX_SCORE) winner = "Joueur 4";

			// Enregistrer les scores.
			const matchId = localStorage.getItem('currentMatchId');
			if (matchId) {
				try {
					const response = await fetch("/api/players/match4/score", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							matchId: parseInt(matchId),
							player1Score: GameFourBonus.player1Score,
							player2Score: GameFourBonus.player2Score,
							player3Score: GameFourBonus.player3Score,
							player4Score: GameFourBonus.player4Score
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
				screenReaderInstance.announceScore(GameFourBonus.player1Score, GameFourBonus.player2Score, GameFourBonus.player3Score, GameFourBonus.player4Score);
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
			GameFourBonus.setGameOver(true);
			return true;
		}
		return false;
	}

	update(player1: Paddle, player2: Paddle2, player3: Paddle3, player4: Paddle4, canvas: HTMLCanvasElement) {
		// Si le jeu est en pause, on ne met pas à jour la position de la balle.
		if (isPaused) return;

		// Verification des buts dans les camps respectifs.
		if (this.x <= 0) {
			GameFourBonus.player1Score += 1;

			screenReader.getInstance().handleScoreP1Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.x + this.width >= canvas.width) {
			GameFourBonus.player2Score += 1;

			screenReader.getInstance().handleScoreP2Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}

			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.y <= 0) {
			GameFourBonus.player3Score += 1;

			screenReader.getInstance().handleScoreP3Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}

			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
		}

		if (this.y + this.height >= canvas.height) {
			GameFourBonus.player4Score += 1;

			screenReader.getInstance().handleScoreP4Hit();

			this.resetBallPosition();  // Réinitialiser la position de la balle au centre.
			if (this.onGoalCallback) {
				this.onGoalCallback(); // Réinitialise bonus et minuteur
			}

			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				this.checkGameEnd();
			}, pauseDuration);
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

		// Collision avec joueur 3 (paddle vertical).
		if (this.y <= player3.y + player3.height &&
			this.y >= player3.y &&
			this.x + this.width >= player3.x &&
			this.x <= player3.x + player3.width) {
			let relativeX = (this.x + this.width / 2) - (player3.x + player3.width / 2);
			let normalizedX = relativeX / (player3.width / 2);
			this.yVal = 1;
			this.xVal = normalizedX * 1.2;
			this.lastTouchedBy = 'player3';
			screenReader.getInstance().handleUpPaddleHit();
		}

		// Collision avec joueur 4 (paddle vertical).
		if (this.y + this.height >= player4.y &&
			this.y <= player4.y + player4.height &&
			this.x + this.width >= player4.x &&
			this.x <= player4.x + player4.width) {
			let relativeX = (this.x + this.width / 2) - (player4.x + player4.width / 2);
			let normalizedX = relativeX / (player4.width / 2);
			this.yVal = -1;
			this.xVal = normalizedX * 1.2;
			this.lastTouchedBy = 'player4';
			screenReader.getInstance().handleDownPaddleHit();
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

		// Mise a jour de la position de la balle.
		const length = Math.sqrt(this.xVal * this.xVal + this.yVal * this.yVal);
		this.x += (this.xVal / length) * this.speed;
		this.y += (this.yVal / length) * this.speed;
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

	public getPosition() {
		return { x: this.x, y: this.y };
	}
}