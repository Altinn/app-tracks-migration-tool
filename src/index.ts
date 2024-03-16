import { cd, isRepoEmpty } from "./gitea/repo-updater";
import {
  collectAllRepos,
  initializeRepository,
} from "./gitea/altinn-repo-fetcher.ts";
import { updateRepository } from "./openai/migrate-tracks.ts";
import { findArgByName, ProgressBar } from "./cli.ts";
import { getProcessedRepos, storeRepo } from "./database/repositories.ts";

const ROOT_DIR = process.cwd();

const repos = await collectAllRepos();
const processedRepos = await getProcessedRepos();
const processedSet = new Set(processedRepos.map((r) => r.repoId));

const reposToProcess = [];
for (const repo of repos) {
  const hasBeenProcessed = processedSet.has(repo.id);
  if (!hasBeenProcessed) {
    reposToProcess.push(repo);
  }
}

ProgressBar.start(reposToProcess.length, 0);

for (const repo of reposToProcess) {
  await cd(ROOT_DIR);
  await initializeRepository(repo);
  if (await isRepoEmpty()) {
    await storeRepo(repo, false);
    continue;
  }
  if (!findArgByName("dry-run")) {
    const createdPr = await updateRepository(repo);
    await storeRepo(repo, createdPr);
  }
  ProgressBar.increment();
}
ProgressBar.stop();
