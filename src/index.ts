import OpenAI from "openai";
import {
  cd,
  checkoutBranch,
  checkoutNewBranch,
  draftPullRequest,
  gitCommit,
  gitPull,
  gpsup,
  updatePageHidden,
} from "./gitea/repo-updater";
import { updatePageHiddenFn } from "./openai/functions/updatePageHidden";
import { fileAsString, findArgByName } from "./cli";
import { findPageOrderFiles, parseValidDataModelPaths } from "./altinn";
import { getFunctionCalls } from "./openai/functions";
import {
  findReposForUpdater,
  initializeRepository,
} from "./gitea/altinn-repo-fetcher.ts";

const MODEL = "gpt-4-1106-preview";
const API_VERSION = process.env["OPEN_AI_API_VERSION"];
const API_KEY = process.env["OPEN_API_KEY"];
const OPEN_AI_API_ENDPOINT = process.env["OPEN_AI_API_ENDPOINT"];

const client = new OpenAI({
  baseURL: `${OPEN_AI_API_ENDPOINT}/openai/deployments/${MODEL}`,
  apiKey: API_KEY,
  defaultQuery: { "api-version": API_VERSION },
  defaultHeaders: { "api-key": API_KEY },
});

async function updateRepository(path: string) {
  await checkoutBranch("master");
  await gitPull();

  const validDataModelPaths = parseValidDataModelPaths(path);
  const files = await findPageOrderFiles(path);

  if (files.length === 0) {
    console.log("No files found. The repository does not need to be updated.");
    return;
  }

  /**
   * The first message is a description of what the user should do.
   * The following messages are the C# code that the user should extract the logic from.
   * The last message is a description of what the user should do.
   */
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a helpful programming assistant which provides answers that are short and concise.
        You have knowledge of Altinn 3 dynamic expressions which is a DSL that app owners can write in json configuration files to provide dynamic behavior. 
        Functions are defined by an array where the first item is the function name, and the following items are the arguments. 
        Dynamic expressions can be nested infinitely. 
        Valid functions to use are: equals, notEquals, greaterThan, lessThan, greaterThanEq, lessThanEq, concat, and, or,
        if, contains, notContains, commaContains, startsWith, endsWith, lowerCase, upperCase, stringLength, text, language,
        displayValue, round, instanceContext, frontendSettings, dataModel, component. 
        Example: \`"Page1": ["equals" ["dataModel", "funeral.isDead"], true]\``,
    },
  ];

  for (const filePath of files) {
    const fileContent = await fileAsString(filePath);
    messages.push({
      role: "user",
      content: `I have the following C# code: \`\`\`csharp \n\n${fileContent} \n\n\`\`\`.
       Can you extract the logic in the if expressions of the GetPageOrder method?`,
    });
  }

  const chat = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      ...messages,
      {
        role: "user",
        content: `Based on the previous logic expressions, can you convert the expressions into Altinn 3 dynamic expressions 
        for each page. The expression should be used on the "hidden" property of a page layout, such that the page
        is hidden when the expression evaluates to true. 

        Valid paths in the data model are ${validDataModelPaths.join(", ")}.
        Always use double quotes when writing strings inside the expressions.
        
        Use the provided function updatePageHidden to update the hidden property on all of the files.
        You don't need to provide an answer in addition to the function call.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: updatePageHiddenFn,
      },
    ],
  });

  const branchName = await checkoutNewBranch(
    `v4-automatic-tracks-migration-${Date.now()}`,
  );
  const functionCalls = getFunctionCalls(chat);
  /**
   * Each iteration updates a specific file with a hidden expression calculated by GPT-4.
   */
  if (!functionCalls) {
    throw new Error(
      "The AI determined that there should be no calls to the function",
    );
  }
  for (const args of functionCalls) {
    await updatePageHidden(args);
  }

  if (!findArgByName("dry-run")) {
    await gitCommit();
    await gpsup();
    await draftPullRequest(branchName);
  }
}

const repos = await findReposForUpdater();
const rootDirectory = process.cwd();

// TODO: filter out repositories that already have received a PR from the AI.
for (const repo of repos) {
  await cd(rootDirectory);
  await initializeRepository(repo);
  await updateRepository("./App");
  console.log("Current working directory: ", process.cwd());
}
