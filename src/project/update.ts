import { pathExists, readdir, stat } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename, join } from 'path';
import { getProjectPath, getServicePaths, getTestFolderPath, getTestWebUIFolderPath } from './utils-path';


export async function updateNpm() {
	const projectPath = await getProjectPath();

	console.log("updating...");
	await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: projectPath });

	const testDir = await getTestFolderPath(projectPath);
	if (await pathExists(testDir) && await pathExists(join(testDir, "package.json"))) {
		await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: testDir });
	}

	const testWebUIDir = await getTestWebUIFolderPath(projectPath);
	if (await pathExists(testWebUIDir) && await pathExists(join(testWebUIDir, "package.json"))) {
		await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: testWebUIDir });
	}

	const servicesPath = await getServicePaths(projectPath);
	for (const serviceDir of servicesPath) {
		const st = await stat(serviceDir);
		if (!st.isDirectory()) {
			continue;
		}
		const files = await readdir(serviceDir);
		const packageFile = files.filter((f) => {
			if (basename(f) == "package.json") {
				return true;
			}
			return false;
		})[0];
		if (packageFile) {
			await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: serviceDir });
		}
	}
	console.log("finished");
}