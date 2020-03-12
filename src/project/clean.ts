import { pathExists, readdir } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { join, resolve } from 'path';

export async function cleanBranches(pathDir: string) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = resolve(pathDir);

	const excludeBranches = ["dev"];
	const result = await spawn("git", ["branch"], { cwd: pathDir, capture: "stdout" });
	const branches = `${result.stdout}`.split(/\n/);
	for (const br of branches) {
		const branch = br.trim();
		if (branch && branch.indexOf("*") == -1) {
			let ex = false;
			for (const exBr of excludeBranches) {
				if (exBr == branch) {
					ex = true;
					break;
				}
			}
			if (!ex) {
				const r = await spawn("git", ["branch", "-D", branch], { cwd: pathDir, capture: "stdout" });
				console.log(r.stdout);
			}
		}
	}
}


export async function cleanNodeModules(pathDir: string) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = resolve(pathDir);

	const projectPath = pathDir;
	await spawn("rm", ["-rf", join(projectPath, "node_modules")]);
	await spawn("rm", ["-rf", join(projectPath, "package-lock.json")]);

	const testUIDir = join(projectPath, "test-ui");
	if (await pathExists(testUIDir)) {
		await spawn("rm", ["-rf", join(testUIDir, "node_modules")]);
		await spawn("rm", ["-rf", join(testUIDir, "package-lock.json")]);
	}

	const servicesPath = join(projectPath, "services");
	const files = await readdir(servicesPath);
	for (const dir of files) {
		let fileOrDir = join(servicesPath, dir, "node_modules");
		await deleteFile(fileOrDir);

		fileOrDir = join(servicesPath, dir, "package-lock.json");
		await deleteFile(fileOrDir);

		fileOrDir = join(servicesPath, dir, "dist");
		await deleteFile(fileOrDir);
	}


}


async function deleteFile(pth: string) {
	if (await pathExists(pth)) {
		await spawn("rm", ["-rf", pth]);
	}
}