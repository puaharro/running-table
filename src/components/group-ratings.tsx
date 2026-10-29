import { groupRatings, ratingMethodVersion } from "@/lib/group-ratings";
import { formatTimestamp } from "@/lib/races";
import type { Race, RaceGroup } from "@/lib/types";

export function GroupRatings({ race, group }: { race: Race; group: RaceGroup }) {
  return (
    <section className="group-ratings" aria-label={`${group.name}組別評級`}>
      <h4>
        組別評級 <small>編輯分級 · 不設總分</small>
      </h4>
      <p>新手：時限／資格基準；體能：距離基準；交通：集合／接駁基準。</p>
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
      <details className="rating-method">
        <summary>評級準則及限制</summary>
        <p>
          屬編輯按已存官方資料作的比較，並非官方評分、跑手評價或參賽建議。資料不足顯示未評；不把未評計作零分，不合計或排序總分。
        </p>
        <p>
          新手基準：總時限換算每公里容許時間，10分鐘或以上5分、9至不足10分鐘4分、8至不足9分鐘3分、7至不足8分鐘2分、不足7分鐘1分。超過10至21.1
          km最高3分，超過21.1
          km為1分；有額外成績限制最高2分。少年或混合類別不套用通用分數。5分只代表此準則較寬鬆，仍須符合資格及訓練要求。
        </p>
        <p>
          交通基準：已知須大會接駁為3分；集合早於常規交通而須特別安排為1分。其餘未有足夠依據時不評，未設定的分數不會自行估算。交通不按居住地計路程。
        </p>
        <p>
          時限不代表全程平均配速即可完賽，途中截點、爬升、路面、補給及天氣未完整量化；請同時查看官方組別資訊。評級不代表報名仍開放。
        </p>
        <small>
          規則版本：{ratingMethodVersion}；來源核對日期見各項依據，本次沒有重新核實即時賽事資料。
        </small>
      </details>
    </section>
  );
}
