import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import config from "./config.js";

const {
  dir: { publicDirectory },
} = config;

export class Service {
  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    const fullFilePath = path.join(publicDirectory, file);
    await fsPromises.access(fullFilePath);
    const fileType = path.extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath,
    };
  }

  async getFileStream(file) {
    const { name, type } = await this.getFileInfo(file);

    return {
      stream: this.createFileStream(name),
      type,
    };
  }
}
