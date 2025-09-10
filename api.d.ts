export type FileChange = {
	filePath: string;
	originalContent: string;
	newContent: string;
};

export default function replaceInFiles(
	path: string | string[],
	options: {
		find: Array<string | RegExp>;
		replacement: string;
		ignoreCase?: boolean;
		glob?: boolean;
		dryRun?: boolean;
	},
): Promise<void | FileChange[]>;
