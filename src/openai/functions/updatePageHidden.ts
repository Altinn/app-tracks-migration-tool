/**
 * An OpenAI function that specifies the parameters for the updatePageHidden function.
 * This is used to get a desired output from the OpenAI model. Instead of forcing the AI
 * to respond with JSON, and parsing this JSON to something that can be used in the code,
 * we can use this function to let the AI specify which page should be updated with which
 * hidden expression.
 */
export const updatePageHiddenFn = {
  name: "updatePageHidden",
  description:
    "Update the hidden property on a specific page given the page name and the expression to put in the hidden property.",
  parameters: {
    type: "object",
    properties: {
      page: {
        type: "string",
        description: "The page for which to update the hidden property.",
      },
      expression: {
        type: "string",
        description: "The dynamic expression to set as hidden property",
      },
    },
    required: ["page", "expression"],
  },
};
