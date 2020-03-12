const router = require('cmdrouter');
import { cleanBranches, cleanNodeModules } from "./project/clean";
import { recreateDb } from "./project/db";
import { updateNpm } from "./project/update";

router.router({ cleanNodeModules, cleanBranches, updateNpm, recreateDb }).route();


