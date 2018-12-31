const router = require('cmdrouter');
const fs = require('fs-extra-plus');
const path = require('path');
const spawn = require('p-spawn');


router.router({ clean }).route();


async function clean(pathDir) {
	const excludeBranches = ["dev"];
	const result = await spawn.spawn("git", ["branch"], { cwd: pathDir, capture: "stdout" });
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
				const r = await spawn.spawn("git", ["branch", "-D", branch], { cwd: pathDir, capture: "stdout" });
				console.log(r.stdout);
			}
		}
	}
}
