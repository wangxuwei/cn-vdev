import { pathExists, readdir, stat } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename } from 'path';
import { getProjectPath, getServicePaths, getTestUIPath } from './utils-path';


export async function updateNpm() {
	const projectPath = await getProjectPath();

	console.log("updating...");
	await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: projectPath });

	const testUIDir = await getTestUIPath(projectPath);
	if (await pathExists(testUIDir)) {
		await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: testUIDir });
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