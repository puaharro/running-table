// Only recognized, edition-specific notices and table rows can produce a value.
export const sourceOverrides = {
  "schkm-youth-2027": "https://www.hkmarathon.com/zh-hant/youth-run",
  "tai-po-half-2026": "https://tphm.sportsoho.com/",
  "emperor-marathon-crossing-2026": "https://www.acthk.org/event/p/3963",
  "world-vision-global-6k-2027": "https://www.worldvision.org.hk/global6k",
};

export const taiPoNews = "https://tphm.sportsoho.com/latest-news";
const garminGroups = ["21公里個人組", "10公里個人組", "3公里活力跑 \\(個人組\\)"];
export const marathonDates = "https://www.hkmarathon.com/important-dates";
export const charityDirectory = "https://www.hkmarathon.com/about-the-charitable-organisations";
const charityNames = {
  "avs.org.hk": /Agency for Volunteer Service/i,
  "kely.org": /KELY Support Group/i,
  "rainlily.org.hk": /Association Concerning Sexual Violence Against Women/i,
  "www.lavioletcharity.org": /La Violet Charity Foundation/i,
  "www.familyvalue.org.hk": /Family Value Foundation/i,
  "feedinghk.org": /Feeding Hong Kong/i,
  "www.apf.org.hk": /Autism Partnership Foundation|愛培自閉症基金/i,
  "www.hkbcf.org": /Hong Kong Breast Cancer Foundation/i,
  "herfund.org.hk": /HER Fund/i,
};
export const isLinkOnly = (channel) =>
  ["charity", "hotel", "travel", "tour"].includes(channel.type);

export function checkPartnerLink(race, channel, page, directory) {
  if (!channel.registrationUrl || !page) return null;
  const target = new URL(channel.registrationUrl);
  let evidence;
  if (race.id === "unicef-powerun-2027" && target.origin === "https://run.unicef.org.hk") {
    evidence = page.match(
      /(?:超能跑|POWER\s*RUN|HERO\s*RUN).{0,30}2026\s*[／/–-]\s*(?:20)?27|2027年\s*1月\s*3日/i,
    )?.[0];
  }
  if (race.id === "standard-chartered-hk-marathon-2027") {
    if (target.origin === "https://www.hkmarathon.com") {
      const edition = page.match(
        /Standard Chartered Hong Kong Marathon 2027|渣打香港馬拉松\s*2027|2027\s*渣打香港馬拉松/i,
      )?.[0];
      const programme =
        channel.type === "charity" ? /charity programme|慈善計劃/i : /room package|住宿套票/i;
      if (edition && programme.test(page)) evidence = edition + " · " + page.match(programme)[0];
    } else if (channel.type === "charity") {
      const name = charityNames[target.hostname];
      const listed = name ? directory.match(name)?.[0] : null;
      const recorded = race.sources?.some(
        (source) =>
          channel.sourceIds?.includes(source.id) && new URL(source.url).href === target.href,
      );
      const edition = page.match(
        /Standard Chartered Hong Kong Marathon\s*2027|2027\s*Standard Chartered Hong Kong Marathon|(?:渣打香港馬拉松|渣打馬拉松)\s*(?:慈善計劃\s*)?2027|2027\s*(?:年\s*)?(?:渣打香港馬拉松|渣打馬拉松)|SCHKM\s*2027/i,
      )?.[0];
      if (
        listed &&
        recorded &&
        edition &&
        /Official Charitable Organisations.{0,100}Marathon 2027/i.test(directory)
      )
        evidence = listed + " · " + edition;
    }
  }
  return evidence ? { value: channel.registrationUrl, quote: evidence } : null;
}

function soldOutSource(race, groups) {
  const channels = groups
    .flatMap((group) => group.channels)
    .filter((channel) => !isLinkOnly(channel));
  if (!channels.length || channels.some((channel) => channel.status !== "full")) return null;
  const official = race.sources
    ?.filter(
      (source) =>
        source.checkedAt &&
        source.fields?.includes("channels.registration") &&
        channels.every((channel) => channel.sourceIds?.includes(source.id)),
    )
    .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))[0];
  return official && /^https:\/\//.test(official.url) ? official : null;
}

export function confirmedSoldOut(race) {
  const official = soldOutSource(race, race.groups);
  if (!official) return null;
  const channels = race.groups
    .flatMap((group) => group.channels)
    .filter((channel) => !isLinkOnly(channel));
  const evidence = official.note ?? "";
  const all = /(?:所有|全部|全數)[^。；]{0,16}(?:額滿|名額已滿)/.test(evidence);
  const single = channels.length === 1 && /(?:名額已滿|額滿公告)/.test(evidence);
  if ((!all && !single) || /重開報名|重新接受報名/.test(evidence)) return null;
  return { ...official, allGroups: race.groups.length > 1 };
}

