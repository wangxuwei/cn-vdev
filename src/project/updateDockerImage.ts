import { getDockerfileContent, getProjectPath, getServicePaths, hasDockerfile, updateDockerFileContent } from './utils-path';

const commentStartTag = "# ms-script";
const commentEndTag = "# /ms-script";

export async function updateDockerImage(servicesStr: string) {
	const projectPath = await getProjectPath();
	const servicesPath = await getServicePaths(projectPath);
	try {
		for (const servicePath of servicesPath) {
			if (!(await hasDockerfile(servicePath))) {
				continue;
			}
			let dockerContent = await getDockerfileContent(servicePath);
			dockerContent = await updateNpmImageIfNeed(dockerContent);
			dockerContent = await updateApkSourceIfNeed(dockerContent);
			dockerContent = await updateAptGetSourceIfNeed(dockerContent);
			dockerContent = await updateCargoMirrorIfNeed(dockerContent);
			await updateDockerFileContent(servicePath, dockerContent);
		}
		console.log("Dockerfile updated.");
	} catch (e) {
		console.log(e);
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
			"RUN apt-get clean",
			"RUN apt-get update"
		];
		dockerSteps = await insertAfterImageStep(dockerSteps, insertSteps);
	}
	return dockerSteps.join("\n");
}

async function updateCargoMirrorIfNeed(dockerContent: string) {
	let dockerSteps = dockerContent.split("\n");

	const cargoStep = dockerSteps.filter((step) => {
		if (step.indexOf("cargo ") > -1 || step.indexOf("RUN cargo") > -1) {
			return true;
		}
		return false;
	})[0];

	if (cargoStep) {
		dockerSteps = await insertAfterImageStep(dockerSteps, [
			"RUN echo '[source.crates-io]' > /root/.cargo/config.toml",
			"RUN echo 'replace-with = \"ustc\"' >> /root/.cargo/config.toml",
			"RUN echo '[source.ustc]' >> /root/.cargo/config.toml",
			"RUN echo 'mirror = \"https://mirrors.ustc.edu.cn/crates.io-index\"' >> /root/.cargo/config.toml"
		]);
	}
	return dockerSteps.join("\n");
}

async function insertAfterImageStep(dockerSteps: string[], steps: string[]) {
	const newSteps = [commentStartTag, ...steps, commentEndTag];
	const fromIndices: number[] = [];
	
	for (let i = 0; i < dockerSteps.length; i++) {
		const step = dockerSteps[i];
		if (step.indexOf("FROM ") > -1) {
			fromIndices.push(i);
		}
	}
	
	for (let i = fromIndices.length - 1; i >= 0; i--) {
		dockerSteps.splice(fromIndices[i] + 1, 0, ...newSteps);
	}
	
	return dockerSteps;
}