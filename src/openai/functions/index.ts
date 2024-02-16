import OpenAI from "openai";

/**
 * Get function calls
 * @param chat
 */
export function getFunctionCalls(chat?: OpenAI.ChatCompletion) {
  return chat?.choices[0].message.tool_calls?.map((arg) =>
    JSON.parse(arg.function.arguments),
  );
}