export function confirmedGroupSoldOut(race, group) {
  const source = soldOutSource(race, [group]);
  if (!source) return null;
  const name = group.name.replace(/\s+/g, "").replace(/(?:個人)?組$/, "");
  const aliases = [name, name.replace("半程馬拉松", "半馬")].filter(Boolean);
  const clauses = (source.note ?? "").replace(/\s+/g, "").split(/[。；，]/);
  const confirmed = clauses.some((clause) =>
    aliases.some((alias) => {
      const position = clause.indexOf(alias);
      if (position < 0) return false;
      return /^(?:個人)?(?:組|賽)?(?:的)?(?:報名)?(?:名額)?(?:已經?|全數)?(?:額滿|名額已滿|滿額)(?:$|[！!（(])/.test(
        clause.slice(position + alias.length),
      );
    }),
  );
  return confirmed ? source : null;
}

const hosts = new Set([
  ...Object.keys(charityNames),
  "run.unicef.org.hk",
  "www.run2gather.com",
  "www.worldvision.org.hk",
  "www.hkmarathon.com",
  "tphm.sportsoho.com",
  "mizunohkrun.com",
  "diabetes-hk.org",
  "garminrun.eventx.io",
  "www.acthk.org",
  "worldheartdayrun.hk",
  "runwithlove.org.hk",
  "in.njuko.com",
  "ymca125.sportsoho.com",
  "in.eventeticket.com",
  "hkaydrunwithus.sportsoho.com",
  "kaitakrun27.sportsoho.com",
  "www.familyvalue.org.hk",
  "www.hkaaa.com",
  "www.sksa.com.hk",
  "www.jotform.com",
]);

export async function readSource(url) {
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !hosts.has(url.hostname)
  )
    throw new Error("來源未納入試行清單");
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("官方頁回應 HTTP " + response.status);
  }
  if (!response.headers.get("content-type")?.includes("text/html") || !response.body) {
    await response.body?.cancel();
    throw new Error("未取得可讀 HTML 正文");
  }
  const decoder = new TextDecoder();
  let html = "",
    bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 2_000_000) throw new Error("頁面超出讀取限制");
    html += decoder.decode(chunk, { stream: true });
  }
  html += decoder.decode();
  const markup = html.replace(/<!--[\s\S]*?-->|<(script|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const links = [...markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)]
    .map(([, href]) => (URL.canParse(href, url) ? new URL(href, url).href : ""))
    .filter((href) => href.startsWith("https:"));
  return visibleText(html) + "\n" + [...new Set(links)].join("\n");
}

export function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(page, pattern, valueOf) {
  const candidates = [...page.matchAll(pattern)].map((match) => ({
    quote: match[0],
    value: valueOf(match),
  }));
  if (
    !candidates.length ||
    candidates.some((item) => item.value === null || item.value !== candidates[0].value)
  )
    return null;
  return candidates[0];
}

