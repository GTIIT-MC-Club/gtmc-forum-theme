// 全局悬停提示：任何元素写上 data-tooltip="说明文字" 就有提示，不用每处各包一个组件。
// 移植自 OpenCard 的 globalTooltip.ts（规则见其 docs/UI_RULES.md「浮层提示」），去掉了 Vue 渲染和对话框作用域。
//
// 这是全站唯一直接操作 DOM 的代码（AGENTS.md「界面规则」的例外条款）：提示要在文档级监听指针和焦点事件，
// 并按目标元素和视口的实时几何位置摆放提示层，这些都不是模板能表达的。DOM 读写全部集中在本文件；
// 提示层元素本身由 components/gtmc-tooltip-layer.gjs 渲染，它只负责创建元素、安装和卸载。
//
// 元素上可以声明的属性（都可以写在祖先元素上，就近生效）：
//   data-tooltip            提示文字（纯文本）。空字符串等于没有提示。
//   data-tooltip-placement  top | bottom | left | right，锚定在控件上时画在哪一侧，默认 bottom；放不下先翻到对侧，再试另一轴。
//   data-tooltip-anchor     target：锚定在控件上；不写则贴着鼠标并跟随。键盘聚焦时一律锚定在控件上。
//   data-tooltip-group      写在容器上：容器里的控件共用一个「热窗口」，第一次等延迟，之后在组内换控件立即换内容。
//   data-tooltip-overflow   只在文字被截断（省略号）时才提示。

const TOOLTIP_SELECTOR = "[data-tooltip]";
const PLACEMENT_ATTRIBUTE = "data-tooltip-placement";
const ANCHOR_ATTRIBUTE = "data-tooltip-anchor";
const GROUP_ATTRIBUTE = "data-tooltip-group";
const OVERFLOW_ATTRIBUTE = "data-tooltip-overflow";

// 提示与鼠标或控件之间的距离、与视口边缘的最小距离（px）。沿用 OpenCard 的值：
// 10px 让提示离开鼠标指针的图形（约 12px 高的箭头），8px 让贴边的提示不会顶到滚动条上。
const TOOLTIP_GAP_PX = 10;
const VIEWPORT_EDGE_PADDING_PX = 8;

// 文字盒比裁剪它的祖先宽出这么多像素才算被截断，避免边框和取整造成误判
const CLIP_TOLERANCE_PX = 1;

// 一个组在最后一次显示提示后保持「热」的时间。窗口内移到同组的下一个控件，提示立即出现；
// 停顿超过这个时间再移过去，又要等完整的延迟。与 --gtmc-tooltip-delay 同量级，停顿一下就算新的一次。
const WARM_WINDOW_MILLIS = 400;

// 在同组里从一个控件移到下一个时，中间会经过没有提示的空隙；空隙不超过这个时长就不收起提示，免得闪一下
const GROUP_GAP_MILLIS = 80;

// 纵向放置优先：水平排列的控件（按钮行、列表行）很常见，左右放置会盖住相邻的控件
const DEFAULT_PLACEMENT = "bottom";

// 每个声明方向依次尝试的方向：先声明的那侧，放不下翻到对侧，再试另一轴
const PLACEMENT_FALLBACKS = {
  top: ["top", "bottom", "right", "left"],
  bottom: ["bottom", "top", "right", "left"],
  left: ["left", "right", "top", "bottom"],
  right: ["right", "left", "top", "bottom"],
};

function isPlacement(value) {
  return Object.hasOwn(PLACEMENT_FALLBACKS, value);
}

function declaredPlacement(target) {
  const value = target
    .closest(`[${PLACEMENT_ATTRIBUTE}]`)
    ?.getAttribute(PLACEMENT_ATTRIBUTE);
  return isPlacement(value) ? value : DEFAULT_PLACEMENT;
}

function followsPointer(target) {
  return (
    target.closest(`[${ANCHOR_ATTRIBUTE}]`)?.getAttribute(ANCHOR_ATTRIBUTE) !==
    "target"
  );
}

