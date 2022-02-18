import httpGracefullShutdown from "http-graceful-shutdown";
import Koa from 'koa';
import koaBody from 'koa-body';
import koaStatic from 'koa-static';
import { networkInterfaces } from 'os';
import { join, resolve } from 'path';

export const HTTP_PORT = 8088;

export const HTTP_BASE_URL = `http://${getIPAdress()}:${HTTP_PORT}`;
export const webDir = resolve(join(__dirname, "../../", "web-folder/"));

let app: Koa | undefined = undefined;

export async function startServer() {
	return new Promise((resolve) => {
		app = new Koa();

		app.use(koaBody());

		// fall back on the static
		app.use(koaStatic(webDir));

		app.listen(HTTP_PORT);

		console.log(`--> web-server - listening at ${HTTP_PORT}`);
		resolve(1);
	});
}


export async function stopServer() {
	httpGracefullShutdown(app, {
		finally: function () {
			app = undefined;
			console.log(`--> web-server - stopped`);
		}
	});
}

function getIPAdress() {
	const interfaces = networkInterfaces();
	for (const devName in interfaces) {
		const iface = interfaces[devName]!;
		for (let i = 0; i < iface.length; i++) {
			const alias = iface[i];
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
				return alias.address;
			}
		}
	}
}