import { cd } from "./gitea/repo-updater";
import {
  findReposForUpdater,
  initializeRepository,
  repoHasTracksMigrationPR,
} from "./gitea/altinn-repo-fetcher.ts";
import { updateRepository } from "./openai/migrate-tracks.ts";
import { ProgressBar } from "./cli.ts";

const ROOT_DIR = process.cwd();

const repos = await findReposForUpdater();

const reposToProcess = [];
for (const repo of repos) {
  if (!(await repoHasTracksMigrationPR(repo))) {
    reposToProcess.push(repo);
  }
}
ProgressBar.start(reposToProcess.length, 0);

for (let i = 0; i < reposToProcess.length; i++) {
  await cd(ROOT_DIR);
  await initializeRepository(reposToProcess[i]);
  await updateRepository(reposToProcess[i]);
  ProgressBar.increment();
}
ProgressBar.stop();
