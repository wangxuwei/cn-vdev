const router = require('cmdrouter');
const fs = require('fs-extra-plus');
const path = require('path');
const spawn = require('p-spawn');


router.router({ cleanNodeModules, updateNpm }).route();


async function cleanNodeModules(pathDir) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = path.resolve(pathDir);

	const projectPath = pathDir;
	await spawn.spawn("rm", ["-rf", path.join(projectPath, "node_modules")]);
	await spawn.spawn("rm", ["-rf", path.join(projectPath, "package-lock.json")]);

	const testUIDir = path.join(projectPath, "test-ui");
	if (await fs.pathExists(testUIDir)) {
		await spawn.spawn("rm", ["-rf", path.join(testUIDir, "node_modules")]);
		await spawn.spawn("rm", ["-rf", path.join(testUIDir, "package-lock.json")]);
	}

	const servicesPath = path.join(projectPath, "services");
	const files = await fs.readdir(servicesPath);
	for (const dir of files) {
		let fileOrDir = path.join(servicesPath, dir, "node_modules");
		await deleteFile(fileOrDir);

		fileOrDir = path.join(servicesPath, dir, "package-lock.json");
		await deleteFile(fileOrDir);

		fileOrDir = path.join(servicesPath, dir, "dist");
		await deleteFile(fileOrDir);
	}


}


async function updateNpm(pathDir) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = path.resolve(pathDir);

	const projectPath = pathDir;
	console.log("updating...");
	await spawn.spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: projectPath });

	const testUIDir = path.join(projectPath, "test-ui");
	if (await fs.pathExists(testUIDir)) {
		await spawn.spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: testUIDir });
	}

	const servicesPath = path.join(projectPath, "services");
	const dirs = await fs.readdir(servicesPath);
	for (const dir of dirs) {
		const serviceDir = path.join(servicesPath, dir);
		const st = await fs.stat(serviceDir);
		if (!st.isDirectory()) {
			continue;
		}
		const files = await fs.readdir(serviceDir);
		const packageFile = files.filter((f) => {
			if (path.basename(f) == "package.json") {
				return true;
			}
			return false;
		})[0];
		if (packageFile) {
			await spawn.spawn("ncu", ["-u", "--packageFile", "package.json"], { cwd: serviceDir });
		}
	}
	console.log("finished");
}

async function deleteFile(pth) {
	if (await fs.pathExists(pth)) {
		await spawn.spawn("rm", ["-rf", pth]);
	}
}