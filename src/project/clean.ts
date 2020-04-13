import { pathExists } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { join } from 'path';
import { getProjectPath, getServicePaths, getTestUIPath } from './utils-path';

export async function cleanBranches() {
	const projectPath = await getProjectPath();

	const excludeBranches = ["dev"];
	const result = await spawn("git", ["branch"], { cwd: projectPath, capture: "stdout" });
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
				const r = await spawn("git", ["branch", "-D", branch], { cwd: projectPath, capture: "stdout" });
				console.log(r.stdout);
			}
		}
	}
}


export async function cleanNodeModules() {
	const projectPath = await getProjectPath();

	await spawn("rm", ["-rf", join(projectPath, "node_modules")]);
	await spawn("rm", ["-rf", join(projectPath, "package-lock.json")]);

	const testUIDir = await getTestUIPath(projectPath);
	if (await pathExists(testUIDir)) {
		await spawn("rm", ["-rf", join(testUIDir, "node_modules")]);
		await spawn("rm", ["-rf", join(testUIDir, "package-lock.json")]);
	}

	const servicePaths = await getServicePaths(projectPath);
	for (const servicePath of servicePaths) {
		let fileOrDir = join(servicePath, "node_modules");
		await deleteFile(fileOrDir);

		fileOrDir = join(servicePath, "package-lock.json");
		await deleteFile(fileOrDir);

		fileOrDir = join(servicePath, "dist");
		await deleteFile(fileOrDir);
	}

}


async function deleteFile(pth: string) {
	if (await pathExists(pth)) {
		await spawn("rm", ["-rf", pth]);
	}
}