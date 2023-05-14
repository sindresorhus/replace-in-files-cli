export default function replaceInFiles(
	path: string | string[],
	options: {
		find: Array<string | RegExp>,
		replacement: string,
		ignoreCase?: boolean,
		glob?: boolean
	},
): Promise<void>;
