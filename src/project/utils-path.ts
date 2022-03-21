import { pathExists, readdir, readFile, readJSON, writeFile } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { join, resolve } from 'path';

export async function getProjectPath() {
	const pathDir = resolve(".");
	return pathDir;
}

export async function getServicePaths(projectPath: string): Promise<string[]> {
	const servicesPath = join(projectPath, "services");
	const dirs = await readdir(servicesPath);
	return dirs.map((d) => { return join(servicesPath, d) });
}

export async function getTestFolderPath(projectPath: string): Promise<string> {
	const testUIDir = join(projectPath, "test");
	return testUIDir;
}

export async function hasDockerfile(pth: string): Promise<boolean> {
	const dockerPath = join(pth, "Dockerfile");
	return await pathExists(dockerPath);
}

export async function getDockerfileContent(pth: string): Promise<string> {
	const content = await readFile(join(pth, "Dockerfile"));
	return content.toString();
}

export async function updateDockerFileContent(pth: string, content: string) {
	const dockerPath = join(pth, "Dockerfile");
	await writeFile(dockerPath, content);
}

export async function hasPackageJson(pth: string): Promise<boolean> {
	const dockerPath = join(pth, "package.json");
	return await pathExists(dockerPath);
}

export async function getPackageJsonContent(pth: string): Promise<any> {
	const content = await readJSON(join(pth, "package.json"));
	return content;
}

export async function getNpmCachePath(): Promise<any> {
	const result = await spawn("npm", ["config", "get", "cache"], { capture: "stdout" });
	return result.stdout!.replace("\n", "");
}