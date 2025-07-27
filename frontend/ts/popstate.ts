import { showAliasInputs, showHistory, showHome, showPlayerCountSelection } from "./script.js";
import { matchTypeChoice } from "./Utilities.js";

type RouteHandler = () => void;

const routes: Record<string, RouteHandler> = {
	'/home': () => {
		showHome();
	},

	'/pong/history/two': () => {
		showHistory('pong');
	},
	'/pong/history/four': () => {
		showHistory('fourpong');
	},

	'/pong/select/type': () => {
		matchTypeChoice('match', 'pong');
	},

	'/pong/normal/playerSize': () => {
		showPlayerCountSelection('match', 'normal');
	},

	'/pong/bonus/playerSize': () => {
		showPlayerCountSelection('match', 'bonus');
	},

	'/pong/normal/select/players/two': () => {
		showAliasInputs(2, 'match', 'normal', 'pong');
	},

	'/pong/normal/select/players/four': () => {
		showAliasInputs(4, 'match', 'normal', 'pong');
	},

	'/pong/bonus/select/players/two': () => {
		showAliasInputs(2, 'match', 'bonus', 'pong');
	},

	'/pong/bonus/select/players/four': () => {
		showAliasInputs(4, 'match', 'bonus', 'pong');
	},

	'/chifoumi/history': () => {
		showHistory('pfc');
	},

	'/chifoumi/select/type': () => {
		matchTypeChoice('match', 'pfc');
	},

	'/chifoumi/normal/select/players': () => {
		showAliasInputs(2, 'match', 'normal', 'pfc');
	},

	'/chifoumi/bonus/select/players': () => {
		showAliasInputs(2, 'match', 'bonus', 'pfc');
	},

};
export function navigate(path: string, options?: { replace: boolean }) {
	if (options?.replace || path === '/home') {
		history.replaceState({ path }, '', path);
	} else {
		history.pushState({ path }, '', path); // ajoute une entrée
	}
	// Déclenchez les écouteurs *avant* d'appeler handleRoute, car handleRoute change le contenu
	navigateListeners.forEach(listener => listener());
	handleRoute(path);
}
type NavigateListener = () => void;
const navigateListeners: NavigateListener[] = [];

export function onNavigate(listener: NavigateListener): () => void {
	navigateListeners.push(listener);
	return () => {
		// Fonction de désabonnement
		const index = navigateListeners.indexOf(listener);
		if (index > -1) {
			navigateListeners.splice(index, 1);
		}
	};
}

export function handleRoute(path: string) {
	const handler = routes[path];
	if (handler) {
		handler();
	} else {
		navigate('/home');
		showHome();
	}
}

window.addEventListener('popstate', (event) => {
	navigateListeners.forEach(listener => listener());
	const state = event.state as { path?: string } | null;
	if (state?.path) {
		handleRoute(state.path);
	} else {
		navigate('/home');
	}
});

//handleRoute(window.location.pathname);