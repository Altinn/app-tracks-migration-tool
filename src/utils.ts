import { exec } from "node:child_process";
import { readdirSync } from "node:fs";

export function asyncExec(command: string, cb?: (stdout: string) => void) {
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
