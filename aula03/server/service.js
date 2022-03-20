import fs from "fs";
import fsPromises from "fs/promises";
import { randomUUID } from "crypto";
import { PassThrough, Writable } from "stream";
import path from "path";
import { once } from "events";
import config from "./config.js";
import Throttle from "throttle";
import childProcess from "child_process";
import { logger } from "./utils.js";
import { pipeline } from "stream/promises";

const {
  dir: { publicDirectory, fxDirectory },
  constants: {
    fallbackBitRate,
    englishConversation,
    bitRateDivisor,
    audioMediaType,
    songVolume,
    fxVolume,
  },
} = config;

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();

    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream,
    };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return childProcess.spawn("sox", args);
  }

  async getBitRate(song) {
    try {
      const args = ["--i", "-B", song];
      const { stderr, stdout, stdin } = this._executeSoxCommand(args);

      await Promise.all([once(stderr, "readable"), once(stdout, "readable")]);

      const [success, error] = [stdout, stderr].map((stream) => stream.read());

      if (error) {
        return await Promise.reject(error);
      }

      return success.toString().trim().replace(/k/, "000");
    } catch (error) {
      logger.error(`Error on bitrate: ${error}`);
      return fallbackBitRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, encoding, callback) => {
        for (const [id, stream] of this.clientStreams) {
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }
          stream.write(chunk);
        }

        callback();
      },
    });
  }

  async startStreamming() {
    logger.info(`starting with ${this.currentSong}`);

    this.currentBitRate =
      (await this.getBitRate(this.currentSong)) / bitRateDivisor;
    this.throttleTransform = new Throttle(this.currentBitRate);
    this.currentReadable = this.createFileStream(this.currentSong);

    return pipeline(
      this.currentReadable,
      this.throttleTransform,
      this.broadCast()
    );
  }

  stopStreamming() {
    this.throttleTransform?.end?.();
  }

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

  async readFxByName(fxname) {
    const songs = await fsPromises.readdir(fxDirectory);
    const chosenSong = songs.find((filename) =>
      filename.toLowerCase().includes(fxname.toLowerCase())
    );

    if (!chosenSong) {
      return Promise.reject(`the song ${fxname} was not found`);
    }

    return path.join(fxDirectory, chosenSong);
  }

  appendFxStream(fx) {
    const throttleTransformable = new Throttle(this.currentBitRate);
    pipeline(throttleTransformable, this.broadCast());

    const unpipe = () => {
      const transformStream = this.mergeAudioStreams(fx, this.currentReadable);

      this.throttleTransform = throttleTransformable;
      this.currentReadable = transformStream;
      this.currentReadable.removeListener("unpipe", unpipe);

      pipeline(transformStream, throttleTransformable);
    };

    this.throttleTransform.on("unpipe", unpipe);
    this.throttleTransform.pause();
    this.currentReadable.unpipe(this.throttleTransform);
  }

  mergeAudioStreams(song, readable) {
    const transformStream = new PassThrough();
    const args = [
      "-t",
      audioMediaType,
      "-v",
      songVolume,
      "-m",
      "-",
      "-t",
      audioMediaType,
      "-v",
      fxVolume,
      song,
      "-t",
      audioMediaType,
      "-",
    ];

    const { stdout, stdin } = this._executeSoxCommand(args);

    pipeline(readable, stdin);
    pipeline(stdout, transformStream);

    return transformStream;
  }
}
