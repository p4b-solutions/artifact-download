import * as core from "@actions/core";
import fs from "node:fs";
import path from "node:path";
import * as tar from "tar";
import axios from "axios";

async function run(): Promise<void> {
  try {
    const name = core.getInput("name");
    const root = core.getInput("path");
    const url = core.getInput("url");
    const workflow_id = core.getInput("workflow_id");
    const cleanup = core.getInput("cleanup") === "true";
    const files = name.includes(",") ? name.split(",").map((it) => it.trim()) : name.includes(" ") ? name.split(" ") : [name];
    console.log(`Download artifacts for workflow ${workflow_id}: `, files);
    await Promise.all(
      files.map(async (file) => {
        const response = await axios.get(`${url}/${workflow_id}/${file}.tgz`, { responseType: "arraybuffer" });
        const folder = path.join(root, file);
        fs.mkdirSync(folder, { recursive: true });
        const archive = path.join(folder, `${file}.tgz`);
        fs.writeFileSync(archive, response.data);
        await tar.extract({ file: archive, cwd: folder });
        fs.unlinkSync(archive);
      })
    );
    try {
      if (cleanup) await axios.delete(`${url}/${workflow_id}`);
    } catch (error) {
      console.log("Error deleting artifacts: ", error);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
