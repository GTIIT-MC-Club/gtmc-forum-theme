import Component from "@glimmer/component";
import { service } from "@ember/service";
import PluginOutlet from "discourse/components/plugin-outlet";
import bodyClass from "discourse/helpers/body-class";
import lazyHash from "discourse/helpers/lazy-hash";

// 话题列表页（首页、版块列表、某个版块的话题列表）的右栏：挂在核心的 after-main-outlet 出口，
// 成为正文区网格的第三栏，栏里的面板由插件渲染进 gtmc-right-rail 出口
// （接口见 gtmc-forum-infra 的 PLAN.md 第 4 节）。
// 出现条件与理由见 README「右栏」；话题页的右栏另见 gtmc-topic-rail.gjs。
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
