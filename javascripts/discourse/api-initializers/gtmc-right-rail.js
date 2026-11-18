import { apiInitializer } from "discourse/lib/api";
import GtmcRightRail from "../components/gtmc-right-rail.gjs";
import GtmcTopicRail from "../components/gtmc-topic-rail.gjs";

// 右栏的两个挂载点：话题列表页挂在正文区网格里（after-main-outlet 是 #main-outlet-wrapper 的直接子元素，
// 这个出口不包外层元素，组件的 <aside> 直接成为网格的一栏）；话题页挂在核心时间线所在的那一栏，原因见 gtmc-topic-rail.gjs。
export default apiInitializer((api) => {
  api.renderInOutlet("after-main-outlet", GtmcRightRail);
  api.renderInOutlet("topic-navigation", GtmcTopicRail);
});
