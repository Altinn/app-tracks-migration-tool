import type { Repo } from "../gitea/altinn-repo-fetcher";
import { logger } from "../logger.ts";
import { sql } from "./index.ts";

export async function storeRepo(repo: Repo, didMigrate: boolean) {
  try {
    await sql`INSERT INTO repositories (name, owner, repo_id, did_migrate) 
              VALUES (${repo.name}, ${repo.owner}, ${repo.id}, ${didMigrate})`;
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

type RowData = {
  id: number;
  name: string;
  owner: string;
  repo_id: number;
  created_at: string;
  did_migrate: number;
};

export type ProcessedRepo = {
  id: number;
  name: string;
  owner: string;
  repoId: number;
  createdAt: string;
  didMigrate: boolean;
};

export async function getProcessedRepos(): Promise<ProcessedRepo[]> {
  const result = await sql`SELECT * FROM repositories`;

  // @ts-expect-error - The type definition for the Row type is incorrect
  return result.map((row: RowData) => ({
    id: row.id,
    name: row.name,
    owner: row.owner,
    repoId: row.repo_id,
    createdAt: row.created_at,
    didMigrate: row.did_migrate,
  }));
}
