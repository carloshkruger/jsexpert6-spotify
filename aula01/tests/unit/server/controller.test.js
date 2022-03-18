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
});
