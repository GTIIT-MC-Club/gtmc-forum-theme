import { apiInitializer } from "discourse/lib/api";
import GtmcFooter from "../components/gtmc-footer.gjs";

// below-footer 在核心自定义页脚之后、页面最底部，所有页面都有；showFooter 作为出口参数传入
export default apiInitializer((api) => {
  api.renderInOutlet("below-footer", GtmcFooter);
});
