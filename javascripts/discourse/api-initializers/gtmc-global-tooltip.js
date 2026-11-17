import { apiInitializer } from "discourse/lib/api";
import GtmcTooltipLayer from "../components/gtmc-tooltip-layer.gjs";

// below-footer 在所有页面都有（包括后台），提示层是 position: fixed，放在哪个出口不影响它的位置
export default apiInitializer((api) => {
  api.renderInOutlet("below-footer", GtmcTooltipLayer);
});
