import { t } from '../lang/i18n.js'

export function homePage() {
	// Page d'acceuil du site.
	return `
		<div class="fixed top-4 right-4 z-10">
			<!-- Boutons pour choisir sa langue. -->
			<div class="flex gap-2">
				<button aria-label="français" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-lang="fr">
					<img src="/static/fr.png" alt="français" class="w-8 h-6 rounded object-cover">
				</button>
				<button aria-label="english" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-lang="en">
					<img src="/static/en.png" alt="English" class="w-8 h-6 rounded object-cover">
				</button>
				<button aria-label="español" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-lang="es">
					<img src="/static/es.png" alt="español" class="w-8 h-6 rounded object-cover">
				</button>
			</div>
		</div>

		<div class="fixed top-4 left-4 z-10">
		<!-- Boutons pour choisir son theme. -->
			<div class="flex gap-2">
				<button aria-label="catpuccin" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-theme="CP">
					<div class="w-8 h-6 bg-catpuccin border-2 border-black rounded transition hover:ring-2 hover:ring-accent"></div>
				</button>
				<button aria-label="${t("high_contrast")}" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-theme="HC">
					<div class="w-8 h-6 bg-green-600 text-white rounded transition hover:ring-2 hover:ring-accent">HC</div>
				</button>
				<button aria-label="oled" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-theme="OLED">
					<div class="w-8 h-6 bg-black rounded transition hover:ring-2 hover:ring-accent"></div>
				</button>
				<button aria-label="${t("white")}" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-theme="WHITE">
					<div class="w-8 h-6 bg-gray-100 border border-gray-300 rounded transition hover:ring-2 hover:ring-accent"></div>
				</button>
			</div>
		</div>
		
		<div class="fixed top-11 left-4 z-10">
		<!-- Boutons pour choisir la taille du texte. -->
			<div class="flex gap-2">
				<button aria-label="${t("normal_text")}" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-text="normal">
					<div class="w-8 h-6 text-green rounded transition hover:ring-2 hover:ring-accent text-sm flex items-center justify-center">Tx</div>
				</button>
				<button aria-label="${t("large_text")}" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-text="large">
					<div class="w-8 h-6 text-green rounded transition hover:ring-2 hover:ring-accent text-base flex items-center justify-center">Lg</div>
				</button>
				<button aria-label="${t("bold_text")}" class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent" data-text="bold">
					<div class="w-8 h-6 text-green rounded transition hover:ring-2 hover:ring-accent font-bold flex items-center justify-center">Bl</div>
				</button>
			</div>
		</div>
		
		<div class="fixed top-18 left-4 z-10">
			<!-- Bouton pour activer le lecteur d'écran -->
			<button id="screen-reader-toggle" 
					class="transition rounded hover:brightness-110 focus:ring-2 focus:ring-accent bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"
					aria-label="${t("enable_screen_reader")}"
					title="Activer/Désactiver le lecteur d'écran"
					role="switch"
					aria-pressed="false">
				<img src="/static/megaphone.png" 
					 alt="${t("enable_screen_reader")}" 
					 class="w-8 h-6 rounded object-cover"
					 aria-hidden="true">
			</button>
			<p>${t("chrome_recommendation")}</p>
		</div>

		<!-- Div centrant les elements au centre. -->
		<div class="flex items-center justify-center min-h-screen px-4">
			<div class="max-w-6xl mx-auto py-10 text-center">
				<h1 class="font-bold mb-4 text-4xl">Pong</h1>
				<div class="grid grid-cols-1 lg:grid-cols-2 justify-center gap-10 w-full mx-auto">
					<!-- Div de Pong -->
					<div class="rounded-lg border p-4 shadow overflow-hidden">
						<h2 class="mb-2 text-2xl font-semibold">Pong</h2>
						<div id="Pong" class="grid grid-cols-2 justify-center gap-4 overflow-hidden">
							<div class="flex justify-center">
								<button id="match-button" class="btn btn-fixed rounded-lg border p-4 shadow flex justify-center">${t("match")}</button>
							</div>
							<div class="flex justify-center">
								<button id="tournament-button" class="btn btn-fixed rounded-lg border shadow">${t("tournament")}</button>
							</div>
						</div>
					</div>
					<!-- Div de PFC -->
					<div class="rounded-lg border p-4 shadow">
						<h2 class="mb-2 text-2xl font-semibold">${t("pfc")}</h2>
						<div id="pfc" class="grid grid-cols-1 justify-center gap-0">
							<div class="flex justify-center">
								<button id="pfc-button" class="btn btn-fixed rounded-lg border p-4 shadow">${t("play")}</button>
							</div>
						</div>
					</div>
				</div>
				<!-- Div des historiques -->
				<div class="mt-4">
					<div class="mb-4 inline-block rounded-lg border p-2 shadow">
   						 <h2 class="text-xl font-semibold">${t("history")}</h2>
					</div>
					<div class="grid grid-cols-2 gap-10">
						<div id="history-pong" class="flex flex-col items-end gap-2">
							<button aria-label="${t("history-2")}" id="pong-hist-btn" class="btn btn-fixed rounded-lg border p-1 pe-1 shadow">${t("history_2")}</button>
							<button aria-label="${t("history-4")}" id="fourpong-hist-btn" class="btn btn-fixed rounded-lg border p-1 pe-1 shadow">${t("history_4_btn")}</button>
						</div>
						<div id="history-pfc" class="flex justify-start items-start">
							<button id="pfc-hist-btn" class="btn btn-fixed rounded-lg border p-1 pe-1 shadow">${t("history_pfc")}</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
}