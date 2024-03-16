import { readdirSync } from "node:fs";
import { exec } from "node:child_process";
import { logger } from "../logger.ts";

/**
 * Find all the valid data model paths in the given directory.
 *
 * @param path
 */
export function parseValidDataModelPaths(path = "./") {
  let validDataModelPaths: string[] = [];
  try {
    readdirSync(`${path}/models`).forEach(async (file) => {
      if (file.endsWith(".metadata.json")) {
        const modelFile = Bun.file(`${path}/models/${file}`);
        const metadata = await modelFile.json();
        let allKeys: string[] = [];
        try {
          allKeys = Object.keys(metadata.Elements);
        } catch (e) {
          try {
            allKeys = Object.keys(metadata.elements);
          } catch (e) {
            allKeys = [];
          }
        }
        const dataModelName = allKeys[0];
        validDataModelPaths.push(
          ...allKeys
            .slice(1)
            .map((key) => key.replace(`${dataModelName}.`, "")),
        );
      }
    });
  } catch (e) {
    // @ts-expect-error errors are unknown
    logger.trace({ message: e.message }, "Could not get valid data model paths");
  }
  return validDataModelPaths;
}

/**
 * Find all the files that implement the IPageOrder interface.
 *
 * @param path
 */
export function findPageOrderFiles(path = "./"): Promise<string[]> {
  const command = `find ${path} -name '*.cs' ! -name 'Program.cs' ! -name 'Startup.cs' -exec grep -l 'IPageOrder' {} +`;
  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      const files = stdout.split("\n").filter(Boolean);
      resolve(files);
      if (error) {
        resolve([]);
      }
    });
  });
}
