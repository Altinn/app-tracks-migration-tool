import fs from "node:fs/promises";
import { constants } from "node:fs";
import { cd, gitClone } from "./repo-updater.ts";

const BASE_URL = process.env["GITEA_BASE_URL"];
const GITEA_TOKEN = process.env["GITEA_TOKEN"];

const HEADERS = {
  Authorization: `token ${GITEA_TOKEN}`,
};

type GiteaRepository = {
  id: number;
  owner: {
    id: number;
    login: string;
    login_name: string;
    username: string;
  };
  name: string;
  full_name: string;
  description: string;
  empty: boolean;
  private: boolean;
  fork: boolean;
  template: boolean;
  parent: null; // If there can be other types, you should update this to a union type.
  mirror: boolean;
  size: number;
  language: string;
  languages_url: string;
  html_url: string;
  url: string;
  link: string;
  clone_url: string;
};

export type Repo = {
  id: number;
  name: string;
  url: string;
  owner: string;
};
export async function findReposForUpdater(): Promise<Repo[]> {
  const url = `${BASE_URL}/user/repos`;
  const response = await fetch(url, {
    headers: HEADERS,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }

  const repos = (await response.json()) as GiteaRepository[];
  return repos?.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.clone_url,
    owner: r.owner.username,
  }));
}

type PullRequest = {
  id: number;
  url: string;
  user: {
    id: number;
    login: string;
    email: string;
    username: string;
  };
  title: string;
  body: string;
  state: string;
  comments: number;
  merged: false;
  merged_by: null;
  created_at: string;
  updated_at: string;
  closed_at: null;
};

export async function repoHasTracksMigrationPR(repo: Repo) {
  const url = `${BASE_URL}/repos/${repo.owner}/${repo.name}/pulls`;
  const response = await fetch(url, {
    headers: HEADERS,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }

  const pulls = (await response.json()) as PullRequest[];
  return pulls.some((p) => p.user.username === "altinn_sa_ai");
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
