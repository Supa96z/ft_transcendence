/**
 * @brief
 * @param textType
 */
function changeText(textType: string)
{
	// Récupère l'élément body.
	const body = document.body;

	// Supprime les classes de texte actuelles.
	body.classList.remove('text-normal', 'text-large', 'text-bold');

	// Réinitialise toutes les variables CSS de texte à leurs valeurs par défaut.
	const resetCSSVars = () => {
		document.documentElement.style.setProperty('--font-size-base', '');
		document.documentElement.style.setProperty('--font-weight-base', '');
		document.documentElement.style.setProperty('--font-height-base', '');
	};

	resetCSSVars();

	// Met à jour les variables CSS en fonction du type choisit.
	switch(textType) {
		case 'normal':
			body.classList.add('text-normal');
			document.documentElement.style.setProperty('--font-size-base', '1rem');
			document.documentElement.style.setProperty('--font-weight-base', '400');
			document.documentElement.style.setProperty('--line-height-base', '1.5');
			break;

		case 'large':
			body.classList.add('text-large');
			document.documentElement.style.setProperty('--font-size-base', '1.2rem');
			document.documentElement.style.setProperty('--font-weight-base', '400');
			document.documentElement.style.setProperty('--line-height-base', '1.6');
			break;

		case 'bold':
			body.classList.add('text-bold');
			document.documentElement.style.setProperty('--font-size-base', '1rem');
			document.documentElement.style.setProperty('--font-weight-base', '700');
			document.documentElement.style.setProperty('--line-height-base', '1.5');
			break;
	}

	// Sauvegarde la preference dans localStorage.
	localStorage.setItem('textSize', textType);

	// Force la mise à jour du texte.
	updateTextStyles();
}

/**
 * @brief Met a jour les textes.
 */
export function updateTextStyles() {
	const textElements = document.querySelectorAll('p, h3, h4, h5, h6, span, button, a, li');

	textElements.forEach(element => {
		const el = element as HTMLElement;
		el.style.fontSize = '';
		el.style.fontWeight = '';
		el.style.lineHeight = '';
		// Applique les variables CSS de texte.
		el.style.fontSize = 'var(--font-size-base)';
		el.style.fontWeight = 'var(--font-weight-base)';
		el.style.lineHeight = 'var(--line-height-base)';
	});
}

/**
 * @brief Attache les écouteurs d'événements aux boutons de textes.
 */
export function attachTextListeners() {
	const textButtons = document.querySelectorAll('[data-text]');

	textButtons.forEach(button => {
		button.addEventListener('click', (event) => {
			const target = event.currentTarget as HTMLElement;
			const text = target.getAttribute('data-text');
			if (text)
				changeText(text);
		});
	});
}

/**
 * @brief Initialise la taille du texte au chargement de la page.
 */
export function initText() {
	const savedTextSize = localStorage.getItem('textSize') || 'normal'; // Taille par défaut.
	changeText(savedTextSize);
}

const savedTextType = localStorage.getItem('textSize') || 'normal';
changeText(savedTextType);