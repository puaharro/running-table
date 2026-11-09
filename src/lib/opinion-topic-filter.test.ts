import { expect, it } from "vitest";
import { topicComments, opinionTopics } from "./opinion-topic-filter";
import { runnerOpinions, type RunnerOpinions } from "@/data/runner-opinions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpinionTopicFilter } from "@/components/opinion-topic-filter";

it("deduplicates a source across topics, preserves originals and allows multiple labels", () => {
  const source = {
    reference: "test",
    author: "Test",
    quote: "接駁巴士到水站，再取行李",
    url: "https://example.invalid/post",
    scope: "不可用此註解改分類",
  };
  const record: RunnerOpinions = {
    ...runnerOpinions[0],
    topics: [
      { title: "賽道", summary: "", sources: [source, source] },
      { title: "大會安排", summary: "", sources: [source] },
    ],
  };
  const entries = topicComments(record);
  expect(entries).toHaveLength(1);
  expect(entries[0].source).toEqual(source);
  expect(new Set(entries[0].topics)).toEqual(new Set(opinionTopics));
});

it("does not classify by summaries, source URLs or scope and keeps unclassified sources", () => {
  const record = structuredClone(runnerOpinions[0]);
  record.topics = [
    {
      title: "補給",
      summary: "交通寄存水站",
      sources: [
        {
          reference: "test",
          author: "Test",
          quote: "食物不錯",
          url: "https://example.invalid/water",
          scope: "接駁及行李",
        },
      ],
    },
  ];
  expect(topicComments(record)[0].topics).toEqual([]);
});

it("counts each edition/group independently and renders five labelled filter controls", () => {
  for (const record of runnerOpinions) {
    const comments = topicComments(record);
    const originalKeys = new Set(
      record.topics.flatMap((topic) =>
        topic.sources.map((s) => JSON.stringify([s.url, s.author, s.quote])),
      ),
    );
    expect(comments).toHaveLength(originalKeys.size);
    const html = renderToStaticMarkup(createElement(OpinionTopicFilter, { record }));
    expect(html).toContain(`${record.editionYear} 年`);
    expect(html).toContain(record.groupLabel ?? "半馬");
    for (const topic of opinionTopics)
      expect(html).toContain(
        `${topic}（${comments.filter((entry) => entry.topics.includes(topic)).length}）`,
      );
    expect(html).toContain("不計入編輯總評分或評分人數");
    expect(html).not.toContain(" / 5");
  }
});
