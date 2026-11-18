import Component from "@glimmer/component";
import { service } from "@ember/service";
import PluginOutlet from "discourse/components/plugin-outlet";
import bodyClass from "discourse/helpers/body-class";
import lazyHash from "discourse/helpers/lazy-hash";

// 话题列表页（首页、版块列表、某个版块的话题列表）的右栏。主题只提供栏位和插件出口 gtmc-right-rail，
// 栏里的面板由插件渲染进这个出口（PLAN T5b）。话题页的右栏另见 gtmc-topic-rail.gjs。
//
// 只在视口不窄于核心的 xl 断点（80rem）时出现：再窄的话，左侧边栏、话题列表和 300px 的右栏三栏并排，
// 话题列表只剩不到 500px，标题要折好几行。手机上插件自己换形态（PLAN T5b）。
export default class GtmcRightRail extends Component {
  @service router;
  @service capabilities;

  get isDiscoveryRoute() {
    return this.router.currentRouteName?.startsWith("discovery.") ?? false;
  }

  get shouldRender() {
    return this.isDiscoveryRoute && this.capabilities.viewport.xl;
  }

  <template>
    {{#if this.shouldRender}}
      {{! 正文区的网格按这个类多分出一栏，见 desktop/desktop.scss }}
      {{bodyClass "gtmc-has-right-rail"}}
      <aside class="gtmc-right-rail">
        <PluginOutlet
          @name="gtmc-right-rail"
          @outletArgs={{lazyHash topic=null}}
        />
      </aside>
    {{/if}}
  </template>
}
