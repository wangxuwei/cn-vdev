const router = require('cmdrouter');
import { cleanBranches, cleanNodeModules } from "./project/clean";
import { recreateDb } from "./project/db";
import { dbuild, revertDbuild } from "./project/dbuild";
import { npmInstall } from "./project/npm-install";
import { updateNpm } from "./project/update";

router.router({ cleanNodeModules, cleanBranches, updateNpm, recreateDb, dbuild, revertDbuild, npmInstall }).route();


