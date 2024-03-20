import { asyncExec } from "../utils.ts";
import type { Repo } from "./altinn-repo-fetcher.ts";
import { logger } from "../logger.ts";

const GITEA_TOKEN = process.env["GITEA_TOKEN"];
const GITEA_BASE_URL = process.env["GITEA_BASE_URL"];

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
  const urlWithCredentials = url.replace(
    "https://altinn.studio",
    `https://${GITEA_TOKEN}:x-oauth-basic@altinn.studio`,
  );
  return asyncExec(`git clone ${urlWithCredentials}`);
}

export async function isRepoEmpty() {
  const stdout = await asyncExec("ls -a");
  return (
    stdout.length === 10 &&
    stdout.includes(".git") &&
    stdout.includes("..") &&
    stdout.includes(".")
  );
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
 * @param repo - The repository to create the pull request in.
 * @param branchName The name of the branch from which to create a pull request.
 */
export async function draftPullRequest(repo: Repo, branchName: string) {
  const url = `${GITEA_BASE_URL}/repos/${repo.owner}/${repo.name}/pulls`;
  const response = await fetch(url, {
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
      body: `This PR is generated with an AI tool. This tool uses LLMs to look at the contents of files implementing IPageOrder and then generates the necessary code changes to preserve the behavior with dynamic expressions. This means that the behavior of the application could possibly be changed. Make sure that you test your application before merging this PR, as the logic might not be 100% accurate.`,
    }),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, statusText: response.statusText },
      "Failed to create pull request",
    );
  }

  return response;
}