// 文字是不是真的被截断了：自己放不下是一种；省略号也可能做在容器上，这时看它有没有探出最近一个会裁剪的祖先
function isTextClipped(target) {
  if (target.scrollWidth > target.clientWidth) {
    return true;
  }

  const box = target.getBoundingClientRect();
  for (
    let ancestor = target.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const style = getComputedStyle(ancestor);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") {
      const clip = ancestor.getBoundingClientRect();
      return (
        box.right > clip.right + CLIP_TOLERANCE_PX ||
        box.left < clip.left - CLIP_TOLERANCE_PX
      );
    }
  }
  return false;
}

function tooltipText(target) {
  if (target.hasAttribute(OVERFLOW_ATTRIBUTE) && !isTextClipped(target)) {
    return "";
  }
  return target.getAttribute("data-tooltip")?.trim() ?? "";
}

// 找到事件目标所属的提示元素：最里面那个声明了提示的元素优先；
// 但「文字放得下」的 data-tooltip-overflow 元素是透明的，让给外层。
// declared 表示目标确实在某个声明了提示的元素里，调用方据此收起已经亮着的提示（与完全没声明的普通元素区分开）。
function resolveHit(eventTarget, ElementClass) {
  if (!(eventTarget instanceof ElementClass)) {
    return { target: null, declared: false };
  }

  let candidate = eventTarget.closest(TOOLTIP_SELECTOR);
  const declared = candidate !== null;
  while (candidate) {
    if (tooltipText(candidate)) {
      return { target: candidate, declared };
    }
    candidate = candidate.parentElement?.closest(TOOLTIP_SELECTOR) ?? null;
  }
  return { target: null, declared };
}

function anchorForPlacement(placement, targetRect, size) {
  const centeredLeft =
    targetRect.left + (targetRect.right - targetRect.left - size.width) / 2;
  const centeredTop =
    targetRect.top + (targetRect.bottom - targetRect.top - size.height) / 2;

  switch (placement) {
    case "top":
      return {
        left: centeredLeft,
        top: targetRect.top - TOOLTIP_GAP_PX - size.height,
      };
    case "bottom":
      return { left: centeredLeft, top: targetRect.bottom + TOOLTIP_GAP_PX };
    case "left":
      return {
        left: targetRect.left - TOOLTIP_GAP_PX - size.width,
        top: centeredTop,
      };
    default:
      return { left: targetRect.right + TOOLTIP_GAP_PX, top: centeredTop };
  }
}

function fitsInViewport(placement, anchor, size, viewport) {
  switch (placement) {
    case "top":
      return anchor.top >= VIEWPORT_EDGE_PADDING_PX;
    case "bottom":
      return (
        anchor.top + size.height <= viewport.height - VIEWPORT_EDGE_PADDING_PX
      );
    case "left":
      return anchor.left >= VIEWPORT_EDGE_PADDING_PX;
    default:
      return (
        anchor.left + size.width <= viewport.width - VIEWPORT_EDGE_PADDING_PX
      );
  }
}

function clampToViewport(value, size, viewportSize) {
  return Math.max(
    VIEWPORT_EDGE_PADDING_PX,
    Math.min(value, viewportSize - size - VIEWPORT_EDGE_PADDING_PX)
  );
}

// 延迟只有一个来源：主题的 CSS 变量 --gtmc-tooltip-delay（common.scss），与设计令牌保持一致。
// 读不到或格式不对说明样式表没加载或令牌被改坏了，直接报错，不用一个猜的默认值掩盖。
const TOOLTIP_DELAY_PROPERTY = "--gtmc-tooltip-delay";
const CSS_TIME_PATTERN = /^(\d+(?:\.\d+)?)(ms|s)$/;

function readTooltipDelayMillis(element) {
  const value = getComputedStyle(element)
    .getPropertyValue(TOOLTIP_DELAY_PROPERTY)
    .trim();
  const match = CSS_TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      `${TOOLTIP_DELAY_PROPERTY} must be a CSS time such as 400ms, got "${value}"; is the GTMC theme stylesheet loaded?`
    );
  }
  const amount = Number(match[1]);
  return match[2] === "s" ? amount * 1000 : amount;
}

function sameRect(first, second) {
  return (
    first.left === second.left &&
    first.top === second.top &&
    first.right === second.right &&
    first.bottom === second.bottom
  );
}

