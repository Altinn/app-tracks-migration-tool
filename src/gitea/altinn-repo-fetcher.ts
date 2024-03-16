import fs from "node:fs/promises";
import { constants } from "node:fs";
import { cd, gitClone } from "./repo-updater.ts";
import { logger } from "../logger.ts";

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

export async function collectAllRepos(): Promise<Repo[]> {
  let page = 1;
  let repos: Repo[] = [];
  let newRepos: Repo[] = [];
  do {
    logger.info({ page }, "Fetching repos");
    newRepos = await findReposForUpdater(page);
    repos = [...repos, ...newRepos];
    page++;
  } while (newRepos.length != 0);
  return repos;
}

export async function collectAllStarredRepos(): Promise<Set<number>> {
  let page = 0;
  let repos: Repo[] = [];
  let newRepos: Repo[] = [];
  do {
    logger.info({ page, newRepos: newRepos.length }, "Fetching starred repos");
    newRepos = await getStarredRepos(page);
    repos = [...repos, ...newRepos];
    page++;
  } while (newRepos.length != 0);
  return new Set(repos.map((repo) => repo.id));
}

export async function getStarredRepos(page: number): Promise<Repo[]> {
  const url = `${BASE_URL}/user/starred?page=${page}&limit=999`;
  const response = await fetch(url, {
    headers: HEADERS,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch starred repos");
  }

  const repos = (await response.json()) as GiteaRepository[];
  return repos?.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.clone_url,
    owner: r.owner.username,
  }));
}

export async function starRepo(repo: Repo) {
  const url = `${BASE_URL}/user/starred/${repo.owner}/${repo.name}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: HEADERS,
  });
  if (!response.ok) {
    logger.error(
      {
        status: response.status,
        statusText: response.statusText,
        repo,
        url,
        response: await response.json(),
      },
      "Failed to star repo",
    );
    throw new Error("Failed to star repo");
  }
}

export async function findReposForUpdater(page: number): Promise<Repo[]> {
  const url = `${BASE_URL}/user/repos?page=${page}&limit=50`;
  const response = await fetch(url, {
    headers: HEADERS,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch repos");
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
    logger.error(
      { status: response.status, message: response.statusText, repo },
      "Failed to fetch PR for repo",
    );
    // TODO: This should be handled better.
    if (response.status === 404) {
      return true;
    }
    throw new Error("Failed to fetch PR for repo");
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
