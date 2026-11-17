import Component from "@glimmer/component";
import { settings, themePrefix } from "virtual:theme";
import { i18n } from "discourse-i18n";

// 全站页脚：社团名、一句简介、几个常用链接、商标声明。
// 链接地址来自主题设置（见 settings.yml），留空的不显示；「关于」是核心自带页面，地址固定。
export default class GtmcFooter extends Component {
  get links() {
    return [
      {
        url: settings.footer_newcomer_guide_url,
        labelKey: "gtmc_footer.links.newcomer_guide",
      },
      {
        url: settings.footer_appeal_url,
        labelKey: "gtmc_footer.links.appeal",
      },
      { url: "/about", labelKey: "gtmc_footer.links.about" },
      {
        url: settings.discord_invite_url,
        labelKey: "gtmc_footer.links.discord",
        external: true,
      },
    ].filter((link) => link.url);
  }

  <template>
    {{! 核心在列表或话题读到底之前把 showFooter 置为 false，否则无限滚动时页脚会夹在列表中间 }}
    {{#if @outletArgs.showFooter}}
      <footer class="gtmc-footer">
        <div class="gtmc-footer-content">
          <div class="gtmc-footer-about">
            <span class="gtmc-footer-club-name">
              {{i18n (themePrefix "gtmc_footer.club_name")}}
            </span>
            <span class="gtmc-footer-summary">
              {{i18n (themePrefix "gtmc_footer.summary")}}
            </span>
          </div>

          <ul class="gtmc-footer-links">
            {{#each this.links as |link|}}
              <li>
                {{#if link.external}}
                  <a
                    href={{link.url}}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {{i18n (themePrefix link.labelKey)}}
                  </a>
                {{else}}
                  <a href={{link.url}}>{{i18n (themePrefix link.labelKey)}}</a>
                {{/if}}
              </li>
            {{/each}}
          </ul>

          <p class="gtmc-footer-disclaimer">
            {{i18n (themePrefix "gtmc_footer.disclaimer")}}
          </p>
        </div>
      </footer>
    {{/if}}
  </template>
}
