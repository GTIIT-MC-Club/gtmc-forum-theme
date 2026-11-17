import { module, test } from "qunit";
import sinon from "sinon";
import GtmcGlobalTooltip from "../../../discourse/lib/gtmc-global-tooltip";

const DELAY_MILLIS = 400;
const LAYER_WIDTH = 100;
const LAYER_HEIGHT = 30;
// 与 lib 里的 TOOLTIP_GAP_PX 相同：提示与鼠标或控件之间的距离
const GAP = 10;

// 测试运行器里的元素没有真实布局，位置一律用桩：lib 只通过 getBoundingClientRect 读几何信息
function stubRect(element, { left, top, width, height }) {
  element.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: left, y: top, width, height });
}

function pointerOver(element, { x, y }) {
  element.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true, clientX: x, clientY: y })
  );
}

function pointerLeave(element, towards) {
  element.dispatchEvent(
    new MouseEvent("mouseout", { bubbles: true, relatedTarget: towards })
  );
}

function pointerMove(element, { x, y }) {
  element.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerType: "mouse",
    })
  );
}

function keyboardFocus(element) {
  element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
}

module("Unit | Theme | gtmc-global-tooltip", function (hooks) {
  hooks.beforeEach(function () {
    this.clock = sinon.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "Date"],
    });

    this.fixture = document.createElement("div");
    document.body.append(this.fixture);
    this.layer = document.createElement("div");
    document.body.append(this.layer);
    stubRect(this.layer, {
      left: 0,
      top: 0,
      width: LAYER_WIDTH,
      height: LAYER_HEIGHT,
    });

    this.tooltip = new GtmcGlobalTooltip(this.layer, {
      delayMillis: DELAY_MILLIS,
    });
    this.tooltip.install();

    this.render = (html) => {
      this.fixture.innerHTML = html;
    };
    this.find = (selector) => this.fixture.querySelector(selector);
    this.isOpen = () => this.layer.getAttribute("aria-hidden") === "false";
  });

  hooks.afterEach(function () {
    this.tooltip.uninstall();
    this.fixture.remove();
    this.layer.remove();
    this.clock.restore();
  });

  test("it waits for the delay, then shows the text beside the pointer and follows it", function (assert) {
    this.render(`<button id="copy" data-tooltip="复制地址">copy</button>`);
    const button = this.find("#copy");
    stubRect(button, { left: 200, top: 100, width: 40, height: 24 });

    pointerOver(button, { x: 210, y: 110 });
    this.clock.tick(DELAY_MILLIS - 1);
    assert.false(this.isOpen(), "still hidden one millisecond before the delay");

    this.clock.tick(1);
    assert.true(this.isOpen(), "shown once the delay has passed");
    assert.strictEqual(this.layer.textContent, "复制地址");
    assert.strictEqual(this.layer.style.left, `${210 + GAP}px`);
    assert.strictEqual(this.layer.style.top, `${110 + GAP}px`);

    pointerMove(button, { x: 230, y: 115 });
    assert.strictEqual(this.layer.style.left, `${230 + GAP}px`);
    assert.strictEqual(this.layer.style.top, `${115 + GAP}px`);
  });

  test("it anchors to the control right away when the control receives keyboard focus", function (assert) {
    this.render(`<button id="copy" data-tooltip="复制地址">copy</button>`);
    const button = this.find("#copy");
    stubRect(button, { left: 200, top: 100, width: 40, height: 24 });

    keyboardFocus(button);

    assert.true(this.isOpen(), "keyboard users get the tooltip without a delay");
    assert.strictEqual(this.layer.dataset.placement, "bottom");
    assert.strictEqual(
      this.layer.style.left,
      `${200 + (40 - LAYER_WIDTH) / 2}px`,
      "centred under the control"
    );
    assert.strictEqual(this.layer.style.top, `${100 + 24 + GAP}px`);
  });

  test("it swaps instantly between controls of one group and waits again outside the group", function (assert) {
    this.render(`
      <div data-tooltip-group>
        <button id="first" data-tooltip="First">1</button>
        <button id="second" data-tooltip="Second">2</button>
      </div>
      <button id="outsider" data-tooltip="Outside">3</button>
    `);
    const first = this.find("#first");
    const second = this.find("#second");
    const outsider = this.find("#outsider");

    pointerOver(first, { x: 10, y: 10 });
    this.clock.tick(DELAY_MILLIS);
    assert.strictEqual(this.layer.textContent, "First");

    pointerLeave(first, second);
    pointerOver(second, { x: 40, y: 10 });
    assert.true(this.isOpen(), "the sibling shows without waiting");
    assert.strictEqual(this.layer.textContent, "Second");
    assert.true(
      this.layer.classList.contains("instant"),
      "the swap does not fade in again"
    );

    pointerLeave(second, outsider);
    pointerOver(outsider, { x: 80, y: 10 });
    assert.false(this.isOpen(), "leaving the group closes the tooltip");
    this.clock.tick(DELAY_MILLIS - 1);
    assert.false(this.isOpen(), "a control outside the group pays the delay");
    this.clock.tick(1);
    assert.strictEqual(this.layer.textContent, "Outside");
  });

  test("it waits the full delay again after the group has cooled down", function (assert) {
    this.render(`
      <div data-tooltip-group>
        <button id="first" data-tooltip="First">1</button>
        <span id="gap">gap</span>
        <button id="second" data-tooltip="Second">2</button>
      </div>
    `);
    const first = this.find("#first");
    const second = this.find("#second");

    pointerOver(first, { x: 10, y: 10 });
    this.clock.tick(DELAY_MILLIS);
    pointerLeave(first, this.find("#gap"));
    this.clock.tick(DELAY_MILLIS + 1);
    assert.false(this.isOpen(), "the tooltip closed while the pointer rested on the gap");

    pointerOver(second, { x: 40, y: 10 });
    assert.false(this.isOpen(), "the group is no longer warm");
    this.clock.tick(DELAY_MILLIS);
    assert.strictEqual(this.layer.textContent, "Second");
  });

  test("it flips to the opposite side when the preferred side does not fit", function (assert) {
    this.render(
      `<button id="last" data-tooltip="Last" data-tooltip-anchor="target">x</button>`
    );
    const button = this.find("#last");
    const controlTop = window.innerHeight - 30;
    stubRect(button, { left: 200, top: controlTop, width: 40, height: 24 });

    keyboardFocus(button);

    assert.strictEqual(
      this.layer.dataset.placement,
      "top",
      "no room below the control, so the tooltip goes above it"
    );
    assert.strictEqual(
      this.layer.style.top,
      `${controlTop - GAP - LAYER_HEIGHT}px`
    );
  });

  test("it flips to the left of and above the pointer near the bottom-right corner", function (assert) {
    this.render(`<button id="corner" data-tooltip="Corner">x</button>`);
    const button = this.find("#corner");
    const x = window.innerWidth - 20;
    const y = window.innerHeight - 20;

    pointerOver(button, { x, y });
    this.clock.tick(DELAY_MILLIS);

    assert.strictEqual(this.layer.dataset.placement, "top");
    assert.strictEqual(this.layer.style.left, `${x - GAP - LAYER_WIDTH}px`);
    assert.strictEqual(this.layer.style.top, `${y - GAP - LAYER_HEIGHT}px`);
  });

  test("it closes on Escape and on pointer down", function (assert) {
    this.render(`<button id="copy" data-tooltip="复制地址">copy</button>`);
    const button = this.find("#copy");

    keyboardFocus(button);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    assert.false(this.isOpen(), "Escape closes the tooltip");

    keyboardFocus(button);
    button.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" })
    );
    assert.false(this.isOpen(), "clicking closes the tooltip");
  });

  test("it ignores the mouseover that touch screens emit after a tap", function (assert) {
    this.render(`<button id="copy" data-tooltip="复制地址">copy</button>`);
    const button = this.find("#copy");

    button.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
    );
    pointerOver(button, { x: 10, y: 10 });
    this.clock.tick(DELAY_MILLIS);

    assert.false(this.isOpen());
  });

  test("it rejects a missing tooltip delay token instead of guessing one", function (assert) {
    const layerWithoutTheme = document.createElement("div");
    layerWithoutTheme.style.setProperty("--gtmc-tooltip-delay", "soon");
    document.body.append(layerWithoutTheme);

    assert.throws(
      () => GtmcGlobalTooltip.forLayer(layerWithoutTheme),
      /--gtmc-tooltip-delay must be a CSS time/
    );
    layerWithoutTheme.remove();
  });
});
