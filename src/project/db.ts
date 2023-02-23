
import { glob, writeFile } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename, join } from 'path';



export async function recreateDb() {
	const dataPath = join(__dirname, "../../web-folder/data/");
	console.log(dataPath);

	const files = await glob('db-*.dump.gz', dataPath);
	const file = files.filter(f => {
		if (f.endsWith(".dump.gz")) {
			console.log(f);
			return true;
		}
		return false;
	}).sort((a, b) => {
		return a > b ? -1 : 1;
	})[0];

	// get pod
	const result = await spawn('kubectl', ['get', 'pods', '-l', 'run=iva-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
	const podName = result.stdout!.replace("\n", "");

	// ensure
	try {
		await spawn('kubectl', ['exec', '-it', podName, '--', 'mkdir', `tmp`]);
	} catch (e) { }

	console.log("db file: " + file);
	// do copy
	await spawn('kubectl', ['cp', file, `${podName}:tmp/`]);
	console.log("copied done");

	// do replace
	const newLines = `const fileGzName = '${basename(file)}'; 
		const toLocalFileGz = joinPath("tmp/", fileGzName);
	`;

	const origin = await spawn('kubectl', ['exec', '-it', podName, '--', 'cat', `/service/dist/services/agent/src/cmd-db-dev.js`], { capture: 'stdout' });
	await writeFile(join(dataPath, "cmd-db-dev.js"), origin.stdout!.replace(/\/\/ --- Download latest sanitized db(\S|\s)*\/\/ --- Recreate Sanitized Database/g, newLines));

	// do copy
	await spawn('kubectl', ['cp', join(dataPath, "cmd-db-dev.js"), `${podName}:/service/dist/services/agent/src/`]);

	// run
	await spawn("npm", ["run", "recreateDb"]);
}