function hkClose([, year, month, day, hour, minute], period = "pm") {
  const date = [year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
  const time =
    String((Number(hour) % 12) + (period === "pm" ? 12 : 0)).padStart(2, "0") +
    ":" +
    minute.padStart(2, "0");
  const result = date + "T" + time + ":00+08:00";
  const ms = Date.parse(result);
  return Number(hour) >= 1 &&
    Number(hour) <= 12 &&
    Number.isFinite(ms) &&
    new Date(ms + 8 * 3600000).toISOString().slice(0, 16) === date + "T" + time
    ? result
    : null;
}

const amount = (match) => Number(match[1].replaceAll(",", ""));
export function extractRegistration(race, group, channel, page, url, now = Date.now()) {
  const observations = {};
  if (race.id === "standard-chartered-hk-marathon-2027" && channel.type === "priority") {
    if (
      url === marathonDates &&
      /September\s*[–-]\s*December 2026/.test(page) &&
      /January 2027/.test(page)
    ) {
      const events = {
        registrationOpensAt: "Registration Opens",
        registrationClosesAt: "Registration Closes",
        resultAnnouncedAt: "Result Announcement and Payment Opens",
        paymentClosesAt: "Payment Closes",
      };
      for (const [field, title] of Object.entries(events)) {
        observations[field] = pick(
          page,
          new RegExp(
            "(\\d{1,2}) (September|October|November|December) \\([^)]+\\) (\\d{1,2})(?::(\\d{2}))?(am|pm) Priority Entry " +
              title,
            "g",
          ),
          ([, day, month, hour, minute, period]) =>
            hkClose(
              [
                null,
                "2026",
                String(["September", "October", "November", "December"].indexOf(month) + 9),
                day,
                hour,
                minute ?? "00",
              ],
              period,
            ),
        );
      }
      const close = observations.registrationClosesAt;
      if (close && Date.parse(close.value) <= now)
        observations.status = { ...close, value: "closed" };
    }
    if (url === "https://www.hkmarathon.com/race-information" && /17 January 2027/.test(page)) {
      const distance = { 42.195: "42\\.195", 21.0975: "21\\.0975", 10: "10" }[group.distanceKm];
      if (distance)
        observations.price = pick(
          page,
          new RegExp(
            "Distance " +
              distance +
              "\\s*km Race Day 17 January 2027.{0,90}?Local Participant HKD ([\\d,]+)",
            "g",
          ),
          amount,
        );
      const entry = pick(
        page,
        /Registrations of Priority Entry will only be confirmed after relevant results are verified by the Hong Kong, China Association of Athletics Affiliates Limited/g,
        () => channel.registrationUrl,
      );
      if (entry) observations.registrationUrl = entry;
    }
    return observations;
  }
  if (channel.type !== "general") return observations;
  const quote = (pattern, value) => pick(page, pattern, () => value);
  const dateOnly = ([, year, month, day]) =>
    year + "-" + month.padStart(2, "0") + "-" + day.padStart(2, "0");
  const entry = (evidence) => {
    if (
      evidence &&
      channel.registrationUrl &&
      (url === new URL(channel.registrationUrl).href ||
        page.split("\n").includes(new URL(channel.registrationUrl).href))
    ) {
      observations.registrationUrl = { value: channel.registrationUrl, quote: evidence.quote };
    }
  };
  switch (race.id) {
    case "emperor-marathon-crossing-2026": {
      if (!page.includes("皇者之戰馬拉松") || !page.includes("2027年1月1日")) break;
      const table = page.match(/距離\s+時限\s+報名費\s+(.{1,260}?)\s+證書/)?.[1] ?? "";
      const names = {
        全程馬拉松: "馬拉松",
        半程馬拉松: "半馬拉松",
        "10公里": "十公里",
        "2公里": "二公里",
        "2公里親子組": "二公里親子組",
      };
      const name = names[group.name];
      if (name)
        observations.price = pick(
          table,
          new RegExp(
            "(?:^| )(" + name + ") [\\d.]+(?:小時(?:\\d+分)?|分鐘) HK\\$\\s*([\\d,]+)",
            "g",
          ),
          ([, , fee]) => Number(fee.replaceAll(",", "")),
        );
      observations.registrationClosesAt = quote(/報名額滿即止/g, "額滿即止");
      entry(quote(/網上報名 Online Enrollment/g, channel.registrationUrl));
      break;
    }
    case "run-with-love-2027": {
      if (url === race.sourceUrl && /明愛之友慈善跑\s*2027/.test(page)) {
        observations.registrationClosesAt = pick(
          page,
          /(\d{4})\/(\d{2})\/(\d{2})\s+截止報名/g,
          dateOnly,
        );
      } else if (
        url === channel.registrationUrl &&
        page.includes("選擇參加組別") &&
        page.includes("下一步")
      ) {
        const individual =
          page.match(/選擇參加組別:\s*個人組\s+(.{1,180}?)\s+企業、跑會及學校組/)?.[1] ?? "";
        const distance = /^(10|5|3|1)公里/.exec(group.name)?.[1];
        if (distance) {
          const fee = pick(
            individual,
            new RegExp("(?:^| )" + distance + "公里 \\(\\$([\\d,]+)\\)", "g"),
            amount,
          );
          observations.price = fee;
          if (fee && channel.status === "open")
            observations.status = { quote: fee.quote + " · 選擇參加組別", value: "open" };
          entry(fee);
        }
      }
      break;
    }
    case "hkayd-run-with-us-2026": {
      if (!page.includes("HKAYD Run With Us 2026") || !page.includes(group.name)) break;
      const tier = channel.name.includes("學生組")
        ? "學生組"
        : channel.name.includes("公開組")
          ? "公開組"
          : null;
      if (tier)
        observations.price = pick(page, new RegExp(tier + "\\*? HK\\$([\\d,]+)/人", "g"), amount);
      observations.registrationClosesAt = quote(/活動名額\s*[\d,]+人\s*\(額滿即止\)/g, "額滿即止");
      break;
    }
    case "kai-tak-run-2027": {
      if (!/啟德飛步跑\s*2027/.test(page)) break;
      const name = group.name.replace("（1–2人）", "").replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
      observations.price = pick(
        page,
        new RegExp(
          name +
            "(?: \\(1-2人\\))?\\** 公開報名，經此網站進行報名及付款費用\\s*港幣\\$([\\d,]+) / 位",
          "g",
        ),
        amount,
      );
      observations.registrationClosesAt = quote(/截止報名日期\s*先到先得，額滿即止/g, "額滿即止");
      if (page.split("\n").includes(new URL("/form/enrolment-form", url).href))
        entry(observations.price);
      break;
    }
    case "world-vision-global-6k-2027": {
      if (!/2027\s*年\s*1\s*月\s*10\s*日/.test(page)) break;
      const name = group.name
        .replace(/[.*+?^\${}()|[\]\\]/g, "\\$&")
        .replace(/公里/g, "公里\\s*")
        .replace("Jerrycan隊際賽", "Jerrycan\\s*隊際賽")
        .replace("非企業組", "非企業組(?:別)?");
      observations.price = pick(
        page,
        new RegExp(
          name +
            "(?:(?!報名費用|\\d+\\s*公里\\s*(?:個人|親子|JERRYCAN)).){0,245}?報名費用[：:]\\s*(?:每隊|每人)?港幣\\s*\\$([\\d,]+)",
          "gi",
        ),
        amount,
      );
      observations.status = quote(/Global 6K for Water 香港站賽事，現已開放報名！/g, "open");
      observations.registrationClosesAt = pick(
        page,
        /截止報名日期[：:]\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g,
        dateOnly,
      );
      const quota = quote(/報名申請將以先到先得方式處理，額滿即止/g, "額滿即止");
      if (observations.registrationClosesAt && quota)
        observations.registrationClosesAt.quote += " · " + quota.quote;
      entry(observations.status);
      break;
    }
    case "schkm-youth-2027":
      if (!page.includes("2027年1月16日")) break;
      observations.registrationOpensAt = pick(
        page,
        /報名日期\s*(\d{4})年(\d{1,2})月(\d{1,2})日(?:（[^）]+）)?\s*(上午|中午|下午|晚上)(\d{1,2})時(?:(\d{1,2})分|正)/g,
        ([, year, month, day, period, hour, minute]) =>
          hkClose([null, year, month, day, hour, minute ?? "00"], period === "上午" ? "am" : "pm"),
      );
      observations.price = pick(page, /報名費\s*([\d,]+)\s*港元正/g, amount);
      observations.registrationClosesAt = pick(
        page,
        /報名日期\s*\d{4}年\d{1,2}月\d{1,2}日[^。*]{0,35}?\s至\s*(\d{4})年(\d{1,2})月(\d{1,2})日(?:（[^）]+）)?\s*晚上(\d{1,2})時(\d{1,2})分/g,
        hkClose,
      );
      break;
    case "ocean-park-run-for-survival-2026":
      if (!/生態保衛賽\s*2026/.test(page)) break;
      observations.registrationClosesAt = pick(
        page,
        /報名結束於\s*(\d{4})年(\d{1,2})月(\d{1,2})日[，,]\s*香港時間晚上(\d{1,2})時(\d{1,2})分/g,
        hkClose,
      );
      break;
    case "garmin-run-hk-2026": {
      if (url !== "https://garminrun.eventx.io/" || !page.includes("2026年12月20日")) break;
      const label = garminGroups[Number(/-(\d)-general$/.exec(channel.id)?.[1])];
      if (label)
        observations.price = pick(
          page,
          new RegExp(
            label + " \\(名額已滿\\) HK\\$[\\d,]+ \\(名額：[\\d,]+個\\) HK\\$([\\d,]+)(?![\\d,.])",
            "g",
          ),
          amount,
        );
      break;
    }
    case "tai-po-half-2026": {
      if (url === taiPoNews) {
        if (group.name === "半程馬拉松個人組")
          observations.status = pick(
            page,
            /\d{1,2}\/\d{1,2}\/2026\s+半程?馬拉松名額已滿[。！]?/g,
            () => "full",
          );
        break;
      }
      if (!/2026年12月27日/.test(page)) break;
      const groupName = group.name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
      observations.registrationClosesAt = quote(/截止報名日期\s*額滿即止/g, "額滿即止");
      observations.price = pick(
        page,
        new RegExp(groupName + " HK\\$([\\d,]+)(?![\\d,.])", "g"),
        amount,
      );
      break;
    }
    case "mizuno-hk-run-fest-2026":
      observations.status = pick(
        page,
        /美津濃香港跑步祭\s*2026\s*所有組別名額已滿！/g,
        () => "full",
      );
      break;
    case "dhk-healthy-run-2027":
      observations.status = pick(
        page,
        /《2027年香港糖尿聯會健康長跑》名額已全數額滿！/g,
        () => "full",
      );
      break;
  }
  if (
    !["hkayd-run-with-us-2026", "kai-tak-run-2027"].includes(race.id) &&
    channel.registrationUrl &&
    url === new URL(channel.registrationUrl).href
  ) {
    const evidence = Object.values(observations).find(Boolean);
    if (evidence)
      observations.registrationUrl = { value: channel.registrationUrl, quote: evidence.quote };
  }
  return observations;
}
