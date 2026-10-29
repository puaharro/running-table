import { groupEntryLabel, groupRatings, ratingMethodVersion } from "@/lib/group-ratings";
import { cutoffCriteria, distanceCriteria, ratingPolicy } from "@/lib/rating-policy";
import { formatTimestamp } from "@/lib/races";
import type { Race, RaceGroup } from "@/lib/types";

export function GroupRatings({ race, group }: { race: Race; group: RaceGroup }) {
  return (
    <section className="group-ratings" aria-label={`${group.name}組別比較`}>
      <h4>
        組別比較 <small>編輯準則 · 不設總分</small>
      </h4>
      <p>分開比較時限、距離及集合安排，參加資格另外列出。</p>
      <p className="rating-entry">參加資格：{groupEntryLabel(race, group)}</p>
      <dl className="rating-grid">
        {groupRatings(race, group).map((rating) => (
          <div key={rating.title}>
            <dt>{rating.title}</dt>
            <dd>
              <strong>{rating.value}</strong>
              <details>
                <summary>{rating.title}依據</summary>
                <p>{rating.basis}</p>
                {rating.sources.map((source) => (
                  <p key={source.id}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title} ↗
                    </a>
                    <br />
                    <small>來源最後核對：{formatTimestamp(source.checkedAt)} HKT</small>
                  </p>
                ))}
              </details>
            </dd>
          </div>
        ))}
      </dl>
      <p className="rating-scope">
        完整難度：未評。尚未完整納入{ratingPolicy.fullDifficultyMissing.join("、")}
        ，上述標籤不代表整體賽道難度。
      </p>
      <details className="rating-method">
        <summary>比較準則及限制</summary>
        <p>
          由{ratingPolicy.publisher}
          制定、按已存官方資料比較；不是官方認證或跑手評價。資料不足顯示未評，未評不計零分，亦不合計或排序總分。
        </p>
        <p>
          時限寬鬆度按總時限除以距離所得的每公里容許時間：{cutoffCriteria()}
          。資格只作標籤，不影響時限結果；少年組的時限亦只供該組比較。
        </p>
        <p>距離負荷準則：{distanceCriteria()}。未完整量化爬升、路面、補給及天氣。</p>
        <p>
          集合交通要求使用事實標籤：
          {Object.values(ratingPolicy.transportProfiles)
            .map((p) => p.label)
            .join("／")}
          。接駁不等於不方便，未按居住地推算路程，也不轉成好壞分數。
        </p>
        <p>
          時限不代表全程平均配速即可完賽，仍須符合途中截點及官方資格；比較結果不代表報名仍開放。
        </p>
        <small>
          規則版本：{ratingMethodVersion}
          。來源核對日期見各項依據；更改規則會更新版本及修改紀錄，本次沒有重新核實即時賽事資料。
        </small>
      </details>
    </section>
  );
}
