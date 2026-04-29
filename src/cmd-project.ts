const router = require('cmdrouter');
import { cleanBranches, cleanNodeModules } from "./project/clean";
import { recreateDb } from "./project/db";
import { npmInstall } from "./project/npm-install";
import { updateNpm } from "./project/update";
import { updateDockerImage } from "./project/updateDockerImage";

router.router({ cleanNodeModules, cleanBranches, updateNpm, recreateDb, updateDockerImage, npmInstall }).route();


