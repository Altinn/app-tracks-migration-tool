import fs from "node:fs/promises";
import { constants } from "node:fs";
import { cd, gitClone } from "./repo-updater.ts";

const BASE_URL = process.env["GITEA_BASE_URL"];
const GITEA_TOKEN = process.env["GITEA_TOKEN"];

type GiteaRepository = {
  id: number;
  name: string;
  clone_url: string;
};

type Repo = {
  id: number;
  name: string;
  url: string;
};

export async function findReposForUpdater(): Promise<Repo[]> {
  const url = `${BASE_URL}/user/repos`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITEA_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }

  const repos = (await response.json()) as GiteaRepository[];
  return repos?.map((r) => ({ id: r.id, name: r.name, url: r.clone_url }));
}

export async function initializeRepository(repo: Repo) {
  if (await folderExists(repo.name)) {
    await cd(repo.name);
  } else {
    await gitClone(repo.url);
    await cd(repo.name);
  }
}

async function folderExists(path: string) {
  return new Promise((resolve) => {
    fs.access(path, constants.F_OK)
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}
