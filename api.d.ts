export type FileChange = {
	filePath: string;
	originalContent: string;
	newContent: string;
};

export type ReplaceInFilesOptions = {
	find?: Array<string | RegExp>;
	replacement?: string; // Required when `find` exists
	ignoreCase?: boolean;
	glob?: boolean;
	dryRun?: boolean;
	transform?: (content: string, filePath: string) => string;
};

export default function replaceInFiles(
	paths: string | readonly string[],
	options?: ReplaceInFilesOptions,
): Promise<void | FileChange[]>;
