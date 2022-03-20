import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import { Controller } from "../../../server/controller.js";
import { handler } from "../../../server/routes.js";
import TestUtil from "../_util/testUtil.js";

describe("#routes - test suite for api response", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test("GET / - should redirect to home page", async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = "/";

    await handler(...params.values());
    expect(params.response.writeHead).toHaveBeenCalledWith(302, {
      Location: config.location.home,
    });
    expect(params.response.end).toHaveBeenCalled();
  });

  test(`GET /home - should response with ${config.pages.homeHtml} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = "/home";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(Controller.prototype, "getFileStream").mockResolvedValue({
      stream: mockFileStream,
      type: "",
    });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toHaveBeenCalledWith(
      config.pages.homeHtml
    );
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });

  test(`GET /controller - should response with ${config.pages.controllerHtml} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = "/controller";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(Controller.prototype, "getFileStream").mockResolvedValue({
      stream: mockFileStream,
      type: "",
    });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toHaveBeenCalledWith(
      config.pages.controllerHtml
    );
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });

  test("GET /stream - should create client stream", async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = "/stream";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(Controller.prototype, "createClientStream").mockReturnValue({
      stream: mockFileStream,
      onClose: jest.fn(),
    });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();

    await handler(...params.values());
    params.request.emit("close");

    expect(Controller.prototype.createClientStream).toHaveBeenCalled();
    expect(params.response.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
    });
  });

  test(`POST /controller`, async () => {
    const params = TestUtil.defaultHandleParams();

    params.request.method = "POST";
    params.request.url = "/controller";
    const body = {
      command: "start",
    };

    params.request.push(JSON.stringify(body));

    const jsonResult = {
      ok: "1",
    };
    jest
      .spyOn(Controller.prototype, Controller.prototype.handleCommand.name)
      .mockResolvedValue(jsonResult);

    await handler(...params.values());

    expect(Controller.prototype.handleCommand).toHaveBeenCalledWith(body);
    expect(params.response.end).toHaveBeenCalledWith(
      JSON.stringify(jsonResult)
    );
  });

  test("GET /index.html - should response with file stream", async () => {
    const filename = "/index.html";
    const expectedType = ".html";
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = filename;

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(Controller.prototype, "getFileStream").mockResolvedValue({
      stream: mockFileStream,
      type: expectedType,
    });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toHaveBeenCalledWith(filename);
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(params.response.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": config.constants.CONTENT_TYPE[expectedType],
    });
  });

  test("GET /file.ext - should response with file stream", async () => {
    const filename = "/file.ext";
    const expectedType = ".ext";
    const params = TestUtil.defaultHandleParams();
    params.request.method = "GET";
    params.request.url = filename;

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(Controller.prototype, "getFileStream").mockResolvedValue({
      stream: mockFileStream,
      type: expectedType,
    });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toHaveBeenCalledWith(filename);
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(params.response.writeHead).not.toHaveBeenCalled();
  });

  test("POST /unknown - given an inexistent route it should response with 404", async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = "POST";
    params.request.url = "/unknown";

    await handler(...params.values());
    expect(params.response.writeHead).toHaveBeenCalledWith(404);
    expect(params.response.end).toHaveBeenCalled();
  });

  describe("Exceptions", () => {
    test("given inexistent file it should respond with 404", async () => {
      const params = TestUtil.defaultHandleParams();
      params.request.method = "GET";
      params.request.url = "/index.png";

      jest
        .spyOn(Controller.prototype, "getFileStream")
        .mockRejectedValue(
          new Error("Error: ENOENT: no such file or directory")
        );

      await handler(...params.values());
      expect(params.response.writeHead).toHaveBeenCalledWith(404);
      expect(params.response.end).toHaveBeenCalled();
    });

    test("given an error it should response with 500", async () => {
      const params = TestUtil.defaultHandleParams();
      params.request.method = "GET";
      params.request.url = "/index.png";

      jest
        .spyOn(Controller.prototype, "getFileStream")
        .mockRejectedValue(new Error("Error"));

      await handler(...params.values());
      expect(params.response.writeHead).toHaveBeenCalledWith(500);
      expect(params.response.end).toHaveBeenCalled();
    });
  });
});
