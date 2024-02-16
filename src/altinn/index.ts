import { readdirSync } from "node:fs";
import { exec } from "node:child_process";

/**
 * Find all the valid data model paths in the given directory.
 *
 * @param path
 */
export function parseValidDataModelPaths(path = "./") {
  let validDataModelPaths: string[] = [];
  readdirSync(`${path}/models`).forEach(async (file) => {
    if (file.endsWith(".metadata.json")) {
      const modelFile = Bun.file(`${path}/models/${file}`);
      const metadata = await modelFile.json();
      let allKeys = [];
      try {
        allKeys = Object.keys(metadata.Elements);
      } catch (e) {
        allKeys = Object.keys(metadata.elements);
      }
      const dataModelName = allKeys[0];
      validDataModelPaths.push(
        ...allKeys.slice(1).map((key) => key.replace(`${dataModelName}.`, "")),
      );
    }
  });
  return validDataModelPaths;
}

/**
 * Find all the files that implement the IPageOrder interface.
 *
 * @param path
 */
export function findPageOrderFiles(path = "./"): Promise<string[]> {
  const command = `find ${path} -name '*.cs' ! -name 'Program.cs' -exec grep -l 'IPageOrder' {} +`;
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      const files = stdout.split("\n").filter(Boolean);
      resolve(files);
      if (error) {
        console.log("error", error);
        reject(error);
      }
    });
  });
}
