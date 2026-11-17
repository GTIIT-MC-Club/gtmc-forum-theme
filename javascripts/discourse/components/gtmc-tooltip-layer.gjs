import { modifier } from "ember-modifier";
import GtmcGlobalTooltip from "../lib/gtmc-global-tooltip.js";

// 全局提示的提示层。页面上只有这一个，所有 data-tooltip 共用；行为全在 lib/gtmc-global-tooltip.js。
const installTooltip = modifier((layer) => {
  const tooltip = GtmcGlobalTooltip.forLayer(layer);
  tooltip.install();
  return () => tooltip.uninstall();
});

const GtmcTooltipLayer = <template>
  <div class="gtmc-tooltip-layer" {{installTooltip}}></div>
</template>;

export default GtmcTooltipLayer;
