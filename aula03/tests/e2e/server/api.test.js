import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import server from "../../../server/server.js";
import request from "supertest";
import portFinder from "portfinder";
import { setTimeout } from "timers/promises";
import { Transform } from "stream";

const getAvailablePort = portFinder.getPortPromise;

const RETENTION_DATA_PERIOD_IN_MS = 200;

describe("#API E2E", () => {
  const commandResponse = JSON.stringify({
    result: "ok",
  });
  const possibleCommands = {
    start: "start",
    stop: "stop",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  function pipeAndReadStreamData(stream, onChunk) {
    const transform = new Transform({
      transform(chunk, encoding, callback) {
        onChunk(chunk);
        callback(null, chunk);
      },
    });
    return stream.pipe(transform);
  }

  describe("client workflow", () => {
    async function getTestServer() {
      const getSuperTest = (port) => request(`http://localhost:${port}`);
      const port = await getAvailablePort();

      return new Promise((resolve, reject) => {
        const app = server
          .listen(port)
          .once("listening", () => {
            const testServer = getSuperTest(port);
            const response = {
              testServer,
              kill() {
                app.close();
              },
            };

            return resolve(response);
          })
          .once("error", reject);
      });
    }

    function commandSender(testServer) {
      return {
        async send(command) {
          const response = await testServer
            .post("/controller")
            .send({ command });

          expect(response.text).toStrictEqual(commandResponse);
        },
      };
    }

    test("it should not receive data stream if the process is not playing", async () => {
      const server = await getTestServer();
      const onChunk = jest.fn();
      pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

      await setTimeout(RETENTION_DATA_PERIOD_IN_MS);

      server.kill();
      expect(onChunk).not.toHaveBeenCalled();
    });

    test("it should receive data stream if the process is playing", async () => {
      const server = await getTestServer();
      const onChunk = jest.fn();
      const { send } = commandSender(server.testServer);

      pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

      await send(possibleCommands.start);
      await setTimeout(RETENTION_DATA_PERIOD_IN_MS);
      await send(possibleCommands.stop);

      const [[buffer]] = onChunk.mock.calls;

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      server.kill();
    });
  });
});
