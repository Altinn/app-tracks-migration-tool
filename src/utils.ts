import { exec } from "node:child_process";
import { logger } from "./logger.ts";

export function asyncExec(command: string, cb?: (stdout: string) => void) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        logger.error({ error, command }, "Async execute failed");
        reject(error);
      }
      cb?.(stdout);
      resolve(stdout);
    });
  });
}
