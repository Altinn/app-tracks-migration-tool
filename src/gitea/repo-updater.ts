import { asyncExec } from "../utils.ts";

const GITEA_TOKEN = process.env["GITEA_TOKEN"];

/**
 * Checkout an existing branch
 */
export async function checkoutBranch(branchName?: string) {
  return asyncExec(`git checkout ${branchName}`);
}

/**
 * Checkout a new branch for the migration.
 * @param branchName
 */
export async function checkoutNewBranch(branchName: string) {
  await asyncExec(`git checkout -b ${branchName}`);
  return branchName;
}

/**
 * Pull latest changes from the remote repository.
 */
export async function gitPull() {
  await asyncExec("git pull");
}

/**
 * Clone a repository from a URL.
 * @param url
 */
export async function gitClone(url: string) {
  return asyncExec(`git clone ${url}`);
}

/**
 * Change the current working directory.
 * @param path
 */
export async function cd(path: string) {
  process.chdir(path);
}
/**
 * Add a file to the git index.
 *
 * @param filePath
 */
export function gitAdd(filePath: string) {
  return asyncExec(`git add ${filePath}`);
}

/**
 * Commit the changes to the git repository with a messages indicating that the migration was automatic.
 */
export function gitCommit() {
  return asyncExec(`git commit -m "Automatic tracks migration"`);
}

/**
 * Push the changes on a new branch to the remote repository.
 */
export function gpsup() {
  return asyncExec(`git push --set-upstream origin HEAD`);
}

/**
 * Create a draft pull request for the changes.
 * @param branchName The name of the branch from which to create a pull request.
 */
export async function draftPullRequest(branchName: string) {
  return fetch(
    "https://altinn.studio/repos/api/v1/repos/mikaelrss/newcomer-sogndal/pulls",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `token ${GITEA_TOKEN}`,
      },
      body: JSON.stringify({
        base: "master",
        head: branchName,
        title: "Automatic tracks migration (generated with AI)",
        body: "This PR is generated with an AI tool. This tool uses LLMs to look at the contents of files implementing IPageOrder and then generates the necessary code changes to preserve the behavior with dynamic expressions.",
      }),
    },
  );
}
