const router = require('cmdrouter');
import { cleanBranches, cleanNodeModules } from "./project/clean";
import { recreateDb } from "./project/db";
import { dbuild } from "./project/dbuild";
import { updateNpm } from "./project/update";

router.router({ cleanNodeModules, cleanBranches, updateNpm, recreateDb, dbuild }).route();


