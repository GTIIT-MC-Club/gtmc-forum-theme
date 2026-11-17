import Component from "@glimmer/component";
import { ajax } from "discourse/lib/ajax";
import DAsyncContent from "discourse/ui-kit/d-async-content";
import dFormatDate from "discourse/ui-kit/helpers/d-format-date";
import { themePrefix } from "virtual:theme";
import { i18n } from "discourse-i18n";

// 设计稿 c-topic.html 画了 3 条：右栏和时间线共用一屏，再多就把时间线挤到首屏以外
const SAME_CATEGORY_TOPIC_LIMIT = 3;

// 话题页右栏里「同版块的其他话题」：取该版块最新的几个话题，去掉当前这个。
// 请求失败时面板里显示一句说明，不影响话题页其余部分；换到别的话题时按新话题重新取。
export default class GtmcSameCategoryTopics extends Component {
  // 核心的 ajax 不接受 AbortSignal；换话题时旧请求照常完成，结果由 DAsyncContent 丢弃
  loadTopics = async (topic) => {
    const response = await ajax(`${topic.category.url}/l/latest.json`);
    return response.topic_list.topics
      .filter((listedTopic) => listedTopic.id !== topic.id)
      .slice(0, SAME_CATEGORY_TOPIC_LIMIT);
  };

  <template>
    {{#if @topic.category}}
      <section class="gtmc-rail-panel gtmc-same-category-topics">
        <h3 class="gtmc-rail-panel-title">
          {{i18n (themePrefix "gtmc_rail.same_category.title")}}
        </h3>
        <DAsyncContent @asyncData={{this.loadTopics}} @context={{@topic}}>
          <:content as |topics|>
            <ul class="gtmc-same-category-topics-list">
              {{#each topics as |listedTopic|}}
                <li>
                  <a href="/t/{{listedTopic.slug}}/{{listedTopic.id}}">
                    <span class="gtmc-same-category-topic-title">
                      {{listedTopic.title}}
                    </span>
                    <span class="gtmc-same-category-topic-age">
                      {{dFormatDate listedTopic.bumped_at format="tiny"}}
                    </span>
                  </a>
                </li>
              {{/each}}
            </ul>
          </:content>
          <:empty>
            <p class="gtmc-rail-panel-placeholder">
              {{i18n (themePrefix "gtmc_rail.same_category.empty")}}
            </p>
          </:empty>
          <:error>
            <p class="gtmc-rail-panel-placeholder">
              {{i18n (themePrefix "gtmc_rail.same_category.failed")}}
            </p>
          </:error>
        </DAsyncContent>
      </section>
    {{/if}}
  </template>
}
