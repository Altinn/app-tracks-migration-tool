import type { Repo } from "../gitea/altinn-repo-fetcher";
import { logger } from "../logger.ts";
import { client } from "./index.ts";

export async function storeRepo(repo: Repo, didMigrate: boolean) {
  try {
    await client.execute({
      sql: "INSERT INTO repositories (name, owner, repo_id, did_migrate) VALUES (?, ?, ?, ?)",
      args: [repo.name, repo.owner, repo.id, didMigrate ? 1 : 0],
    });
  } catch (error) {
    // @ts-expect-error
    if (error.code === "SQLITE_CONSTRAINT") {
      logger.info(
        { repo, didMigrate },
        "This repo is already registered as processed in the database.",
      );
      return;
    }
    throw error;
  }
}

type RowTuple = [number, string, string, number, string, number];
export type ProcessedRepo = {
  id: number;
  name: string;
  owner: string;
  repoId: number;
  createdAt: string;
  didMigrate: boolean;
};

export async function getProcessedRepos(): Promise<ProcessedRepo[]> {
  const result = await client.execute("SELECT * FROM repositories");

  const toJSON = result.toJSON();

  return toJSON.rows.map(
    ([id, name, owner, repo_id, created_at, did_migrate]: RowTuple) => ({
      id,
      name,
      owner,
      repoId: repo_id,
      createdAt: created_at,
      didMigrate: did_migrate === 1,
    }),
  );
}
