import m from "minimist";

const args: Record<string, string> = m(process.argv.slice(2));

export function findArgByName(name: string) {
  const arg = args[name];
  if (Array.isArray(arg)) return arg?.[0];
  return arg;
}

export async function fileAsString(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  return file.text();
}
