export default class View {
  constructor() {
    this.btnStart = document.getElementById("start");
    this.btnStop = document.getElementById("stop");
    this.buttons = () => Array.from(document.querySelectorAll("button"));
    this.ignoreButtons = new Set(["unassigned"]);
    this.DISABLED_BUTTON_TIMEOUT_IN_MS = 500;

    async function onBtnClick() {}

    this.onBtnClicked = onBtnClick;
  }

  onLoad() {
    this.changeCommandButtonsVisibility();
    this.btnStart.onclick = this.onStartClicked.bind(this);
  }

  changeCommandButtonsVisibility(hide = true) {
    Array.from(document.querySelectorAll('[name="command"]')).forEach(
      (button) => {
        const fn = hide ? "add" : "remove";
        button.classList[fn]("unassigned");

        function onClickReset() {}

        button.onclick = onClickReset;
      }
    );
  }

  configureOnBtnClick(fn) {
    this.onBtnClicked = fn;
  }

  async onStartClicked({ srcElement: { innerText } }) {
    const btnText = innerText;
    await this.onBtnClicked(btnText);
    this.toggleButtonStart();
    this.changeCommandButtonsVisibility(false);
    this.buttons()
      .filter((button) => this.notIsUnassignedButton(button))
      .forEach(this.setupButtonAction.bind(this));
  }

  setupButtonAction(button) {
    const text = button.innerText.toLowerCase();

    if (text.includes("start")) {
      return;
    }

    if (text.includes("stop")) {
      button.onclick = this.onStopButton.bind(this);
      return;
    }

    button.onclick = this.onCommandClick.bind(this);
  }

  async onCommandClick(button) {
    const {
      srcElement: { classList, innerText },
    } = button;

    this.toggleDisableCommandButton(classList);
    await this.onBtnClicked(innerText);
    setTimeout(
      () => this.toggleDisableCommandButton(classList),
      this.DISABLED_BUTTON_TIMEOUT_IN_MS
    );
  }

  toggleDisableCommandButton(classList) {
    if (!classList.contains("active")) {
      classList.add("active");
      return;
    }

    classList.remove("active");
  }

  onStopButton({ srcElement: { innerText } }) {
    this.toggleButtonStart(false);
    this.changeCommandButtonsVisibility(true);

    return this.onBtnClicked(innerText);
  }

  notIsUnassignedButton(button) {
    const classList = Array.from(button.classList);

    return !!!classList.find((item) => this.ignoreButtons.has(item));
  }

  toggleButtonStart(active = true) {
    if (active) {
      this.btnStart.classList.add("hidden");
      this.btnStop.classList.remove("hidden");
      return;
    }

    this.btnStart.classList.remove("hidden");
    this.btnStop.classList.add("hidden");
  }
}
