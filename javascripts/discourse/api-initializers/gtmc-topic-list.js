import { apiInitializer } from "discourse/lib/api";
import GtmcPinnedLabel from "../components/gtmc-pinned-label";

// topic-list-before-status 在标题链接和核心的状态图标之前，桌面和手机的话题列表都有
export default apiInitializer((api) => {
  api.renderInOutlet("topic-list-before-status", GtmcPinnedLabel);
});
