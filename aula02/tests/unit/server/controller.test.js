import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { Controller } from "../../../server/controller.js";
import { Service } from "../../../server/service.js";
import TestUtil from "../_util/testUtil.js";

describe("Controller", () => {
  let controller;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    controller = new Controller();
  });

  test("getFileStream", async () => {
    const filename = "index.html";
    const mockStream = TestUtil.generateReadableStream(["data"]);

    const serviceGetFileStreamSpy = jest
      .spyOn(Service.prototype, Service.prototype.getFileStream.name)
      .mockResolvedValue(mockStream);

    const result = await controller.getFileStream(filename);
    expect(result).toEqual(mockStream);
    expect(serviceGetFileStreamSpy).toHaveBeenCalledWith(filename);
  });

  test("handleCommand - start", async () => {
    const startSpy = jest
      .spyOn(Service.prototype, "startStreamming")
      .mockReturnThis();

    const result = await controller.handleCommand({ command: "start" });
    expect(result).toEqual({
      result: "ok",
    });
    expect(startSpy).toHaveBeenCalled();
  });

  test("handleCommand - stop", async () => {
    const stopSpy = jest
      .spyOn(Service.prototype, "stopStreamming")
      .mockReturnThis();

    const result = await controller.handleCommand({ command: "stop" });
    expect(result).toEqual({
      result: "ok",
    });
    expect(stopSpy).toHaveBeenCalled();
  });

  test("handleCommand - if command does not exists, do nothing", async () => {
    const startSpy = jest
      .spyOn(Service.prototype, "startStreamming")
      .mockReturnThis();
    const stopSpy = jest
      .spyOn(Service.prototype, "stopStreamming")
      .mockReturnThis();

    const result = await controller.handleCommand({
      command: "command-that-does-not-exists",
    });
    expect(result).toBeUndefined();
    expect(startSpy).not.toHaveBeenCalled();
    expect(stopSpy).not.toHaveBeenCalled();
  });

  test("createClientStream", () => {
    const streamMock = TestUtil.generateReadableStream(["data"]);
    jest.spyOn(Service.prototype, "createClientStream").mockReturnValue({
      id: "123",
      clientStream: streamMock,
    });
    const removeSpy = jest
      .spyOn(Service.prototype, "removeClientStream")
      .mockReturnThis();

    const result = controller.createClientStream();

    result.onClose();

    expect(result.stream).toEqual(streamMock);
    expect(removeSpy).toHaveBeenCalledWith("123");
  });
});
