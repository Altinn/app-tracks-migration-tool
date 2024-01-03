import OpenAI from "openai";
import m from "minimist";
import { exec } from "node:child_process";
import { readdirSync, createReadStream } from "node:fs";
import { ThreadMessage } from "openai/src/resources/beta/threads/messages/messages";
import {
  checkoutBranch,
  draftPullRequest,
  gitCommit,
  gitStatus,
  gpsup,
  updatePageHidden,
} from "./repo-updater";

const args: Record<string, string> = m(process.argv.slice(2));
const model = `gpt-4-1106-preview`;
const apiVersion = "2023-07-01-preview";

const apiKey = process.env.OPEN_API_KEY;

const client = new OpenAI();
const fileIds = [];
let callArgs = [];

const assistantId = "asst_rkd7zFIgBZ9rudGwr1Z4pwFM";

export function findArgByName(name: string) {
  const arg = args[name];
  if (Array.isArray(arg)) return arg?.[0];
  return arg;
}

function parseValidDataModelPaths(path = "./") {
  let validDataModelPaths: string[] = [];
  readdirSync(`${path}/models`).forEach(async (file) => {
    if (file.endsWith(".metadata.json")) {
      const file1 = Bun.file(`${path}/models/${file}`);
      const metadata = await file1.json();
      let allKeys = [];
      try {
        allKeys = Object.keys(metadata.Elements);
      } catch (e) {
        allKeys = Object.keys(metadata.elements);
      }
      const dataModelName = allKeys[0];
      validDataModelPaths.push(
        ...allKeys.slice(1).map((key) => key.replace(`${dataModelName}.`, "")),
      );
    }
  });
  return validDataModelPaths;
}

function findPageOrderFiles(path = "./"): Promise<string[]> {
  const command = `find ${path} -name '*.cs' ! -name 'Program.cs' -exec grep -l 'IPageOrder' {} +`;
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      const files = stdout.split("\n").filter(Boolean);
      resolve(files);
      if (error) {
        console.log("error", error);
        reject(error);
      }
    });
  });
}

function getAssistant(assistantId: string) {
  return client.beta.assistants.retrieve(assistantId);
}

async function uploadFile(filePath: string) {
  const file = createReadStream(filePath);
  return client.files.create({
    file,
    purpose: "assistants",
  });
}

async function deleteFile(fileId: string) {
  client.files.del(fileId);
}

async function uploadDynamicExpressionsFile() {
  const file = await uploadFile("./dynamic-expressions.md");
  fileIds.push(file.id);
  await updateAssistantFiles([file.id]);
}

async function updateAssistantFiles(fileIds: string[]) {
  return client.beta.assistants.update(assistantId, {
    file_ids: fileIds,
  });
}

function resolveContent(content: ThreadMessage["content"][0]) {
  if (content.type === "text") {
    console.log("Assistants response: ", content.text.value);
    if (content.text.annotations.length > 0) {
      console.log("Annotations: ", content.text.annotations);
    }
  }
}

// function fileAsString(filePath: string) {
//   read
// }

async function main() {
  const validDataModelPaths = parseValidDataModelPaths(findArgByName("path"));
  const files = await findPageOrderFiles(findArgByName("path"));

  const assistant = await getAssistant(assistantId);
  console.log("Assistant: ", assistant.file_ids);
  if (assistant.file_ids.length === 0) {
    console.log("Uploading dynamic expressions file");
    await uploadDynamicExpressionsFile();
  }

  const uploadedFiles = [];
  for (const filePath of files) {
    const file = await uploadFile(filePath);
    uploadedFiles.push(file);
    fileIds.push(file.id);
  }

  await updateAssistantFiles(fileIds);
  const thread = await client.beta.threads.create();
  console.log("Created thread?", thread);

  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
    instructions: `The file dynamic-expressions.md I have uploaded to you contains documentation in norwegian on a dynamic
        expression language that I've created. It includes a markdown table with all the available functions,
        and documentation on how each function works.

        The other files contains some C# code. It implements the interface IPageOrder with the method GetPageOrder,
        which is used to determine the order of pages in form.
        Could you convert this C# code into dynamic expressions for each page that should be hidden when a certain
        condition is met based on the logic you see implemented in the GetPageOrder method?

        Provide me with the dynamic expression that should be used to hide the page at the appropriate point in time.
        You can give the answer on the format 'PageName: dynamic expression'
        E.g 'Page1: ["equals" ["dataModel", "funeral.isDead"], true]'

        Be short and concise in your answers. Valid paths in the data model are ${validDataModelPaths.join(
          ", ",
        )}.

        Always use double quotes when writing strings inside the expressions.

        Valid functions to use are: equals, notEquals, greaterThan, lessThan, greaterThanEq, lessThanEq, concat, and, or,
        if, contains, notContains, commaContains, startsWith, endsWith, lowerCase, upperCase, stringLength, text, language,
        displayValue, round, instanceContext, frontendSettings, dataModel, component.

        One caveat you need to take into consideration is that previously, PageOrder was only executed after
        the users pressed the next page button. This is no longer the case. Hidden expressions are now evaluated
        when ever a page is loaded. This means that you need to be careful with nullable values.

        Cases where nullable values were used in the IPageOrder way of doing things, need to be re-evaluated.

        This is because HidePage should also be hidden when the value is null, and ShowPage and ShowPage2 should be hidden only when the value is false.

        Use the provided function updatePageHidden to update the hidden property on all of the files.`,
  });

  await new Promise((resolve, reject) => {
    const id = setInterval(async () => {
      const status = await client.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(
        "Status: ",
        status.status,
        status?.required_action?.submit_tool_outputs?.tool_calls,
      );
      if (status.status === "failed") {
        console.log(status.last_error);
        clearInterval(id);
        reject(null);
      }
      if (status.status === "completed") {
        clearInterval(id);
        resolve(status);
      }
      if (status.status === "requires_action") {
        status.required_action?.submit_tool_outputs?.tool_calls;
        callArgs = [
          ...callArgs,
          ...status.required_action?.submit_tool_outputs?.tool_calls.map((f) =>
            JSON.parse(f.function.arguments),
          ),
        ];

        await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs:
            status.required_action?.submit_tool_outputs?.tool_calls.map(
              (tool) => ({
                tool_call_id: tool.id,
                output: "",
              }),
            ),
        });
      }
    }, 10000);
  });

  console.log("GPT Finished evaluating: ", callArgs);

  const branchName = await checkoutBranch(findArgByName("path"));
  await gitStatus();
  for (const args of callArgs) {
    await updatePageHidden(args);
  }
  await gitCommit();
  await gpsup();
  await draftPullRequest(branchName);

  for (const uploadedFile of uploadedFiles) {
    await deleteFile(uploadedFile.id);
  }

  const messages = await client.beta.threads.messages.list(thread.id);
  console.log("Messages: ", messages);
  messages.data.forEach((data) => data.content.forEach(resolveContent));
}

main();
