import { readdir } from 'fs-extra-plus';
import { join, resolve } from 'path';


export async function getProjectPath(pathDir: string) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = resolve(pathDir);
	return pathDir;
}

export async function getServicePaths(projectPath: string): Promise<string[]> {
	const servicesPath = join(projectPath, "services");
	const dirs = await readdir(servicesPath);
	return dirs.map((d) => { return join(servicesPath, d) });
}

export async function getTestUIPath(projectPath: string): Promise<string> {
	const testUIDir = join(projectPath, "test-ui");
	return testUIDir;
}

