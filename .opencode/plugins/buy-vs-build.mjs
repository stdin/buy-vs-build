import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readRules() {
  return fs.readFileSync(path.join(root, "rules", "buy-vs-build.md"), "utf8");
}

export default async () => {
  return {
    name: "buy-vs-build",

    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes("skills")) {
        config.skills.paths.push("skills");
      }
    },

    "experimental.chat.system.transform": async (_input, output) => {
      output.system = output.system || [];
      output.system.push(readRules());
    }
  };
};
