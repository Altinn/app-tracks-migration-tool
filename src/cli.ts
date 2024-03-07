import m from "minimist";
import progress from "cli-progress";

const args: Record<string, string> = m(process.argv.slice(2));

/**
 * Find an argument by name.
 *
 * @param name
 */
export function findArgByName(name: string) {
  const arg = args[name];
  if (Array.isArray(arg)) return arg?.[0];
  return arg;
}

/**
 * Get the content of a file as a string.
 * @param filePath
 */
export async function fileAsString(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  return file.text();
}

export const ProgressBar = new progress.SingleBar({}, progress.Presets.shades_classic);
