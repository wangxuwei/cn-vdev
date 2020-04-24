
import { glob, writeFile } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename, join } from 'path';
import { getProjectPath } from './utils-path';



export async function recreateDb() {
	const projectPath = await getProjectPath();
	const dataPath = join(__dirname, "../../web-folder/data/");
	console.log(dataPath);

	const files = await glob('prod-*.*', dataPath);
	const file = files.filter(f => {
		if (f.endsWith(".sql")) {
			console.log(f);
			return true;
		}
		return false;
	}).sort((a, b) => {
		return a > b ? -1 : 1;
	})[0];

	// get pod
	const result = await spawn('kubectl', ['get', 'pods', '-l', 'run=halo-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
	const podName = result.stdout.replace("\n", "");

	// ensure
	try {
		await spawn('kubectl', ['exec', '-it', podName, '--', 'mkdir', `tmp`]);
		await spawn('kubectl', ['exec', '-it', podName, '--', 'mkdir', `tmp/sql`]);
	} catch (e) { }

	console.log("db file: " + file);
	// do copy
	await spawn('kubectl', ['cp', file, `${podName}:tmp/sql/`]);
	console.log("copied done");

	// do replace
	const newLines = `    const tmpProdSqlDir = 'tmp/sql/';
		const prodFileName = '${basename(file)}';`;

	const origin = await spawn('kubectl', ['exec', '-it', podName, '--', 'cat', `/service/dist/services/agent/src/db.js`], { capture: 'stdout' });
	await writeFile(join(dataPath, "db.js"), origin.stdout.replace(/const gsFiles(\S|\s)*tmpProdSqlDir\);/g, newLines));

	// do copy
	await spawn('kubectl', ['cp', join(dataPath, "db.js"), `${podName}:/service/dist/services/agent/src/`]);

	// run
	await spawn("npm", ["run", "recreateDb"]);
}