/**
 * 控制一个提示层元素。install() 开始在 layer 所在的文档上监听，uninstall() 移除全部监听和计时器。
 * 只在浏览器主线程上使用；所有状态都在实例里，同一文档上装两个实例互不影响（测试里就是这样）。
 */
export default class GtmcGlobalTooltip {
  /** 用主题样式表里的 --gtmc-tooltip-delay 作为延迟，给页面上的提示层建一个实例。 */
  static forLayer(layer) {
    return new GtmcGlobalTooltip(layer, {
      delayMillis: readTooltipDelayMillis(layer),
    });
  }

  #layer;
  #document;
  #window;
  #delayMillis;
  #listeners = [];

  #activeTarget = null;
  #pendingTarget = null;
  #activeText = "";
  #showTimer = null;
  #hideTimer = null;
  #trackingFrame = null;
  #lastTargetRect = null;
  #pointerPosition = null;
  #lastPointerType = null;
  #warmGroup = null;
  #warmUntil = 0;
  #warmPlacement = null;

  /**
   * @param {HTMLElement} layer 提示层元素，已经在文档里
   * @param {{delayMillis: number}} options 第一次出现前的停留时间，取自 CSS 变量 --gtmc-tooltip-delay
   */
  constructor(layer, { delayMillis }) {
    this.#layer = layer;
    this.#document = layer.ownerDocument;
    this.#window = this.#document.defaultView;
    this.#delayMillis = delayMillis;
  }

