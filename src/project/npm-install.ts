import { spawn } from 'p-spawn';
import { HTTP_BASE_URL, startServer, stopServer } from '../server/main';
import { getPackageJsonContent, getProjectPath } from './utils-path';

export async function npmInstall() {
	const projectPath = await getProjectPath();

	const packageJson = await getPackageJsonContent(projectPath);
	try {
		// update
		if (packageJson.dependencies.sharp) {
			const fileUrl = `${HTTP_BASE_URL}/data/`;
			await spawn("npm", ["config", "set", "sharp_dist_base_url", fileUrl], { cwd: projectPath });
		}

		await startServer();
		await spawn("npm", ["install"], { cwd: projectPath });

	} catch (e) {
		console.log(e);
	} finally {
		// revert back
		if (packageJson.dependencies.sharp) {
			await spawn("npm", ["config", "delete", "sharp_dist_base_url"], { cwd: projectPath });
		}
		await stopServer();
		process.exit(0);
	}
}
