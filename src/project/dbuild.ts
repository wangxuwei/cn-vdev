import { spawn } from 'p-spawn';
import { HTTP_BASE_URL, startServer, stopServer } from '../server/main';
import { getDockerfileContent, getPackageJsonContent, getProjectPath, getServicePaths, hasDockerfile, hasPackageJson, updateDockerFileContent } from './utils-path';

const commentStartTag = "# ms-script";
const commentEndTag = "# /ms-script";

export async function dbuild(servicesStr: string) {
	const projectPath = await getProjectPath();

	const originContents: { [name: string]: string } = {};
	const servicesPath = await getServicePaths(projectPath);
	try {
		// update
		for (const servicePath of servicesPath) {
			if (!(await hasDockerfile(servicePath))) {
				continue;
			}
			let dockerContent = await getDockerfileContent(servicePath);
			originContents[servicePath] = dockerContent;
			dockerContent = await updateNpmImageIfNeed(dockerContent);
			dockerContent = await updateApkSourceIfNeed(dockerContent);
			dockerContent = await updateAptGetSourceIfNeed(dockerContent);
			if (await hasPackageJson(servicePath)) {
				const packageJson = await getPackageJsonContent(servicePath);
				dockerContent = await updateSharpInstallIfNeed(dockerContent, packageJson);
			}
			await updateDockerFileContent(servicePath, dockerContent);
		}
		console.log("Dockerfile updated.");
		await startServer();
		const args = ["dbuild"];
		if (servicesStr) {
			args.push(servicesStr);
		}
		await spawn("./node_modules/.bin/vdev", args, { cwd: projectPath });

	} catch (e) {
		console.log(e);
	} finally {
		// revert back
		for (const servicePath of servicesPath) {
			if (!originContents[servicePath]) {
				continue;
			}
			await updateDockerFileContent(servicePath, originContents[servicePath]);
		}

		await stopServer();
		console.log("Dockerfile reverted back.");
		process.exit(0);
	}
}

export async function revertDbuild() {
	const projectPath = await getProjectPath();
	const servicesPath = await getServicePaths(projectPath);
	// update
	for (const servicePath of servicesPath) {
		if (!(await hasDockerfile(servicePath))) {
			continue;
		}
		let dockerContent = await getDockerfileContent(servicePath);

		// first \s is line start
		const reg = new RegExp(`\\s${commentStartTag}[\\s\\S]*?${commentEndTag}`, "g");
		dockerContent = dockerContent.replace(reg, "");
		await updateDockerFileContent(servicePath, dockerContent);
	}
}

async function updateNpmImageIfNeed(dockerContent: string) {
	let dockerSteps = dockerContent.split("\n");

	const npmInstallStep = dockerSteps.filter((step) => {
		if (step.indexOf("RUN npm install") > -1) {
			return true;
		}
		return false;
	})[0];

	if (npmInstallStep) {
		dockerSteps = await insertAfterImageStep(dockerSteps, ["RUN npm config set registry https://registry.npm.taobao.org --global"]);
	}
	return dockerSteps.join("\n");
}

async function updateApkSourceIfNeed(dockerContent: string) {
	let dockerSteps = dockerContent.split("\n");

	const apkStep = dockerSteps.filter((step) => {
		if (step.indexOf("RUN apk ") > -1) {
			return true;
		}
		return false;
	})[0];

	if (apkStep) {
		dockerSteps = await insertAfterImageStep(dockerSteps, ["RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories"]);
	}
	return dockerSteps.join("\n");
}

async function updateAptGetSourceIfNeed(dockerContent: string) {
	let dockerSteps = dockerContent.split("\n");

	const aptGetStep = dockerSteps.filter((step) => {
		if (step.indexOf("RUN apt-get ") > -1
			|| dockerContent.indexOf("britesnow/base-agent") > -1
			|| dockerContent.indexOf("britesnow/base-node") > -1) {
			return true;
		}
		return false;
	})[0];

	if (aptGetStep) {
		const insertSteps = [
			"RUN sed -i s@/deb.debian.org/@/mirrors.aliyun.com/@g /etc/apt/sources.list",
			"RUN sed -i s@/security.debian.org/@/mirrors.aliyun.com/@g /etc/apt/sources.list",
			"RUN apt-get clean"
		];
		dockerSteps = await insertAfterImageStep(dockerSteps, insertSteps);
	}
	return dockerSteps.join("\n");
}

async function updateSharpInstallIfNeed(dockerContent: string, packageJson: any) {
	let dockerSteps = dockerContent.split("\n");
	if (packageJson.dependencies.sharp) {
		const fileUrl = `${HTTP_BASE_URL}/data/`;
		const insertSteps = [
			`RUN npm config set sharp_dist_base_url ${fileUrl}`
		];
		dockerSteps = await insertAfterImageStep(dockerSteps, insertSteps);
	}
	return dockerSteps.join("\n");
}

async function insertAfterImageStep(dockerSteps: string[], steps: string[]) {
	let fromSetupIndex = 0;
	const newSteps = [commentStartTag, ...steps, commentEndTag];
	for (let i = 0; i < dockerSteps.length; i++) {
		const step = dockerSteps[i];
		if (step.indexOf("FROM ") > -1) {
			fromSetupIndex = i;
		}
	}
	dockerSteps.splice(fromSetupIndex + 1, 0, ...newSteps);
	return dockerSteps;
}
