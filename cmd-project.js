const router = require('cmdrouter');
const fs = require('fs-extra-plus');
const path = require('path');
const spawn = require('p-spawn');
const v = require('vdev');


router.router({ cleanNodeModules, updateNpm, recreateDb }).route();


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

async function recreateDb(pathDir) {
	if (!pathDir) {
		pathDir = ".";
	}
	pathDir = path.resolve(pathDir);

	const dataPath = path.join(pathDir, '~data/');
	const dropFilesDir = path.join(pathDir, '/services/agent/src/upgrade');
	const distDir = 'dist/services/agent';
	const dbScriptsDir = 'src/db_scripts';

	const sqlDir = path.join(pathDir, '/services/agent/sql');
	const host = 'localhost';

	const dbPrefix = 'halo_';
	const dbOpts = { user: dbPrefix + "user", db: dbPrefix + "db", host: host };

	//// 1) Drop the halo_ db and user
	const t = await v.pgTest(dbOpts);
	if (t.success) { // drop only if exist
		// local test: // psql -U postgres -d postgres -f sql/_drop-db.sql
		await v.psqlImport({ user: "postgres", db: "postgres", host }, [`${sqlDir}/_drop-db.sql`]);
	}

	//// 2) create the halo_... databse / user
	// local test: psql -U postgres -d postgres -f sql/00_create-db.sql
	await v.psqlImport({ user: "postgres", db: "postgres", host }, [`${sqlDir}/00_create-db.sql`]);

	//// 4) Import the prod sql
	// local test: psql -U halo_user -d halo_db -f ~tmp/sql/prod-db.sql
	const files = await fs.glob('prod-*.*', dataPath);
	console.log(files);
	const file = files.filter(f => {
		if (f.endsWith(".sql")) {
			console.log(f);
			return true;
		}
		return false;
	}).sort((a, b) => {
		return a > b ? -1 : 1;
	})[0];
	await v.psqlImport(dbOpts, file);

	//// 5) Reset the passwords to welcome (clear)
	const distFileName = path.join(distDir, dbScriptsDir, '_reset-passwords.ts').replace(".ts", ".js");
	const arg = distFileName;
	const result = await spawn.spawn('kubectl', ['get', 'pods', '-l', 'run=halo-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
	const podName = result.stdout.replace("\n", "");
	await spawn.spawn('kubectl', ['exec', '-it', podName, '--', 'node', arg]);

	//// 6) Import the drop sqls

	// TODO: need to gets the db changelog first, to run only what is missing.
	const dropFiles = await fs.glob('drop-*.*', dropFilesDir);
	console.log('dropFiles\n', dropFiles);
	for (const dropFile of dropFiles) {
		// run .ts and .sql files
		if (dropFile.endsWith(".sql")) {
			await v.psqlImport(dbOpts, [dropFile]);
		}
		if (dropFile.endsWith(".ts")) {
			// run the ts file
			const distFileName = dropFile.replace(".ts", ".js");
			const arg = path.join(distDir, 'src/upgrade', path.basename(distFileName));
			const result = await spawn.spawn('kubectl', ['get', 'pods', '-l', 'run=halo-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
			const podName = result.stdout.replace("\n", "");
			await spawn.spawn('kubectl', ['exec', '-it', podName, '--', 'node', arg]);
		}
	}
}



async function deleteFile(pth) {
	if (await fs.pathExists(pth)) {
		await spawn.spawn("rm", ["-rf", pth]);
	}
}