  get #isOpen() {
    return this.#activeTarget !== null && !this.#layer.hidden;
  }

  install() {
    this.#layer.setAttribute("role", "tooltip");
    this.#layer.setAttribute("aria-hidden", "true");
    this.#layer.hidden = true;

    // 捕获阶段监听：核心和插件里有不少组件在冒泡阶段 stopPropagation
    this.#listen(this.#document, "mouseover", this.#onMouseOver, true);
    this.#listen(this.#document, "mouseout", this.#onMouseOut, true);
    this.#listen(this.#document, "pointerdown", this.#onPointerDown, true);
    this.#listen(this.#document, "pointermove", this.#onPointerMove, true);
    this.#listen(this.#document, "focusin", this.#onFocusIn, true);
    this.#listen(this.#document, "focusout", this.#onFocusOut, true);
    this.#listen(this.#document, "keydown", this.#onKeyDown, true);
    this.#listen(this.#window, "resize", this.#onViewportChanged);
    this.#listen(this.#window, "scroll", this.#onViewportChanged, true);
  }

  uninstall() {
    this.#dismiss();
    for (const [target, type, handler, capture] of this.#listeners) {
      target.removeEventListener(type, handler, capture);
    }
    this.#listeners = [];
  }

  #listen(target, type, handler, capture = false) {
    const bound = handler.bind(this);
    target.addEventListener(type, bound, capture);
    this.#listeners.push([target, type, bound, capture]);
  }

  #groupOf(target) {
    return target.closest(`[${GROUP_ATTRIBUTE}]`) ?? target;
  }

  #isWarm(target) {
    return (
      this.#warmGroup !== null &&
      Date.now() <= this.#warmUntil &&
      this.#warmGroup === this.#groupOf(target)
    );
  }

  #cancelPending() {
    this.#pendingTarget = null;
    if (this.#showTimer !== null) {
      this.#window.clearTimeout(this.#showTimer);
      this.#showTimer = null;
    }
  }

  #cancelHideTimer() {
    if (this.#hideTimer !== null) {
      this.#window.clearTimeout(this.#hideTimer);
      this.#hideTimer = null;
    }
  }

  // 收起提示，但保留「热」的状态：鼠标还在同一组里
  #hide() {
    this.#cancelPending();
    this.#cancelHideTimer();
    if (this.#trackingFrame !== null) {
      this.#window.cancelAnimationFrame(this.#trackingFrame);
      this.#trackingFrame = null;
    }
    this.#activeTarget = null;
    this.#layer.classList.remove("open", "instant");
    this.#layer.setAttribute("aria-hidden", "true");
  }

  // 收起提示并结束这一轮：鼠标离开了组，或者交互结束了（点击、Esc、失焦）
  #dismiss() {
    this.#hide();
    this.#warmGroup = null;
    this.#warmPlacement = null;
    this.#warmUntil = 0;
  }

  #place() {
    if (!this.#isOpen) {
      return;
    }

    const targetRect = this.#activeTarget.getBoundingClientRect();
    this.#lastTargetRect = targetRect;
    const layerRect = this.#layer.getBoundingClientRect();
    const size = { width: layerRect.width, height: layerRect.height };
    const viewport = {
      width: this.#window.innerWidth,
      height: this.#window.innerHeight,
    };

    const position =
      this.#pointerPosition && followsPointer(this.#activeTarget)
        ? this.#positionAtPointer(size, viewport)
        : this.#positionAtTarget(targetRect, size, viewport);

    this.#layer.dataset.placement = position.placement;
    this.#layer.style.left = `${Math.round(clampToViewport(position.left, size.width, viewport.width))}px`;
    this.#layer.style.top = `${Math.round(clampToViewport(position.top, size.height, viewport.height))}px`;
  }

  // 贴着鼠标：默认在指针右下方，右边放不下换到左边，下面放不下换到上面
  #positionAtPointer(size, viewport) {
    const { x, y } = this.#pointerPosition;
    const fitsRight =
      x + TOOLTIP_GAP_PX + size.width <=
      viewport.width - VIEWPORT_EDGE_PADDING_PX;
    const fitsBelow =
      y + TOOLTIP_GAP_PX + size.height <=
      viewport.height - VIEWPORT_EDGE_PADDING_PX;
    return {
      placement: fitsBelow ? "bottom" : "top",
      left: fitsRight ? x + TOOLTIP_GAP_PX : x - TOOLTIP_GAP_PX - size.width,
      top: fitsBelow ? y + TOOLTIP_GAP_PX : y - TOOLTIP_GAP_PX - size.height,
    };
  }

  // 锚定在控件上。同一轮里在组内换控件时沿用已经在屏幕上的那一侧，提示不会上下跳；那一侧放不下时照样让位
  #positionAtTarget(targetRect, size, viewport) {
    const declared = PLACEMENT_FALLBACKS[declaredPlacement(this.#activeTarget)];
    const candidates =
      this.#warmPlacement !== null && declared.includes(this.#warmPlacement)
        ? [
            this.#warmPlacement,
            ...declared.filter((side) => side !== this.#warmPlacement),
          ]
        : declared;
    const placement =
      candidates.find((side) =>
        fitsInViewport(
          side,
          anchorForPlacement(side, targetRect, size),
          size,
          viewport
        )
      ) ?? candidates.at(-1);

    this.#warmPlacement ??= placement;
    return { placement, ...anchorForPlacement(placement, targetRect, size) };
  }

  // 控件可能因为布局变化或动画移动而不触发 resize、scroll，所以提示亮着时每帧检查一次位置和文字
  #trackTarget() {
    this.#trackingFrame = null;
    if (!this.#activeTarget) {
      return;
    }

    const text = this.#activeTarget.isConnected
      ? tooltipText(this.#activeTarget)
      : "";
    if (!text) {
      this.#dismiss();
      return;
    }

    const textChanged = text !== this.#activeText;
    if (textChanged) {
      this.#activeText = text;
      this.#layer.textContent = text;
    }
    const rect = this.#activeTarget.getBoundingClientRect();
    if (
      textChanged ||
      !this.#lastTargetRect ||
      !sameRect(rect, this.#lastTargetRect)
    ) {
      this.#place();
    }
    this.#scheduleTracking();
  }

  #scheduleTracking() {
    this.#trackingFrame ??= this.#window.requestAnimationFrame(() =>
      this.#trackTarget()
    );
  }

  #show(target, instant) {
    this.#cancelPending();
    this.#cancelHideTimer();
    const text = tooltipText(target);
    if (!text || !target.isConnected) {
      this.#dismiss();
      return;
    }

    this.#activeTarget = target;
    this.#warmGroup = this.#groupOf(target);
    this.#warmUntil = Date.now() + WARM_WINDOW_MILLIS;
    this.#activeText = text;
    this.#layer.textContent = text;
    if (instant) {
      // 同组内换控件：提示层保持打开，只换内容，不重新淡入
      this.#layer.classList.add("instant");
    } else {
      this.#layer.classList.remove("open", "instant");
      this.#warmPlacement = null;
    }
    this.#layer.hidden = false;
    this.#layer.setAttribute("aria-hidden", "false");
    this.#place();
    this.#layer.classList.add("open");
    this.#scheduleTracking();
  }

  #schedule(target) {
    if (target === this.#activeTarget || target === this.#pendingTarget) {
      return;
    }
    if (this.#isWarm(target)) {
      this.#show(target, true);
      return;
    }

    this.#dismiss();
    this.#pendingTarget = target;
    this.#showTimer = this.#window.setTimeout(() => {
      this.#showTimer = null;
      this.#pendingTarget = null;
      this.#show(target, false);
    }, this.#delayMillis);
  }

  #onMouseOver(event) {
    // 触屏上点一下也会补发 mouseover；那不是悬停，不出提示（说明文字在触屏上靠控件本身的文字和 aria-label）
    if (this.#lastPointerType === "touch") {
      return;
    }
    this.#pointerPosition = { x: event.clientX, y: event.clientY };
    const hit = resolveHit(event.target, this.#window.Element);
    if (hit.target) {
      this.#schedule(hit.target);
      return;
    }
    // 声明了提示但文字放得下：等于这里没有提示，收起亮着的那个。
    // 完全没声明提示的元素交给 mouseout 处理，免得打断同组里的连续提示。
    if (hit.declared) {
      this.#dismiss();
    }
  }

  #onMouseOut(event) {
    const trackedTarget = this.#activeTarget ?? this.#pendingTarget;
    if (!trackedTarget) {
      return;
    }

    const { Node } = this.#window;
    const from = event.target;
    if (!(from instanceof Node) || !trackedTarget.contains(from)) {
      return;
    }
    const to = event.relatedTarget;
    if (to instanceof Node && trackedTarget.contains(to)) {
      return;
    }

    // 亮着的提示、鼠标还在同一组里：只是经过控件之间的空隙，晚一点收起，下一个控件会直接接上
    if (
      this.#isOpen &&
      this.#warmGroup !== null &&
      to instanceof Node &&
      this.#warmGroup.contains(to)
    ) {
      this.#cancelHideTimer();
      this.#hideTimer = this.#window.setTimeout(() => {
        this.#hideTimer = null;
        this.#hide();
      }, GROUP_GAP_MILLIS);
      return;
    }

    this.#dismiss();
  }

  #onPointerDown(event) {
    this.#lastPointerType = event.pointerType;
    this.#dismiss();
  }

  #onPointerMove(event) {
    this.#lastPointerType = event.pointerType;
    const target = this.#activeTarget ?? this.#pendingTarget;
    if (!target || !target.contains(event.target)) {
      return;
    }
    this.#pointerPosition = { x: event.clientX, y: event.clientY };
    if (followsPointer(target)) {
      this.#place();
    }
  }

  // 键盘聚焦立即显示，锚定在控件上：用 Tab 浏览的人没有「停留」这个动作
  #onFocusIn(event) {
    this.#pointerPosition = null;
    const hit = resolveHit(event.target, this.#window.Element);
    if (hit.target) {
      this.#show(hit.target, false);
      return;
    }
    if (hit.declared) {
      this.#dismiss();
    }
  }

  // 焦点移动时 document.activeElement 要等这一轮事件结束才更新，所以放到微任务里判断
  #onFocusOut() {
    queueMicrotask(() => {
      const trackedTarget = this.#activeTarget ?? this.#pendingTarget;
      if (!trackedTarget) {
        return;
      }
      const focused = this.#document.activeElement;
      if (focused && trackedTarget.contains(focused)) {
        return;
      }
      this.#dismiss();
    });
  }

  #onKeyDown(event) {
    if (event.key === "Escape") {
      this.#dismiss();
      return;
    }
    // 用键盘操作亮着提示的控件时，提示改锚定到控件上
    if (this.#activeTarget?.contains(this.#document.activeElement)) {
      this.#pointerPosition = null;
      this.#place();
    }
  }

  #onViewportChanged() {
    if (!this.#isOpen) {
      return;
    }
    if (!this.#activeTarget.isConnected) {
      this.#dismiss();
      return;
    }
    this.#place();
  }
}
