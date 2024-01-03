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
