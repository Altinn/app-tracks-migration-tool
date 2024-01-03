import { exec } from "node:child_process";
import { readdirSync } from "node:fs";

const GITEA_TOKEN = process.env["GITEA_TOKEN"];

/**
 * Update the hidden property on a specific page given the page name and the expression to put in the hidden property.
 *
 * @param page
 * @param expression
 */
type UpdateHiddenArgs = {
  page: string;
  expression: string;
};

export async function updatePageHidden({ page, expression }: UpdateHiddenArgs) {
  const filePath = getFilePath(page);
  await updateHiddenExpression(filePath, expression);
  await gitAdd(filePath);
  return "void";
}

export async function checkoutBranch() {
  const branchName = `v4-automatic-tracks-migration-${Date.now()}`;
  await asyncExec(`git checkout -b ${branchName}`);
  return branchName;
}

export function gitStatus() {
  return asyncExec("git status");
}

export function gitAdd(filePath: string) {
  return asyncExec(`git add ${filePath}`);
}

export function gitCommit() {
  return asyncExec(`git commit -m "Automatic tracks migration"`);
}
export function gpsup() {
  return asyncExec(`git push --set-upstream origin HEAD`);
}

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

function updateHiddenExpression(filePath: string, expression: string) {
  const command = `jq '.data  += {"hidden": ${expression}}' ${filePath}`;
  return asyncExec(command, (result) => {
    Bun.write(filePath, result);
  });
}

function getFilePath(pageName: string) {
  console.log("Get file path: ", pageName);
  const files = readdirSync(".", {
    recursive: true,
  }) as string[];
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
