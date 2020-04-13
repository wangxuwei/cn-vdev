
import { glob } from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import { basename, join } from 'path';
import { pgTest, psqlImport } from 'vdev';
import { getProjectPath } from './utils-path';



export async function recreateDb() {
	const projectPath = await getProjectPath();

	const dataPath = join(projectPath, '~data/');
	const dropFilesDir = join(projectPath, '/services/agent/src/upgrade');
	const distDir = 'dist/services/agent';
	const dbScriptsDir = 'src/db_scripts';

	const sqlDir = join(projectPath, '/services/agent/sql');
	const host = 'localhost';

	const dbPrefix = 'halo_';
	const dbOpts = { user: dbPrefix + "user", db: dbPrefix + "db", host: host };

	//// 1) Drop the halo_ db and user
	const t = await pgTest(dbOpts);
	if (t.success) { // drop only if exist
		// local test: // psql -U postgres -d postgres -f sql/_drop-db.sql
		await psqlImport({ user: "postgres", db: "postgres", host }, [`${sqlDir}/_drop-db.sql`]);
	}

	//// 2) create the halo_... databse / user
	// local test: psql -U postgres -d postgres -f sql/00_create-db.sql
	await psqlImport({ user: "postgres", db: "postgres", host }, [`${sqlDir}/00_create-db.sql`]);

	//// 4) Import the prod sql
	// local test: psql -U halo_user -d halo_db -f ~tmp/sql/prod-db.sql
	const files = await glob('prod-*.*', dataPath);
	console.log(files);
	const file = files.filter(f => {
		if (f.endsWith(".sql")) {
			console.log(f);
			return true;
		}
		return false;
	}).sort((a, b) => {
		return a > b ? -1 : 1;
	});
	await psqlImport(dbOpts, file);

	//// 5) Reset the passwords to welcome (clear)
	const distFileName = join(distDir, dbScriptsDir, '_reset-passwords.ts').replace(".ts", ".js");
	const arg = distFileName;
	const result = await spawn('kubectl', ['get', 'pods', '-l', 'run=halo-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
	const podName = result.stdout.replace("\n", "");
	await spawn('kubectl', ['exec', '-it', podName, '--', 'node', arg]);

	//// 6) Import the drop sqls

	// TODO: need to gets the db changelog first, to run only what is missing.
	const dropFiles = await glob('drop-*.*', dropFilesDir);
	console.log('dropFiles\n', dropFiles);
	for (const dropFile of dropFiles) {
		// run .ts and .sql files
		if (dropFile.endsWith(".sql")) {
			await psqlImport(dbOpts, [dropFile]);
		}
		if (dropFile.endsWith(".ts")) {
			// run the ts file
			const distFileName = dropFile.replace(".ts", ".js");
			const arg = join(distDir, 'src/upgrade', basename(distFileName));
			const result = await spawn('kubectl', ['get', 'pods', '-l', 'run=halo-agent', '--no-headers=true', '-o', 'custom-columns=:metadata.name'], { capture: 'stdout' });
			const podName = result.stdout.replace("\n", "");
			await spawn('kubectl', ['exec', '-it', podName, '--', 'node', arg]);
		}
	}
}