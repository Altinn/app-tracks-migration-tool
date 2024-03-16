import { asyncExec } from "../utils.ts";
import { gitAdd } from "../gitea/repo-updater.ts";
import { readdirSync } from "node:fs";

export function deleteFile(filePath: string) {
  return asyncExec(`rm ${filePath}`);
}

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

export async function removeReferencesToPageOrder(filePath: string) {
  await asyncExec(
    `sed -i '/^.*services.AddTransient<IPageOrder,/d' ${filePath}`,
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
  return asyncExec(command, (result) => Bun.write(filePath, result));
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
