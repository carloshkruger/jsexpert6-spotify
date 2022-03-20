import { Service } from "./service.js";
import { logger } from "./utils.js";

export class Controller {
  constructor() {
    this.service = new Service();
  }

  async getFileStream(filename) {
    return this.service.getFileStream(filename);
  }

  async handleCommand({ command }) {
    logger.info(`command received: ${command}`);
    const cmd = command.toLowerCase();
    const result = {
      result: "ok",
    };

    if (cmd.includes("start")) {
      this.service.startStreamming();
      return result;
    }

    if (cmd.includes("stop")) {
      this.service.stopStreamming();
      return result;
    }

    const chosenFx = await this.service.readFxByName(cmd);
    this.service.appendFxStream(chosenFx);

    return result;
  }

  createClientStream() {
    logger.info("creating client stream");
    const { id, clientStream } = this.service.createClientStream();

    const onClose = () => {
      logger.info(`closign connection of ${id}`);
      this.service.removeClientStream(id);
    };

    return {
      stream: clientStream,
      onClose,
    };
  }
}
