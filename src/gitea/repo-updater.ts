import { exec } from "node:child_process";
import { readdirSync } from "node:fs";

const GITEA_TOKEN = process.env["GITEA_TOKEN"];

type UpdateHiddenArgs = {
  page: string;
  expression: string;
};

/**
 * Update the hidden property on a specific page given the page name and the expression to put in the hidden property.
 *
 * @param page
 * @param expression
 */
export async function updatePageHidden({ page, expression }: UpdateHiddenArgs) {
  const filePath = getFilePath(page);
  await updateHiddenExpression(filePath, expression);
  await gitAdd(filePath);
}

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
 * Get the status of the git repository.
 */
export async function gitStatus() {
  return asyncExec("git status");
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

/**
 * Use JQ to update the hidden property in the layout file.
 *
 * @param filePath
 * @param expression
 */
function updateHiddenExpression(filePath: string, expression: string) {
  const command = `jq '.data  += {"hidden": ${expression}}' ${filePath}`;
  return asyncExec(command, (result) => {
    Bun.write(filePath, result);
  });
}

/**
 * Get the file path for a specific layout page.
 *
 * @param pageName
 */
function getFilePath(pageName: string) {
  const files = readdirSync(".", { recursive: true }) as string[];
  return files.filter(
    (file) =>
      file.includes(`/${pageName}.json`) &&
      !file.startsWith("bin") &&
      !file.startsWith("obj"),
  )[0];
}

function asyncExec(command: string, cb?: (stdout: string) => void) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        console.log(`error: [${command}]`, error);
        reject(error);
      }
      cb?.(stdout);
      resolve(stdout);
    });
  });
}
