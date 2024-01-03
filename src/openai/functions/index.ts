import OpenAI from "openai";
import ChatCompletion = OpenAI.ChatCompletion;

export function getArguments(chat: ChatCompletion) {
  return chat.choices[0].message.tool_calls.map((arg) =>
    JSON.parse(arg.function.arguments),
  );
}
