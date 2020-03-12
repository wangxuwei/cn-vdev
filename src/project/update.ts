import { pathExists, readdir, stat } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename, join, resolve } from 'path';


export async function updateNpm(pathDir: string) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = resolve(pathDir);

	const projectPath = pathDir;
	console.log("updating...");
	await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: projectPath });

	const testUIDir = join(projectPath, "test-ui");
	if (await pathExists(testUIDir)) {
		await spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: testUIDir });
	}

	const servicesPath = join(projectPath, "services");
	const dirs = await readdir(servicesPath);
	for (const dir of dirs) {
		const serviceDir = join(servicesPath, dir);
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