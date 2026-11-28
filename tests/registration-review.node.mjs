import test from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { RegistrationReview } from "../scripts/content-management/registration-review.mjs";
import {
  extractRegistration,
  taiPoNews,
  visibleText,
} from "../scripts/content-management/registration-sources.mjs";
import { registrationPanel } from "../scripts/content-management/registration-view.mjs";

const hour = 3600000;
const channel = {
  id: "op-1",
  type: "general",
  name: "一般",
  status: "open",
  price: 798,
  registrationClosesAt: "2099-12-01T23:59:00+08:00",
  registrationUrl: "https://www.run2gather.com/new-events/example",
};
const race = {
  id: "ocean-park-run-for-survival-2026",
  date: "2099-12-13",
  publication: "published",
  groups: [{ name: "5 公里", channels: [channel, { ...channel, id: "op-2" }] }],
};
const page = "生態保衛賽2026 報名結束於2026年12月1日，香港時間晚上11時59分";

test("official changes need a current human decision and unresolved fields retain prior evidence", async () => {
  const content = new ContentStore(":memory:", "manual", [race]);
  try {
    const service = new RegistrationReview(content);
    const now = Date.now();
    service.start(now);
    let calls = 0;
    const load = async () => {
      calls++;
      return page;
    };
    assert.deepEqual(await service.run({ now, load }), {
      sources: 1,
      readable: 1,
      same: 2,
      change: 2,
      pending: 6,
      accepted: 0,
      rejected: 0,
    });
    assert.equal(await service.run({ now: now + hour, load }), null);
    assert.equal(calls, 1);
    assert.match(registrationPanel(content, {}), /批准此欄位更新/);
    const change = service.rows().find((row) => row.state === "change");
    const approved = service.decide({ revision: change.revision, decision: "accepted" });
    assert.equal(approved.state, "accepted");
    assert.throws(() => service.decide({ revision: change.revision, decision: "rejected" }), {
      status: 409,
    });
    assert.equal(channel.registrationClosesAt, "2099-12-01T23:59:00+08:00");
    await service.run({
      now: now + 24 * hour,
      load: async () => {
        throw new Error("timeout");
      },
    });
    const pending = service
      .rows()
      .find((row) => row.channelId === change.channelId && row.field === change.field);
    assert.equal(pending.state, "pending");
    assert.equal(pending.verifiedAt, now);
    assert.equal(pending.attemptedAt, now + 24 * hour);
    await service.run({ now: now + 48 * hour, load });
    assert.equal(
      service.rows().find((row) => row.channelId === change.channelId && row.field === change.field)
        .state,
      "accepted",
    );
    assert.equal(await service.run({ now: now + 7 * 24 * hour, load }), null);
  } finally {
    content.close();
  }
});

test("fee rows and sold-out notices never bleed into other groups or fields", () => {
  const taiPo = { id: "tai-po-half-2026" };
  const announcement = "9/11/2026 半程馬拉松名額已滿。 19/8/2026 現已接受報名。 額滿即止";
  assert.equal(
    extractRegistration(taiPo, { name: "半程馬拉松個人組" }, channel, announcement, taiPoNews)
      .status.value,
    "full",
  );
  assert.equal(
    extractRegistration(taiPo, { name: "10公里個人組" }, channel, announcement, taiPoNews).status,
    undefined,
  );
  const fees = "2026年12月27日 7:30am 半程馬拉松個人組 HK$350 7:50am 10公里個人組 HK$250";
  const result = extractRegistration(
    taiPo,
    { name: "10公里個人組" },
    channel,
    fees,
    "https://tphm.sportsoho.com/",
  );
  assert.equal(result.price.value, 250);
  assert.equal(result.status, undefined);
  assert.equal(
    extractRegistration(race, {}, channel, page + " " + page.replace("12月1日", "12月2日"))
      .registrationClosesAt,
    null,
  );
  assert.equal(
    visibleText("<script>編造報名狀態</script><!-- 舊資料 --><p>報名日期</p>"),
    "報名日期",
  );
});

test("equivalent Hong Kong deadline is recorded with no approval task", async () => {
  const matchingRace = {
    ...race,
    groups: [
      {
        name: "5 公里",
        channels: [{ ...channel, registrationClosesAt: "2026-12-01T15:59:00Z", status: "unknown" }],
      },
    ],
  };
  const content = new ContentStore(":memory:", "manual", [matchingRace]);
  try {
    const service = new RegistrationReview(content);
    const now = Date.parse("2026-11-25T12:00:00+08:00");
    service.start(now);
    const summary = await service.run({ now, load: async () => page });
    assert.equal(summary.same, 2);
    assert.equal(summary.change, 0);
    assert.equal(summary.pending, 3);
  } finally {
    content.close();
  }
});

