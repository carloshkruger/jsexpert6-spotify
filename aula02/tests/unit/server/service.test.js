import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { Service } from "../../../server/service.js";
import TestUtil from "../_util/testUtil.js";
import { PassThrough } from "stream";
import childProcess from "child_process";
import config from "../../../server/config.js";
import { Writable } from "stream";
import Throttle from "throttle";

describe("#service", () => {
  let service;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    service = new Service();
  });

  test("getFileStream", async () => {
    const mockType = ".html";
    const mockStream = TestUtil.generateReadableStream(["data"]);
    const mockName = "./file.html";

    jest.spyOn(service, service.getFileInfo.name).mockResolvedValue({
      type: mockType,
      name: mockName,
    });

    jest
      .spyOn(service, service.createFileStream.name)
      .mockReturnValue(mockStream);

    const fileName = "file.html";
    const result = await service.getFileStream(fileName);

    expect(result).toEqual({
      stream: mockStream,
      type: mockType,
    });
    expect(service.getFileInfo).toHaveBeenCalledWith(fileName);
    expect(service.createFileStream).toHaveBeenCalledWith(mockName);
  });

  test("getFileInfo", async () => {
    const filePathMock = "./path/to/file.html";
    const extensionMock = ".html";
    const filename = "file.html";

    jest.spyOn(fsPromises, fsPromises.access.name).mockResolvedValue(true);
    jest.spyOn(path, path.join.name).mockReturnValue(filePathMock);
    jest.spyOn(path, path.extname.name).mockReturnValue(extensionMock);

    const result = await service.getFileInfo(filename);
    expect(result).toEqual({
      type: extensionMock,
      name: filePathMock,
    });
  });

  test("createFileStream", () => {
    const filename = "index.html";
    const streamMock = TestUtil.generateReadableStream(["data"]);
    jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(streamMock);

    const result = service.createFileStream(filename);
    expect(result).toEqual(streamMock);
    expect(fs.createReadStream).toHaveBeenCalledWith(filename);
  });

  test("createClientStream - should return correct values", () => {
    const result = service.createClientStream();
    expect(result).toEqual({
      id: expect.any(String),
      clientStream: expect.any(PassThrough),
    });
  });

  test("removeClientStream - should call method with correct values", () => {
    const deleteSpy = jest.spyOn(Map.prototype, "delete");
    const id = "123";

    service.removeClientStream(id);

    expect(deleteSpy).toHaveBeenCalledWith(id);
  });

  test("getBitRate - should return correct bit rate", async () => {
    const stderrStream = TestUtil.generateReadableStream([]);
    const stdoutStream = TestUtil.generateReadableStream(["128k"]);

    const spawnSpy = jest.spyOn(childProcess, "spawn").mockReturnValue({
      stderr: stderrStream,
      stdout: stdoutStream,
    });

    const song = "song.mp3";
    const result = await service.getBitRate(song);

    expect(result).toBe("128000");
    expect(spawnSpy).toHaveBeenCalledWith("sox", ["--i", "-B", song]);
  });

  test("getBitRate - should throw an error", async () => {
    const error = "test error";
    const stderrStream = TestUtil.generateReadableStream([error]);
    const stdoutStream = TestUtil.generateReadableStream(["128k"]);

    jest.spyOn(childProcess, "spawn").mockReturnValue({
      stderr: stderrStream,
      stdout: stdoutStream,
    });

    const result = await service.getBitRate("song.mp3");

    expect(result).toBe(config.constants.fallbackBitRate);
  });

  test("startStreamming", async () => {
    jest.spyOn(service, "getBitRate").mockResolvedValue("128000");
    const createSpy = jest
      .spyOn(service, "createFileStream")
      .mockReturnValue(TestUtil.generateReadableStream(["data"]));

    service.createClientStream();
    await service.startStreamming();

    expect(createSpy).toHaveBeenCalledWith(
      config.constants.englishConversation
    );
  });

  test("#broadCast - it should write only for active client streams", () => {
    const service = new Service();
    const onData = jest.fn();
    const client1 = TestUtil.generateWritableStream(onData);
    const client2 = TestUtil.generateWritableStream(onData);
    jest.spyOn(service.clientStreams, "delete");

    service.clientStreams.set("1", client1);
    service.clientStreams.set("2", client2);
    client2.end();

    const writable = service.broadCast();
    writable.write("Hello World");

    expect(writable).toBeInstanceOf(Writable);
    expect(service.clientStreams.delete).toHaveBeenCalled();
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test("#stopStreamming - existing throttleTransform", () => {
    const service = new Service();
    service.throttleTransform = new Throttle(1);

    jest.spyOn(service.throttleTransform, "end").mockReturnValue();

    service.stopStreamming();
    expect(service.throttleTransform.end).toHaveBeenCalled();
  });

  test("#stopStreamming - non existing throttleTransform", () => {
    const service = new Service();
    expect(() => service.stopStreamming()).not.toThrow();
  });
});
