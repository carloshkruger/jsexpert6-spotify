import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { Service } from "../../../server/service.js";
import TestUtil from "../_util/testUtil.js";

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
});