test("registration approval uses the existing local CMS token", async (t) => {
  const { startManualServer } = await import("../scripts/threads/manual-server.mjs");
  const { ManualStore } = await import("../scripts/threads/manual-store.mjs");
  const { ReviewStore } = await import("../scripts/threads/review-store.mjs");
  const content = new ContentStore(":memory:", "demo", [race]);
  const store = new ManualStore(":memory:", "demo", { multiSource: true });
  const reviews = new ReviewStore(":memory:");
  const service = new RegistrationReview(content);
  service.start();
  await service.run({ load: async () => page });
  const row = service.rows().find((item) => item.state === "change");
  const { server, url } = await startManualServer({ content, store, reviews });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    content.close();
    store.close();
    reviews.close();
  });
  const html = await (await fetch(url + "/materials")).text();
  const token = html.match(/name="import-token" content="([^"]+)"/)[1];
  const post = (value) =>
    fetch(url + "/api/content/registration/decide", {
      method: "POST",
      headers: { Origin: url, "Content-Type": "application/json", "X-Import-Token": value },
      body: JSON.stringify({ revision: row.revision, decision: "accepted" }),
    });
  assert.match(html, /報名變更待批准 · 2/);
  assert.equal((await post("invalid")).status, 403);
  assert.equal((await (await post(token)).json()).state, "accepted");
  assert.equal((await post(token)).status, 409);
});

test("priority schedule distinguishes application and payment, while partner checks require the edition and designation", async () => {
  const { checkPartnerLink, marathonDates } =
    await import("../scripts/content-management/registration-sources.mjs");
  const { registrationTargets } =
    await import("../scripts/content-management/registration-review.mjs");
  const priority = { ...channel, id: "priority", type: "priority" };
  const url = "https://avs.org.hk/SCHKM2027";
  const charity = {
    ...channel,
    id: "charity",
    type: "charity",
    registrationUrl: url,
    sourceIds: ["avs"],
  };
  const marathon = {
    ...race,
    id: "standard-chartered-hk-marathon-2027",
    groups: [
      {
        name: "全馬",
        channels: [priority, charity, { ...charity, id: "no-link", registrationUrl: undefined }],
      },
    ],
    sources: [{ id: "avs", url }],
  };
  const now = Date.parse("2026-11-25T12:00:00+08:00");
  const dates =
    "September – December 2026 4 September (Friday) 4pm Priority Entry Registration Opens 7 September (Monday) 7pm Priority Entry Registration Closes 14 September (Monday) 11:59pm Priority Entry Payment Closes January 2027";
  const result = extractRegistration(marathon, {}, priority, dates, marathonDates, now);
  assert.equal(result.registrationClosesAt.value, "2026-09-07T19:00:00+08:00");
  assert.equal(result.paymentClosesAt.value, "2026-09-14T23:59:00+08:00");
  const source = "Standard Chartered Hong Kong Marathon 2027";
  const directory =
    "The Official Charitable Organisations of the Standard Chartered Hong Kong Marathon 2027 are as follows: Agency for Volunteer Service";
  assert.equal(checkPartnerLink(marathon, charity, source, directory).value, url);
  assert.equal(
    checkPartnerLink(marathon, charity, source.replace("2027", "2026"), directory),
    null,
  );
  assert.equal(checkPartnerLink(marathon, charity, source, ""), null);
  const targets = registrationTargets([marathon], now);
  assert.deepEqual(targets.find((t) => t.channel === charity).baseline, { partnerLink: url });
  assert.ok(
    targets.some((t) => t.channel === priority && Object.hasOwn(t.baseline, "eligibility")),
  );
  assert.ok(targets.some((t) => t.channel.id === "no-link" && t.url === null));
});

