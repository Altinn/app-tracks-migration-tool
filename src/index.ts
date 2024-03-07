import { cd } from "./gitea/repo-updater";
import {
  findReposForUpdater,
  initializeRepository,
} from "./gitea/altinn-repo-fetcher.ts";
import { updateRepository } from "./openai/migrate-tracks.ts";
import { ProgressBar } from "./cli.ts";

const repos = await findReposForUpdater();
ProgressBar.start(repos.length, 0);
const rootDirectory = process.cwd();

// TODO: filter out repositories that already have received a PR from the AI.
for (let i = 0; i < repos.length; i++) {
  await cd(rootDirectory);
  await initializeRepository(repos[i]);
  await updateRepository("./App");
  ProgressBar.update(i + 1);
  console.log("Current working directory: ", process.cwd());
}
ProgressBar.stop();
