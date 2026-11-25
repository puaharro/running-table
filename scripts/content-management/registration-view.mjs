import { fields, RegistrationReview, registrationTargets } from "./registration-review.mjs";
import {
  confirmedGroupSoldOut,
  confirmedSoldOut,
  endedPartnerRegistration,
} from "./registration-sources.mjs";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const local = new Intl.DateTimeFormat("zh-HK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Hong_Kong",
});
const date = (value) => (value ? local.format(value) : "未記錄");
const labels = {
  open: "接受報名",
  full: "額滿",
  closed: "截止",
  unknown: "未核實",
  upcoming: "即將開放",
};
function display(value, field) {
  if (value == null) return "未列明";
  if (field === "price") return "HK$" + value;
  if (
    [
      "registrationClosesAt",
      "registrationOpensAt",
      "resultAnnouncedAt",
      "paymentClosesAt",
    ].includes(field) &&
    value.includes("T")
  )
    return date(Date.parse(value));
  return labels[value] ?? value;
}
export function registrationPanel(content, { race, year }) {
  const service = new RegistrationReview(content);
  const trial = service.trial();
  if (!trial) return "";
  const recorded = service.rows();
  const targets = new Map(
    registrationTargets(content.baseCatalog, Date.now(), recorded).flatMap((t) =>
      Object.keys(t.baseline).map((field) => [t.channel.id + ":" + field, t]),
    ),
  );
  const rows = recorded
    .filter((row) => (!race || row.raceId === race) && (!year || row.year === year))
    .filter(
      (row) => targets.get(row.channelId + ":" + row.field)?.baseline[row.field] !== undefined,
    );
  const runs = service.runs().filter((run) => run.at >= trial.starts_at);
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const soldOut = content.baseCatalog
    .filter(
      (item) =>
        item.publication === "published" &&
        item.date >= today &&
        (!race || item.id === race) &&
        (!year || Number(item.date.slice(0, 4)) === year),
    )
    .flatMap((item) => {
      const evidence = confirmedSoldOut(item);
      const entries = evidence
        ? [{ label: item.name + (evidence.allGroups ? "所有組別名額已滿" : "名額已滿"), evidence }]
        : item.groups.flatMap((group) => {
            const groupEvidence = confirmedGroupSoldOut(item, group);
            return groupEvidence
              ? [{ label: item.name + " · " + group.name + "名額已滿", evidence: groupEvidence }]
              : [];
          });
      return entries.map(
        ({ label, evidence }) =>
          "<li><strong>" +
          escape(label) +
          '</strong><p class="meta">' +
          escape(evidence.note) +
          " · 核對 " +
          escape(date(Date.parse(evidence.checkedAt))) +
          ' · <a href="' +
          escape(evidence.url) +
          '" target="_blank" rel="noopener noreferrer">官方公告 ↗</a></p></li>',
      );
    });
  const endedLinks = new Map();
  for (const item of content.baseCatalog.filter(
    (item) =>
      item.publication === "published" &&
      item.date >= today &&
      (!race || item.id === race) &&
      (!year || Number(item.date.slice(0, 4)) === year),
  )) {
    for (const group of item.groups)
      for (const channel of group.channels) {
        const status = endedPartnerRegistration(item, channel, Date.now());
        if (!status) continue;
        const deadline = channel.registrationClosesAt ?? channel.deadline;
        const key = JSON.stringify([
          item.id,
          channel.name,
          channel.registrationUrl,
          status,
          deadline,
        ]);
        if (!endedLinks.has(key))
          endedLinks.set(key, { name: item.name, channel, status, deadline, groups: [] });
        endedLinks.get(key).groups.push(group.name);
      }
  }
  function groupResults(states, linkOnly = false, raceId = null) {
    const channels = new Map();
    for (const row of rows
      .filter(
        (item) =>
          states.includes(item.state) &&
          (item.field === "partnerLink") === linkOnly &&
          (!raceId || item.raceId === raceId),
      )
      .sort((a, b) => Number(b.urgent) - Number(a.urgent))) {
      const key = linkOnly && row.url ? row.raceId + ":" + row.url : row.channelId;
      if (!channels.has(key)) channels.set(key, []);
      channels.get(key).push(row);
    }
    return (
      [...channels.values()]
        .map((items) => {
          const first = items[0];
          const name = targets.get(first.channelId + ":" + first.field).race.name;
          return (
            "<li><strong>" +
            escape(
              [
                ...(!raceId ? [name] : []),
                linkOnly ? [...new Set(items.map((row) => row.group))].join("／") : first.group,
                first.channel,
              ].join(" · "),
            ) +
            "</strong>" +
            "<ul>" +
            (linkOnly ? [first] : items)
              .map((row) => {
                const current = targets.get(row.channelId + ":" + row.field);
                const canDecide =
                  row.state === "change" &&
                  current.url === row.url &&
                  current.baseline[row.field] === row.oldValue;
                return (
                  "<li><strong>" +
                  escape(fields[row.field]) +
                  "</strong> · " +
                  escape(
                    display(
                      row.state === "same" && row.suggestion === "額滿即止"
                        ? row.suggestion
                        : current.baseline[row.field],
                      row.field,
                    ),
                  ) +
                  (row.state === "pending"
                    ? " · " + escape(row.reason)
                    : row.state === "same"
                      ? ""
                      : " → " + escape(display(row.suggestion, row.field))) +
                  (row.evidence && row.state !== "pending"
                    ? "<blockquote>" + escape(row.evidence) + "</blockquote>"
                    : "") +
                  '<p class="meta">查閱 ' +
                  escape(date(row.attemptedAt)) +
                  " · 有明確依據 " +
                  escape(date(row.verifiedAt)) +
                  (row.url
                    ? ' · <a href="' +
                      escape(row.url) +
                      '" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>'
                    : "") +
                  "</p>" +
                  (row.decidedAt ? "<p>人工決定 " + escape(date(row.decidedAt)) + "</p>" : "") +
                  (canDecide
                    ? '<form data-registration-revision="' +
                      escape(row.revision) +
                      '"><button name="decision" value="accepted">批准此欄位更新</button> <button name="decision" value="rejected">拒絕更新</button></form>'
                    : "") +
                  (row.state === "change" && !canDecide
                    ? "<p>現有依據已變，等下輪覆核。</p>"
                    : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul></li>"
          );
        })
        .join("") || "<li>暫無項目。</li>"
    );
  }
  const count = (state) =>
    rows.filter((row) => row.state === state && row.field !== "partnerLink").length;
  const pendingRaces = new Map();
  for (const row of rows.filter((row) => row.state === "pending" && row.field !== "partnerLink")) {
    pendingRaces.set(row.raceId, (pendingRaces.get(row.raceId) ?? 0) + 1);
  }
  const linkCount = (state) =>
    new Set(
      rows
        .filter((row) => row.field === "partnerLink" && row.state === state)
        .map((row) => row.raceId + ":" + (row.url ?? row.channelId)),
    ).size;
  return (
    '<section id="registration-review"><h3>報名資料自動覆核</h3><p>試行 ' +
    escape(date(trial.starts_at)) +
    " 至 " +
    escape(date(trial.ends_at)) +
    "（香港時間）</p>" +
    '<p class="meta">人工批准會保存於私人 CMS，正式接入網站沿用資料發布流程。</p>' +
    '<p id="registration-review-message" role="status"></p>' +
    (soldOut.length
      ? '<details id="registration-sold-out" open><summary>已確認額滿 · 停止例行覆核 · ' +
        soldOut.length +
        "</summary><ul>" +
        soldOut.join("") +
        "</ul></details>"
      : "") +
    '<details id="registration-changes" open><summary>報名變更待批准 · ' +
    count("change") +
    "</summary><ul>" +
    groupResults(["change"]) +
    "</ul></details>" +
    '<details id="registration-pending"><summary>報名欄位待查 · ' +
    count("pending") +
    " · " +
    pendingRaces.size +
    " 場</summary>" +
    [...pendingRaces]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([id, number]) =>
          "<details><summary>" +
          escape(content.baseCatalog.find((item) => item.id === id)?.name) +
          " · " +
          number +
          " 項</summary><ul>" +
          groupResults(["pending"], false, id) +
          "</ul></details>",
      )
      .join("") +
    "</details>" +
    '<details id="registration-same"><summary>官方資料相同，已自動記錄 · ' +
    count("same") +
    "</summary><ul>" +
    groupResults(["same"]) +
    "</ul></details>" +
    "<details><summary>已人工處理 · " +
    (count("accepted") + count("rejected")) +
    "</summary><ul>" +
    groupResults(["accepted", "rejected"]) +
    "</ul></details>" +
    (endedLinks.size
      ? '<details id="registration-ended-links"><summary>慈善／旅遊渠道已截止或額滿 · ' +
        endedLinks.size +
        "</summary><ul>" +
        [...endedLinks.values()]
          .map(
            (item) =>
              "<li>" +
              escape(
                [item.name, item.groups.join("／"), item.channel.name, labels[item.status]].join(
                  " · ",
                ),
              ) +
              (item.deadline
                ? " · " + escape(display(item.deadline, "registrationClosesAt"))
                : "") +
              (item.channel.registrationUrl
                ? ' · <a href="' +
                  escape(item.channel.registrationUrl) +
                  '" target="_blank" rel="noopener noreferrer">官方詳情 ↗</a>'
                : "") +
              "</li>",
          )
          .join("") +
        "</ul></details>"
      : "") +
    '<details id="registration-links"><summary>慈善／旅遊連結待查 · ' +
    linkCount("pending") +
    "</summary><ul>" +
    groupResults(["pending"], true) +
    "</ul></details>" +
    "<details><summary>慈善／旅遊連結已核實 · " +
    linkCount("same") +
    "</summary><ul>" +
    groupResults(["same"], true) +
    "</ul></details>" +
    "<details><summary>試行紀錄 · " +
    runs.length +
    " 輪</summary><ul>" +
    runs
      .map(
        (run) =>
          "<li>" +
          escape(date(run.at)) +
          " · 巡查來源 " +
          run.sources +
          " · 可讀 " +
          run.readable +
          " · 相同 " +
          run.same +
          " · 變更待批准 " +
          run.change +
          " · 待查 " +
          run.pending +
          (run.linksPending === undefined
            ? ""
            : " · 連結已核實 " + run.linksSame + " · 連結待查 " + run.linksPending) +
          "</li>",
      )
      .join("") +
    "</ul></details></section>"
  );
}

export const registrationScript = `
document.querySelectorAll('form[data-registration-revision]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const decision = event.submitter.value;
  form.querySelectorAll('button').forEach(button => button.disabled = true);
  try {
    const response = await fetch('/api/content/registration/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Import-Token': document.querySelector('meta[name="import-token"]').content },
      body: JSON.stringify({ revision: form.dataset.registrationRevision, decision })
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || result.message);
    location.reload();
  } catch (error) {
    document.getElementById('registration-review-message').textContent = error.message;
    form.querySelectorAll('button').forEach(button => button.disabled = false);
  }
}));`;
