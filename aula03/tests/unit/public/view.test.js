import { jest, expect, describe, test } from "@jest/globals";
import { JSDOM } from "jsdom";
import View from "../../../public/controller/js/view.js";

function makeButtonElement(
  { text, classList } = {
    text: "",
    classList: { add: jest.fn(), remove: jest.fn() },
  }
) {
  return {
    onclick: jest.fn(),
    classList,
    innerText: text,
  };
}

describe("#View", () => {
  const dom = new JSDOM();
  global.document = dom.window.document;
  global.window = dom.window;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    jest.spyOn(document, "getElementById").mockReturnValue(makeButtonElement());
  });

  test("#changeCommandButtonsVisibility - given hide=true it should add unassigned class and reset onclick", () => {
    const button = makeButtonElement();
    jest.spyOn(document, "querySelectorAll").mockReturnValue([button]);

    const view = new View();

    view.changeCommandButtonsVisibility();

    expect(button.classList.add).toHaveBeenCalledWith("unassigned");
    expect(button.onclick.name).toStrictEqual("onClickReset");

    expect(() => button.onclick()).not.toThrow();
  });

  test("#changeCommandButtonsVisibility - given hide=false it should remove unassigned class and reset onclick", () => {
    const button = makeButtonElement();
    jest.spyOn(document, "querySelectorAll").mockReturnValue([button]);

    const view = new View();

    view.changeCommandButtonsVisibility(false);

    expect(button.classList.add).not.toHaveBeenCalled();
    expect(button.classList.remove).toHaveBeenCalledWith("unassigned");
    expect(button.onclick.name).toStrictEqual("onClickReset");

    expect(() => button.onclick()).not.toThrow();
  });

  test("#onLoad", () => {
    const view = new View();

    const changeCommandSpy = jest
      .spyOn(view, "changeCommandButtonsVisibility")
      .mockReturnValue();

    view.onLoad();

    expect(changeCommandSpy).toHaveBeenCalled();
  });
});