test("verified race-wide and group-specific sellouts leave the queue at the confirmed scope", async () => {
  const { confirmedSoldOut } =
    await import("../scripts/content-management/registration-sources.mjs");
  const { registrationTargets } =
    await import("../scripts/content-management/registration-review.mjs");
  const source = {
    id: "notice",
    url: "https://www.run2gather.com/notice",
    checkedAt: "2026-11-25T12:00:00+08:00",
    fields: ["channels.registration"],
    note: "官方公布全部組別額滿。",
  };
  const full = { ...channel, status: "full", sourceIds: [source.id] };
  const candidate = {
    ...race,
    sources: [source],
    groups: [
      { name: "5K", channels: [full] },
      { name: "10K", channels: [{ ...full, id: "10K" }] },
    ],
  };
  assert.equal(confirmedSoldOut(candidate).id, source.id);
  assert.deepEqual(registrationTargets([candidate], Date.now()), []);
  candidate.groups[1].channels[0].status = "open";
  assert.equal(confirmedSoldOut(candidate), null);
  assert.equal(registrationTargets([candidate], Date.now()).length, 2);
  source.note = "大會公布5K組名額已滿。";
  const remaining = registrationTargets([candidate], Date.now());
  assert.deepEqual(
    remaining.map((target) => target.group.name),
    ["10K"],
  );
  const content = new ContentStore(":memory:", "demo", [candidate]);
  try {
    new RegistrationReview(content).start();
    assert.match(registrationPanel(content, {}), /5K名額已滿/);
  } finally {
    content.close();
  }
});

test("an explicitly sourced sellout leaves only the affected channel out of the review queue", async () => {
  const { registrationTargets } =
    await import("../scripts/content-management/registration-review.mjs");
  const checkedAt = "2026-11-25T12:00:00+08:00";
  const source = {
    id: "notice",
    url: "https://www.run2gather.com/notice",
    checkedAt,
    fields: ["channels.registration"],
  };
  const full = {
    ...channel,
    status: "full",
    registrationVerifiedAt: checkedAt,
    sourceIds: [source.id],
    soldOutSourceId: source.id,
  };
  const other = { ...channel, id: "other", status: "unknown" };
  const event = {
    ...race,
    verification: "verified",
    sources: [source],
    groups: [{ name: "5K", channels: [full, other] }],
  };
  const now = Date.parse("2026-11-29T12:00:00+08:00");
  assert.deepEqual(
    registrationTargets([event], now).map((target) => target.channel.id),
    ["other"],
  );
  full.status = "open";
  delete full.soldOutSourceId;
  assert.ok(registrationTargets([event], now).some((target) => target.channel.id === full.id));
});

test("official quota-only deadline and verified opening end the relevant follow-ups", async () => {
  const { registrationTargets } =
    await import("../scripts/content-management/registration-review.mjs");
  const feeChannel = {
    ...channel,
    registrationClosesAt: null,
    registrationUrl: "https://www.acthk.org/formStandard/start/332",
    price: 328,
  };
  const event = {
    ...race,
    id: "emperor-marathon-crossing-2026",
    groups: [{ name: "半程馬拉松", channels: [feeChannel] }],
  };
  const now = Date.parse("2026-11-25T14:00:00+08:00");
  const content = new ContentStore(":memory:", "demo", [event]);
  try {
    const service = new RegistrationReview(content);
    service.start(now);
    const official =
      "皇者之戰馬拉松 2027年1月1日 網上報名 Online Enrollment 報名額滿即止。 距離 時限 報名費 馬拉松 5小時30分 HK$ 428 半馬拉松 3小時 HK$ 328 證書\nhttps://www.acthk.org/formStandard/start/332";
    await service.run({ now, load: async () => official });
    const rows = service.rows();
    const close = rows.find((row) => row.field === "registrationClosesAt");
    assert.equal(close.state, "same");
    assert.equal(close.suggestion, "額滿即止");
    assert.equal(rows.find((row) => row.field === "price").suggestion, 328);
    const opening = registrationTargets([event], now, rows)[0].baseline;
    assert.ok(Object.hasOwn(opening, "registrationOpensAt"));
    const status = rows.find((row) => row.field === "status");
    const verified = { ...status, state: "same", suggestion: "open", verifiedAt: now };
    assert.ok(
      !Object.hasOwn(
        registrationTargets([event], now, [verified])[0].baseline,
        "registrationOpensAt",
      ),
    );
  } finally {
    content.close();
  }
});

test("Global 6K fees stay with their own group even when adjacent", () => {
  const event = { id: "world-vision-global-6k-2027" };
  const page =
    "2027 年 1 月 10 日 6公里 個人跑 報名費用：港幣$330 6公里 JERRYCAN 隊際賽（非企業組別） 報名費用：每隊港幣$1,320";
  const url = "https://www.worldvision.org.hk/global6k";
  assert.equal(
    extractRegistration(event, { name: "6公里個人跑" }, channel, page, url).price.value,
    330,
  );
  assert.equal(
    extractRegistration(event, { name: "6公里Jerrycan隊際賽（非企業組）" }, channel, page, url)
      .price.value,
    1320,
  );
  assert.equal(
    extractRegistration(
      event,
      { name: "6公里個人跑" },
      channel,
      page.replace("報名費用：港幣$330 ", ""),
      url,
    ).price,
    null,
  );
});
