export function isValidString(str: string): boolean {
	const regex = /^[a-zA-Z0-9\s\-_]*$/;

	console.warn(`Validating string: "${str}" against regex: ${regex}`);
	console.warn(`Regex test result: ${regex.test(str)}`);

	return regex.test(str);
}
