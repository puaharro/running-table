import { englishDate } from "./english-races";

const terms: Readonly<Record<string, string>> = {
  "大會活動頁及四個組別頁列12月1日23:59（香港時間）截止。即時名額仍待核實。":
    "The organiser's event page and all four category pages list a deadline of 1 December at 23:59 HKT. Current availability is unconfirmed.",
  "官方公告確認相關組別額滿。": "The official notice confirms these categories are full.",
  "官方報名表仍列相關組別為可選；名額以大會確認為準。":
    "The official entry form still lists these categories as selectable. The organiser confirms availability.",
  "官方報名表暫未列出3公里個人組，報名狀態有待確認。":
    "The official entry form currently omits the 3K individual category. Entry status is unconfirmed.",
  "官方組別表列有2公里親子組，報名表暫未見獨立選項，報名狀態待確認。":
    "The organiser lists a 2K family category. The entry form has no separate option, so its entry status is unconfirmed.",
  "重新核對選定組別的報名狀態。": "Rechecked entry status for selected categories.",
  "補登四組暫定起步時間，並重新核對半馬額滿公告及其餘組別的報名入口。":
    "Added tentative start times for the four categories and rechecked the half-marathon sold-out notice and entry options for the other categories.",
  "重新核對官方報名截止及指定平台四個場次，名額仍以大會確認為準。":
    "Rechecked the official deadline and the four waves listed on the registration platform. Confirm availability with the organiser.",
  "重新查閱官方最新消息，三個個人組維持額滿。":
    "The organiser’s latest announcements still list the three individual categories as full.",
  官方報名表: "Official entry form",
  官方賽事資料: "Official race information",
  官方最新消息: "Official news",
  "設全馬、半馬及十公里。一般、優先報名及住宿套票資料按渠道列出；設有慈善名額，詳情請查閱大會網站。":
    "Compare marathon, half marathon and 10K entries for the 2027 Standard Chartered Hong Kong Marathon, including general, priority, accommodation and charity options.",
  "2027 年 1 月 3 日於香港迪士尼樂園度假區舉行，設半馬、10K、5K 及 3K 少年賽。設有慈善名額，詳情請查閱大會網站。":
    "UNICEF HERO RUN takes place at Hong Kong Disneyland Resort on 3 January 2027, with a half marathon, 10K, 5K and 3K youth race. See the organiser for charity places.",
  上水彩園路: "Choi Yuen Road, Sheung Shui",
  啟德青年運動場: "Kai Tak Youth Sports Ground",
  地點待核實: "Venue unverified",
  "多個起點，按組別核對": "Multiple starts; see individual categories",
  大埔大美督直昇機停機坪: "Tai Mei Tuk Helipad, Tai Po",
  大埔白石角海濱長廊: "Pak Shek Kok Promenade, Tai Po",
  將軍澳運動場: "Tseung Kwan O Sports Ground",
  沙田石門: "Shek Mun, Sha Tin",
  沙田運動場: "Sha Tin Sports Ground",
  港珠澳大橋香港連接路: "Hong Kong Link Road, Hong Kong–Zhuhai–Macao Bridge",
  烏溪沙青年新村: "Wu Kai Sha Youth Village",
  香港海洋公園: "Ocean Park Hong Kong",
  香港科學園: "Hong Kong Science Park",
  香港科學園高錕會議中心: "Charles K. Kao Auditorium, Hong Kong Science Park",
  香港科學園高錕會議中心廣場: "Charles K. Kao Auditorium Plaza, Hong Kong Science Park",
  "香港科學園高錕會議中心廣場（金蛋）":
    "Charles K. Kao Auditorium Plaza (Golden Egg), Hong Kong Science Park",
  香港迪士尼樂園度假區: "Hong Kong Disneyland Resort",
  香港迪士尼樂園旅遊巴士停車場: "Hong Kong Disneyland Coach Park",
  "香港迪士尼樂園旅遊巴士停車場（起終點及集合地點）":
    "Hong Kong Disneyland Coach Park (start, finish and assembly)",
  馬鞍山: "Ma On Shan",
  "馬鞍山（確實集合位置待核實）": "Ma On Shan (exact assembly point unverified)",
  尖沙咀彌敦道: "Nathan Road, Tsim Sha Tsui",
  東區走廊: "Island Eastern Corridor",
  按組別起點: "See category start locations",
  組別起點待核實: "Category start location unverified",
  中國香港田徑總會: "Hong Kong, China Association of Athletics Affiliates",
  香港馬拉松推廣社: "Hong Kong Marathon Pro",
  香港糖尿聯會: "Diabetes Hongkong",
  聖雅各福群會: "St. James’ Settlement",
  西貢區體育會: "Sai Kung District Sports Association",
  沙田體育會有限公司: "Sha Tin Sports Association Limited",
  香港中華基督教青年會: "Chinese YMCA of Hong Kong",
  "主辦機構待核實（詳見官方網站）": "Organiser unverified; see the official website",
  "大埔體育會、運動版圖": "Tai Po Sports Association and Sportsoho",
  明愛之友: "Friends of Caritas",
  香港大塚製藥: "Otsuka Pharmaceutical (Hong Kong)",
  "運動版圖有限公司（活動統籌）": "Sportsoho Media Limited (event coordination)",
  香港聯合國兒童基金會: "Hong Kong Committee for UNICEF",
  港島: "Hong Kong Island",
  九龍: "Kowloon",
  新界: "New Territories",
  離島: "Outlying Islands",
  "多區／待核實": "Multiple regions / unverified",
  "10 公里個人組": "10K individual",
  "10 公里賽一組": "10K race, category 1",
  "10公里 GO RUN 個人賽": "10K GO RUN individual",
  "10公里": "10K",
  "10公里個人挑戰賽": "10K individual challenge",
  "10公里個人組": "10K individual",
  "10公里公開組": "10K open",
  "12.5公里個人長跑": "12.5K individual race",
  "15公里": "15K",
  "1公里個人挑戰賽": "1K individual challenge",
  "1公里小英雄跑（家庭3人）": "1K Little Hero Run (family of three)",
  "1公里親子組": "1K parent and child",
  "21公里": "21K",
  "2公里": "2K",
  "2公里親子二人賽": "2K parent-and-child pairs",
  "2公里親子歡樂跑": "2K family fun run",
  "2公里親子競賽組": "2K parent-and-child race",
  "2公里親子組": "2K parent and child",
  "3 公里個人組": "3K individual",
  "3 公里少年賽": "3K youth race",
  "3公里 GO RUN 個人賽": "3K GO RUN individual",
  "3公里個人挑戰賽": "3K individual challenge",
  "3公里個人組": "3K individual",
  "3公里個人跑": "3K individual run",
  "3公里活力跑（個人組）": "3K fun run (individual)",
  "4公里體驗跑（個人）": "4K fun run (individual)",
  "4公里體驗跑（家庭3人）": "4K fun run (family of three)",
  "5 公里個人組": "5K individual",
  "5 公里賽": "5K race",
  "5公里 GO RUN 個人賽": "5K GO RUN individual",
  "5公里": "5K",
  "5公里個人挑戰賽": "5K individual challenge",
  "5公里個人計時賽": "5K individual timed race",
  "5公里公開體驗組": "5K open fun run",
  "8公里個人賽": "8K individual race",
  全程馬拉松: "Marathon",
  全馬: "Marathon",
  十公里: "10K",
  半程馬拉松: "Half marathon",
  半程馬拉松個人組: "Half marathon individual",
  半馬: "Half marathon",
  半馬拉松: "Half marathon",
  "約 2 公里少年組": "Youth run (approx. 2 km)",
  "約 5 公里": "Approx. 5 km",
  一般報名: "General entry",
  "一般報名（個人報名）": "General entry (individual)",
  "一般報名（先到先得）": "General entry (first come, first served)",
  "一般報名（公眾抽籤）": "General entry (public ballot)",
  住宿連名額: "Accommodation with entry",
  住宿連名額套票: "Accommodation and entry package",
  優先報名: "Priority entry",
  慈善報名: "Charity entry",
  "慈善報名（APF愛培自閉症基金・個人）":
    "Charity entry (Autism Partnership Foundation, individual)",
  "慈善報名（APF愛培自閉症基金・公司／團體）":
    "Charity entry (Autism Partnership Foundation, corporate/group)",
  "慈善報名（個人）": "Charity entry (individual)",
  "慈善報名（啟勵扶青會）": "Charity entry (KELY Support Group)",
  "慈善報名（婦女動力基金）": "Charity entry (HER Fund)",
  "慈善報名（樂餉社）": "Charity entry (Feeding Hong Kong)",
  "慈善報名（籽識慈善基金・學校代表）":
    "Charity entry (La Violet Charity Foundation, school representatives)",
  "慈善報名（籽識慈善基金）": "Charity entry (La Violet Charity Foundation)",
  "慈善報名（維護家庭基金）": "Charity entry (Family Value Foundation)",
  "慈善報名（義務工作發展局）": "Charity entry (Agency for Volunteer Service)",
  "慈善報名（關注婦女性暴力協會）":
    "Charity entry (Association Concerning Sexual Violence Against Women)",
  "慈善報名（香港乳癌基金會）": "Charity entry (Hong Kong Breast Cancer Foundation)",
  公眾抽籤: "Public ballot",
  最低籌款額: "Minimum fundraising amount",
  以官方本屆安排為準: "See the organiser’s current arrangements",
  "按官方網上報名安排；名額待確認": "Online entry via the organiser; availability unverified",
  個人報名: "Individual entry",
  先到先得: "First come, first served",
  先到先得套票登記: "Packages available on a first-come, first-served basis",
  達標資格審核: "Eligibility subject to qualifying standards",
  機構審核及籌款: "Charity review and fundraising",
  學校申請及機構審核: "School application and charity review",
  賽事取消: "Race cancelled",
  賽事延期: "Race postponed",
  賽事延期公告: "Race postponed",
  賽事取消公告: "Race cancelled",
  賽事地點變更: "Venue change",
  已完成: "Completed",
  部分渠道接受申請: "Some entry options are open",
  所列渠道接受申請: "Listed entry options are open",
  公眾抽籤已截止: "Public ballot closed",
  所列渠道已截止: "Listed entry options are closed",
  接受申請: "Accepting entries",
  未開放: "Not yet open",
  候補: "Waiting list",
  額滿: "Full",
  已截止: "Closed",
  待核實: "Unverified",
  開始報名: "Entries open",
  報名截止: "Entry deadline",
  公布結果: "Results announcement",
  繳費截止: "Payment deadline",
  免費: "Free",
  時限待核實: "Time limit unverified",
  "不足 1 分鐘截止": "Closes in under 1 minute",
  "交通及集合安排待核實，請參閱大會最新選手資料。":
    "Transport and assembly arrangements are unverified. Check the organiser’s latest runner information.",
  "日期及所列距離按本屆官方來源整理。":
    "The date and listed distances come from official sources for this edition.",
  "未核實的名額、資格及安排保留待核實，付款前請向大會確認。":
    "Confirm availability, eligibility and arrangements with the organiser before paying.",
  "只核對列明欄位；活動地點不等於組別起點。未知不借用往屆資料。":
    "Verification covers only the listed fields. The event venue may differ from individual category starts. Unverified details are not inferred from past editions.",
  "按本屆官方資料新增；未核實欄位及即時報名餘額保持待核實。":
    "Added using official information for this edition. Unverified details and live availability remain unconfirmed.",
  查看官方網站: "Official website",
  "交通及集合安排待核實，請參閱本屆官方選手資料。":
    "Transport and assembly arrangements are unverified. See the official runner information for this edition.",
  "官方指定於亞洲國際博覽館集合，再乘大會專車前往起跑區。各組集合截止時間不同，請按官方賽事資訊核對。":
    "Assemble at AsiaWorld-Expo and take the organiser’s shuttle to the start area. Check the official reporting deadline for your category.",
  "官方列明場地為科學園金蛋廣場。個別組別出發及集合安排，請按大會選手資訊核對。":
    "The official venue is Golden Egg Plaza at Hong Kong Science Park. Check the organiser’s runner information for assembly and start arrangements by category.",
  "官方FAQ確認起終點及集合地點為香港迪士尼樂園旅遊巴士停車場；半馬集合上午 4:45–5:15，10K 一組上午 6:35–7:10。各組起終點均在此停車場，現場請依工作人員指示前往起跑區。官方列明東涌綫首班由香港站上午 5:15、東涌站上午 5:28 開出，迪士尼綫由欣澳站上午 5:40 開出；半馬跑手須另查特別巴士，勿依賴上述列車趕赴半馬集合。車務以當日官方安排為準。":
    "The official FAQ identifies Hong Kong Disneyland Coach Park as the start, finish and assembly area. Half marathon assembly is 4:45–5:15 am and 10K category 1 assembly is 6:35–7:10 am. Follow staff directions at the venue. The listed first Tung Chung Line trains leave Hong Kong Station at 5:15 am and Tung Chung Station at 5:28 am. The first Disneyland Resort Line train leaves Sunny Bay at 5:40 am. Half marathon runners should check special bus arrangements; these trains are too late for assembly. Confirm services for race day.",
  "起點為啟德青年運動場，終點設於啟德海濱。起終點不同，請按官方通知安排集合及離場。":
    "The race starts at Kai Tak Youth Sports Ground and finishes at Kai Tak Harbourfront. Check the official notices for assembly and departure arrangements.",
  "起終點均為啟德青年運動場；集合及領包安排請依官方通知核對。":
    "The start and finish are at Kai Tak Youth Sports Ground. Check the official notice for assembly and race pack collection.",
  "全馬及半馬由尖沙咀彌敦道起跑，10K 由港島東區走廊起跑；三項終點均為維多利亞公園。各組起跑時間及交通管制請按官方選手資料核對。":
    "The marathon and half marathon start on Nathan Road in Tsim Sha Tsui. The 10K starts on the Island Eastern Corridor. All three finish in Victoria Park. See the official runner information for start times and road closures.",
  "半馬時限 3 小時，十公里時限 1 小時 30 分鐘。":
    "The half marathon time limit is 3 hours. The 10K limit is 1 hour 30 minutes.",
  "公眾抽籤於 7 月 2 日中午截止；其他渠道請另查大會。":
    "The public ballot closed at noon on 2 July. Check with the organiser for other entry options.",
  "起終點與集合地點不同，須預留指定接駁及檢查時間。":
    "The assembly area is separate from the course. Allow time for the designated shuttle and security checks.",
  "官方 6 月 24 日消息指所有組別額滿。":
    "The organiser’s 24 June update said all categories were full.",
  "起步時間屬暫定安排，須按大會分配組別出發。":
    "Start times are provisional. Start in the wave assigned by the organiser.",
  "部分隊際盃以已成功報名個人組為前提，並不表示另有個人名額。":
    "Some team cups require an existing individual entry. They do not provide additional individual places.",
  "官方列出 2026 年 11 月 15 日截止報名，未列精確截止時刻。":
    "The official deadline was 15 November 2026. No exact time was listed.",
  "所列款項為最低籌款額，並非一般賽事報名費。":
    "The listed amounts are minimum fundraising requirements.",
  "半馬未見於公開個人報名選單；不能單憑選項缺席推斷已額滿。":
    "The public individual entry form did not list the half marathon. Its availability is unconfirmed.",
  "一般公眾抽籤已於 10 月 26 日中午截止；輪椅渠道另有期限。":
    "The public ballot closed at noon on 26 October. Wheelchair entry has a separate deadline.",
  "家庭抽籤參加者年齡要求與個人抽籤不同。":
    "The family ballot has different age requirements from the individual ballot.",
  "全程時限 60 分鐘；以官方分配時段出發。":
    "The time limit is 60 minutes. Follow your assigned start time.",
  "報名於 11 月 27 日晚上 11:59 截止，額滿可提早結束。":
    "Entry closes at 11:59 pm on 27 November, or earlier if full.",
  "年齡按出生年份計，不宜直接套用成人組別要求。":
    "Check the youth category’s own birth-year requirements.",
  "全程時限 30 分鐘，按獲分配場次起跑。":
    "The time limit is 30 minutes. Follow your assigned start time.",
  "全馬及半馬起點均在尖沙咀彌敦道，10K 起點在港島東區走廊。":
    "The marathon and half marathon start on Nathan Road in Tsim Sha Tsui. The 10K starts on the Island Eastern Corridor.",
  "本地費用：全馬 HK$600、半馬 HK$520、10K HK$420；非本地另計。":
    "Local entry fees are HK$600 for the marathon, HK$520 for the half marathon and HK$420 for the 10K. Non-local rates differ.",
  "慈善最低籌款額按機構獨立列出；機構招募截止與11月6日大會跑手登記期限分開。":
    "Each charity sets its own fundraising minimum and recruitment deadline. The organiser’s runner registration deadline was 6 November.",
  "官方新聞稿列公眾報名於2026年9月27日截止；未有精確截止時刻。":
    "The official release listed 27 September 2026 as the public entry deadline, without an exact time.",
  "只收錄本頁列明的實體跑步組別。":
    "This listing covers the in-person running categories shown here.",
  "費用按個人或家庭單位區分，付款前請核對名額及最新安排。":
    "Fees are per individual or per family as specified. Confirm availability and current terms before paying.",
  "設半馬及十公里，兩組時限及集合時間不同。頁內報名狀態對應公眾抽籤，不代表其他特別渠道；參賽者需按大會指示到亞博集合。":
    "The half marathon and 10K have separate time limits and assembly times. The entry status shown here covers the public ballot. Assemble at AsiaWorld-Expo as instructed by the organiser.",
  "設 3K、5K、10K 個人組，可按距離及年齡組別比較。官方最新消息已公告所有組別額滿，不宜只按活動簡介原有「額滿即止」字眼判斷仍可報名。":
    "Individual 3K, 5K and 10K races are offered across age categories. The organiser announced that all categories are full.",
  "2027 年 1 月 3 日於香港迪士尼樂園度假區舉行，設半馬、10K、5K 及 3K 少年賽。所列金額為最低籌款額；目前公開個人報名選單可選 10K 一組、5K 及 3K，半馬報名狀態仍待確認。":
    "The event takes place at Hong Kong Disneyland Resort on 3 January 2027, with a half marathon, 10K, 5K and 3K youth race. The listed amounts are minimum fundraising requirements. The public individual entry menu lists 10K category 1, 5K and 3K. Half marathon availability is unconfirmed.",
  "於主賽事前一日舉行的約 5 公里非競賽活動。個人及家庭公眾抽籤已截止；第一輪10月29日下午2時公布結果，不代表重新開放申請。輪椅渠道另按官方安排。":
    "This non-competitive run of approximately 5 km takes place the day before the main marathon. The individual and family ballots have closed. First-round results were due at 2 pm on 29 October. Please check the separate wheelchair entry arrangements.",
  "約 2 公里少年路跑，按 2027 出生年份計須為 10 至 15 歲。報名採先到先得，官方保留額滿時提早截止的安排。":
    "The youth road race covers approximately 2 km and is open to those aged 10 to 15 by birth year in 2027. Entries are first come, first served and may close early if full.",
  "設全馬、半馬及十公里。一般及優先申請已截止；住宿套票登記及付款已於11月6日23:59截止。慈善名額詳情請查閱大會網站。":
    "The event offers a marathon, half marathon and 10K. General and priority entries have closed. Accommodation package registration and payment closed at 23:59 on 6 November. See the organiser’s website for charity places.",
  "田總官方2026賽期表列明11月8日及15公里賽；主辦網站暫未能讀取，費用、起點、資格及報名渠道詳情待核實。":
    "The athletics association’s 2026 calendar lists this 15K for 8 November. The organiser’s website could not be accessed. Fees, the start location, eligibility and entry options remain unverified.",
  "收錄10／5／3公里個人路跑；另有隊際及1公里障礙活動，本頁未收錄其費用。所列為正價，早鳥優惠不代表目前仍適用。":
    "This listing covers the individual 10K, 5K and 3K road races. Team and 1 km obstacle events have separate fees. The listed prices are standard rates; early-bird prices may have expired.",
  "主辦新聞稿列明8公里個人／隊制及2公里親子賽，10月21日截止。本頁先列個人及親子組。":
    "The organiser’s release lists an 8K individual and team race and a 2K family race, with entries closing on 21 October. This listing covers the individual and family categories.",
  "兩日各有不同項目；所列為正價，不含樂園門票。競賽／歡樂批次、年齡及名額須按大會最新資料核對。":
    "Events vary across the two days. The listed standard prices exclude park admission. Check the latest official details for competitive and fun-run waves, age requirements and availability.",
  "田總官方時間表連結此報名表。路線為石門至馬鞍山公園折返；截止只有日期，未代填時刻或聲稱即時有位。":
    "The athletics association’s calendar links to the entry form. The course is an out-and-back from Shek Mun to Ma On Shan Park. A deadline date was listed without an exact time or confirmation of remaining places.",
  "官方顯示報名名額已滿。費用按年齡及田總註冊身份不同，不能以單一金額概括。":
    "The organiser lists the race as full. Fees vary by age and athletics association registration status.",
  "官方列出12月20日沙田運動場21／10／3公里個人賽；指定平台列三個個人組額滿，官方報名期限10月31日23:59亦已過。家庭及手錶優惠不混作個人一般報名渠道。":
    "The organiser lists individual 21K, 10K and 3K races at Sha Tin Sports Ground on 20 December. All three categories were listed as full on the designated entry platform, and the deadline of 23:59 on 31 October has passed. Family and watch offers are separate from general individual entry.",
  "大會11月9日公告半馬額滿；10公里、3公里及1公里親子組仍列於報名表。暫定起步：半馬07:30、10公里07:50、3公里08:00、1公里親子組09:30（香港時間）。隊際盃登記不等於個人賽報名，實際名額以大會確認為準。":
    "The organiser announced on 9 November that the half marathon was full. The entry form still listed the 10K, 3K and 1K family run. Tentative starts (Hong Kong time): half marathon 07:30, 10K 07:50, 3K 08:00 and 1K family run 09:30. Team cup registration is separate from individual entry. Confirm availability with the organiser.",
  "官網顯示公開組名額暫滿，預告11月10日再公布安排。沒有因此自動標示候補或重新開放；報名費與籌款要求須分開確認。":
    "The official site listed the open categories as full and scheduled a further announcement for 10 November. Reopening and a waiting list were unconfirmed. Check the entry fee and fundraising requirement separately.",
  "先收錄10公里及3公里個人路跑；親子接力、寵物行及隊際組不混作個人路跑費用。官方起跑時間暫定，相關組別仍列於報名表，實際名額以大會確認為準。":
    "This listing covers the individual 10K and 3K road races. Family relays, the pet walk and team events have separate fees. Official start times are tentative, and the entry form listing does not confirm availability.",
  "2027首頁列明日期、集合地點及四個距離。詳情頁仍有2026出生年份及往屆內容，故不沿用其費用、起跑時間或資格。":
    "The 2027 home page confirms the date, assembly point and four distances. The details page still contains 2026 birth-year criteria and past-edition content, so the current fees, start times and eligibility need verification.",
  "官方列明12月27日於將軍澳運動場舉行。10／5公里按年齡及身份收費，不以單一金額概括；親子競賽及歡樂跑分列，報名表仍列相關組別，實際名額以大會確認為準。":
    "The organiser lists the race for 27 December at Tseung Kwan O Sports Ground. The 10K and 5K fees vary by age and eligibility. The competitive and fun family races are separate categories. Confirm availability with the organiser.",
  "名稱雖為「跨越2026」，官方固定路線比賽日為2027年1月1日。一般報名額滿即止；早鳥減價已過，不套用。確實集合位置、即時名額及部分中英文條款差異仍須向大會確認。":
    "Although the title refers to Crossing 2026, the official fixed-course race takes place on 1 January 2027. General entry closes when full and the early-bird offer has ended. Confirm the exact assembly point, availability and any differences between the Chinese and English terms with the organiser.",
  "本頁收錄12月20日12.5公里個人實體跑。另設4×1.25公里及2×625米親子接力，未混入個人距離篩選；125公里虛擬跑及12月19–20日市集不當作比賽組別。起步時間暫定，相關組別仍列於報名表，實際名額以大會確認為準。":
    "This listing covers the 12.5K individual race on 20 December. The 4 × 1.25 km relay, 2 × 625 m family relay, 125 km virtual run and 19–20 December market are listed separately by the organiser. Start times are tentative and availability should be confirmed.",
  "活動參賽頁分列跑步及定向健步行；本頁只收錄5K計時、4K體驗及1K家庭跑，不收錄定向行。只有5K計時；園內有上落斜，路線圖尚待公布，地面及詳細路線待核實。分時段起步，不以準備時間代替個別起跑時間。":
    "This listing covers the timed 5K, 4K fun run and 1K family run. The orienteering walk is a separate event. The park has climbs and descents. The course map, surface and detailed route are unconfirmed. Starts are staggered; assembly times and start times differ.",
  賽道體驗: "Course experience",
  賽道: "Course",
  補給: "Aid stations",
  寄存: "Bag drop",
  交通: "Transport",
  大會安排: "Event organisation",
  大會執行: "Event organisation",
  補給體驗: "Aid stations",
  "NXTGO 編輯": "NXTGO editorial team",
  港珠澳大橋半馬拉松: "Hong Kong–Zhuhai–Macao Bridge Half Marathon",
  渣打香港馬拉松: "Standard Chartered Hong Kong Marathon",
  "起步擠塞、超車空間、折返、路面、指示、景觀及後段節奏，有哪些具體感受？":
    "What did you experience at the start, while overtaking and at turnarounds? Consider surfaces, signs, scenery and pacing late in the race.",
  "多處嚴重擠塞或指示／路面問題，明顯妨礙完成賽程。":
    "Severe congestion or issues with signage or surfaces at multiple points significantly hindered finishing.",
  "多個路段不順暢，超車、折返或指示有明顯改善需要。":
    "Several sections were difficult to navigate. Overtaking, turnarounds or signage need clear improvement.",
  "整體可順暢完成，但部分路段或設計影響體驗。":
    "The course was generally manageable, with some sections or design choices affecting the experience.",
  "大部分路段順暢、指示清楚，有值得再跑的特色。":
    "Most sections flowed smoothly, signage was clear and the course had features worth returning for.",
  "在所觀察路段及時段，流動、指示及路線特色均表現出色，並有具體紀錄支持。":
    "Flow, signage and course features were excellent where and when observed, backed by specific records.",
  "領物、寄存、廁所、起跑分流、工作人員、突發處理及離場，哪些環節順暢？哪些環節有待改善？":
    "What worked well at pack collection, bag drop, toilets, start waves and exit? Consider staffing and handling of unexpected issues.",
  "關鍵流程嚴重失效或支援不足，明顯影響參賽。":
    "Major failures in essential processes or support significantly affected participation.",
  "多個流程混亂、久候或指引不足，需大幅改善。":
    "Several processes were confusing, slow or poorly signposted and need substantial improvement.",
  "基本流程到位，仍有排隊、分流或溝通問題。":
    "Core processes worked, with some issues in queues, crowd routing or communication.",
  "主要流程順暢，指引及支援清楚，少量細節可改善。":
    "Key processes ran smoothly and guidance was clear, with a few details to improve.",
  "所觀察的賽前、賽中及賽後流程均有效率，問題處理有具體良好紀錄。":
    "The observed processes before, during and after the race were efficient, with documented examples of effective issue handling.",
  "補給位置、取用動線、飲品／食物、排隊及抵達時的剩餘供應量，實際情況如何？":
    "Consider aid station locations, access, drink and food options, queues and what was available when you arrived.",
  "主要補給嚴重不足或無法取用，有具體影響紀錄。":
    "Essential supplies were severely limited or inaccessible, with a documented impact.",
  "多站供應或取用不穩定，需明顯改善。":
    "Supply or access was inconsistent at several stations and needs clear improvement.",
  "基本供應到位，但位置、取用或選擇有改善空間。":
    "Basic supplies were available, with room to improve location, access or choice.",
  "供應配合賽程，取用大致順暢，只有少量不足。":
    "Supplies suited the race and were generally easy to access, with only minor shortcomings.",
  "供應、位置及取用均出色，並有後段跑手到站時仍穩定供應的紀錄。":
    "Supply, location and access were excellent, with evidence that supplies remained available for runners towards the back.",
  欠佳: "Poor",
  待改善: "Needs improvement",
  合格: "Adequate",
  出色: "Very good",
  卓越: "Excellent",
  前段: "Front",
  中段: "Midfield",
  後段: "Back",
  未記錄: "Unrecorded",
  未評: "Unrated",
  未評分: "Unrated",
  評級更正: "Rating correction",
  評級投訴: "Rating complaint",
  大會回應: "Organiser response",
  核對當屆官方入口同組別資格: "Check the official entry link and category eligibility",
  記低報名截止日同付款期限: "Record entry and payment deadlines",
  核對總收費同退款條款: "Check the total fee and refund terms",
  核對選手包領取同集合安排: "Check pack collection and assembly instructions",
  "已讀取此裝置草稿。": "Loaded the draft on this device.",
  "未能讀取此裝置草稿。原有內容未被覆蓋；可匯出目前筆記，或匯入備份繼續。":
    "The saved draft could not be read. Existing data was preserved. Export your current notes or import a backup.",
  "有未儲存修改。": "There are unsaved changes.",
  "已儲存至此裝置；未發布。建議另行匯出備份。":
    "Saved privately on this device. Export a backup to keep a separate copy.",
  "未能儲存，請匯出筆記備份。": "Saving failed. Export a backup to keep your notes.",
  "已產生筆記下載；請確認檔案已儲存。草稿不會自動發布。":
    "Your notes are ready to download. Check that the file saved. Drafts are private.",
  "請確認年份為四位數，再匯出筆記。": "Enter a four-digit year before exporting.",
  "未能匯出待確認筆記。": "Could not export notes for review.",
  "已匯入為新增草稿，原有筆記保留；請儲存或匯出。":
    "Imported as a new draft. Existing notes were preserved. Save or export your changes.",
  "未能匯入：請選擇有效的 NXTGO 筆記備份。現有筆記保留。":
    "Import failed. Choose a valid NXTGO backup. Existing notes were preserved.",
  "已新增草稿，每個年份獨立記錄。": "Draft added. Each edition has its own notes.",
  "請輸入有效的日期。": "Enter a valid date.",
  "距離請輸入 0 至 1000 公里。": "Enter a distance from 0 to 1000 km.",
  "開始日期不得晚於結束日期。": "The start date must be on or before the end date.",
  "最短距離不得大於最長距離。": "The minimum distance must be at or below the maximum.",
  困難: "Difficult",
  適中: "Moderate",
  容易: "Easy",
  每位: "per person",
  "每位／一晚": "per person / one night",
  啟德: "Kai Tak",
  地區待核實: "District unverified",
  大嶼山: "Lantau Island",
  "沙田／科學園": "Sha Tin / Science Park",
  起點變更: "Start location change",
  期限待核實: "Deadline unverified",
  本屆官方賽事資料: "Official race information for this edition",
  本屆賽事及參賽資料: "Race and entry information for this edition",
  "官方指定報名平台：現有登記渠道": "Designated entry platform: current registration option",
  了解審閱流程: "View the editorial process",
  待確認: "Pending approval",
  已確認發布: "Approved for publication",
  "1 小時 30 分鐘；活動日須年滿 16 歲，一組要求最佳成績多於 1 小時 10 分 01 秒，詳見官方。":
    "1 hour 30 minutes. Runners must be at least 16 on race day. Category 1 requires a best time slower than 1:10:01; see the official terms.",
  "1小時30分鐘": "1 hour 30 minutes",
  "2 小時 45 分鐘；須於活動日年滿 16 歲。":
    "2 hours 45 minutes. Runners must be at least 16 on race day.",
  "2 小時；2027 年按出生年份計須年滿 16 歲。": "2 hours. Age 16 or older by birth year in 2027.",
  "20分鐘": "20 minutes",
  "30 分鐘；2027 年按出生年份計 10–15 歲。": "30 minutes. Ages 10–15 by birth year in 2027.",
  "35 分鐘；活動日年齡為 11–15 歲。": "35 minutes. Ages 11–15 on race day.",
  "3小時": "3 hours",
  "45 分鐘；須於活動日年滿 16 歲。": "45 minutes. Runners must be at least 16 on race day.",
  "5小時30分鐘": "5 hours 30 minutes",
  "6 小時；2027 年按出生年份計須年滿 20 歲，參賽成績資格及途中截點見官方。":
    "6 hours. Age 20 or older by birth year in 2027. See official qualifying standards and intermediate cut-offs.",
  "60 分鐘；個人抽籤16歲或以上，家庭隊長18歲或以上、隊員6–15歲（均按2027年出生年份計）。":
    "60 minutes. Individual ballot: ages 16 and over. Family captain: age 18 or over; team members: ages 6–15. Ages are by birth year in 2027.",
  "全程 1 小時 30 分鐘；2026 年按出生年份計須年滿 16 歲，途中截點見官方。":
    "1 hour 30 minutes. Age 16 or older by birth year in 2026. See the official intermediate cut-offs.",
  "全程 3 小時；2026 年按出生年份計須年滿 16 歲，途中截點見官方。":
    "3 hours. Age 16 or older by birth year in 2026. See the official intermediate cut-offs.",
  "年齡組別及時間按官方分配。": "The organiser assigns age categories and times.",
  "按出生年份分組，詳見官方活動簡介。":
    "Categories are based on birth year. See the official event information.",
  "挑戰組 2 小時 15 分鐘，非挑戰組 3 小時；2027 年按出生年份計須年滿 16 歲。":
    "2 hours 15 minutes in the Challenge category and 3 hours elsewhere. Age 16 or older by birth year in 2027.",
  "比賽時限2小時30分鐘。": "2 hours 30 minutes.",
  "組別及起步時間見大會安排。": "See the organiser’s category and start-time arrangements.",
  "2013年或以前出生，按出生年份計算。":
    "Born in 2013 or earlier. Eligibility is based on birth year.",
  "三人家庭須含一位18–70歲成人及一位11歲或以下小童，其餘成員3–70歲；詳見條款。":
    "A family of three must include one adult aged 18–70 and one child aged 11 or under. Other members must be aged 3–70. See the terms.",
  "個人抽籤：2027年按出生年份計須年滿16歲；家庭抽籤：2–4人，包括至少一名18歲或以上隊長及一名6–15歲隊員。":
    "Individual ballot: age 16 or older by birth year in 2027. Family ballot: 2–4 members, including a captain aged 18 or over and at least one member aged 6–15.",
  "分挑戰組及1／2／3組；挑戰組按提交成績篩選，達標不保證入圍。":
    "Challenge and categories 1, 2 and 3. Challenge places are selected using submitted times. Meeting the standard does not guarantee a place.",
  "參賽資格及年齡限制待核實，請向大會確認。":
    "Eligibility and age limits are unverified. Confirm with the organiser.",
  "只適用全馬；本地套票須持香港身份證、本地電話及通訊地址，符合全馬年齡及成績要求；房間與名額須經大會確認。":
    "Marathon only. Local packages require a Hong Kong ID, local phone number and postal address, as well as meeting the marathon age and performance criteria. The organiser must confirm rooms and entries.",
  "只適用所選距離挑戰組；須以2025年1月1日至2026年8月31日獲認可賽事成績達標，並通過大會審核。":
    "Challenge category of the selected distance only. Applicants must meet the standard at an approved race between 1 January 2025 and 31 August 2026 and pass the organiser’s review.",
  "只限2–3人公司／團體隊伍，非挑戰組；每位須符合10K參賽資格及各自籌款要求。":
    "For corporate or group teams of 2–3 in non-Challenge categories. Each runner must meet the 10K eligibility and their own fundraising requirements.",
  "只限學校安排符合大會參賽資格的學生、老師、家長、校友或校園社群代表；每校1–10位。":
    "For eligible students, teachers, parents, alumni or school community representatives nominated by their school. One to ten places per school.",
  "家長及4–12歲兒童；詳見官方。": "A parent and child aged 4–12. See the official requirements.",
  "按出生日期及田總註冊身份分組，請查官方資格表。":
    "Categories depend on date of birth and athletics association registration status. See the official eligibility table.",
  "按大會本屆組別及出生年份表核對，未核實細節不代填。":
    "See the organiser’s current category and birth-year table. Other details are unverified.",
  "活動當天12–70歲；18歲以下須獲家長／監護人同意。":
    "Ages 12–70 on event day. Entrants under 18 need parent or guardian consent.",
  "活動當天16–70歲；18歲以下須獲家長／監護人同意。":
    "Ages 16–70 on event day. Entrants under 18 need parent or guardian consent.",
  "非挑戰組，須符合該距離大會參賽資格；機構已公告所有名額額滿。":
    "Non-Challenge category only. Meet the organiser’s eligibility for the distance. The charity announced that all places are full.",
  "須符合大會此距離參賽資格及機構最低捐款要求，經機構確認名額；遞交意向不等於已獲名額。":
    "Meet the organiser’s criteria and the charity’s minimum donation. A place is subject to charity confirmation.",
  "須符合大會此距離參賽資格及機構最低捐款／籌款要求，經機構審核確認，遞交意向不等於獲名額。":
    "Meet the organiser’s criteria and the charity’s minimum donation or fundraising requirement. The charity reviews and confirms places.",
  "須符合大會此距離參賽資格及機構最低籌款要求；較高籌款承諾獲優先考慮，遞交申請不等於獲名額。":
    "Meet the organiser’s criteria and the charity’s minimum fundraising requirement. Higher pledges are prioritised. The charity confirms places after application.",
  "須符合此組別年齡及參賽資格，詳見官方。":
    "Meet the age and eligibility criteria for this category. See the official details.",
  "須符合組別年齡／成績要求及最低籌款額；名額以官方確認為準。":
    "Meet the category’s age and performance requirements and the fundraising minimum. The organiser confirms places.",
  "官方只列每位籌款目標HK$10,000或以上；未確認統一最低捐款或報名費，不能把目標填作最低額。":
    "The organiser lists a fundraising target of HK$10,000 or more per person. A standard minimum donation or entry fee has not been confirmed.",
  "官方最低籌款額，並非一般報名費；額外捐款及籌款安排以官方為準。":
    "This is the official minimum fundraising amount. See the official terms for additional donations and fundraising arrangements.",
  "官方該距離本地參賽費；非本地 USD 70，優先申請已截止。":
    "Official local rate for this distance. Non-local entry is US$70. Priority applications have closed.",
  "官方該距離本地參賽費；非本地 USD 85，優先申請已截止。":
    "Official local rate for this distance. Non-local entry is US$85. Priority applications have closed.",
  "官方該距離本地參賽費；非本地 USD 90，優先申請已截止。":
    "Official local rate for this distance. Non-local entry is US$90. Priority applications have closed.",
  "所列為已核對組別費用；優惠、其他組別及額外費用請另查官方。":
    "The listed category fee has been verified. Check official details for discounts, other categories and additional fees.",
  "所列為正價；優惠及附加項目另計。": "Standard fee. Discounts and add-ons are separate.",
  "按年齡及田總註冊身份分HK$150／200／300／350，沒有統一費用。":
    "HK$150, HK$200, HK$300 or HK$350 depending on age and athletics association registration status.",
  "按年齡及身份收費，詳見官方。": "Fees depend on age and category. See the organiser’s terms.",
  "最低籌款以外另付HK$100留位費，不計入最低籌款、不退款，亦無捐款退稅收據。":
    "A separate HK$100 reservation fee is non-refundable, excluded from minimum fundraising and does not qualify for a donation tax receipt.",
  "本地參賽者套票；非本地 HK$3,044。包括一個全馬名額、2027-01-16 一晚單人住宿及晚餐；額外同房人士費用不包含名額。":
    "Local participant package. The non-local rate is HK$3,044. Includes one marathon place, one night of single accommodation on 16 January 2027 and dinner. An extra room guest does not receive a race place.",
  "本地參賽者費用；官方列明包含指定接駁。":
    "Local participant fee. The organiser lists the designated shuttle as included.",
  "本地參賽者費用；非本地另計。": "Local participant fee. Rates for non-local participants differ.",
  "此為此機構此渠道最低捐款／籌款要求；不是一般報名費，亦不適用其他機構。":
    "Minimum donation or fundraising for this charity and entry option only.",
  "此為此機構此渠道最低捐款／籌款要求；不是一般報名費，亦不適用其他機構。另列籌款目標（非最低額）為HK$10000，以較高籌款目標優先。":
    "Minimum donation or fundraising for this option only. Separately, HK$10,000 is a fundraising target. Higher pledges are prioritised.",
  "此為此機構此渠道最低捐款／籌款要求；不是一般報名費，亦不適用其他機構。另列籌款目標（非最低額）為HK$6000，以較高籌款目標優先。":
    "Minimum donation or fundraising for this option only. Separately, HK$6,000 is a fundraising target. Higher pledges are prioritised.",
  "此為此機構此渠道最低捐款／籌款要求；不是一般報名費，亦不適用其他機構。另列籌款目標（非最低額）為HK$8000，以較高籌款目標優先。":
    "Minimum donation or fundraising for this option only. Separately, HK$8,000 is a fundraising target. Higher pledges are prioritised.",
  "此為此機構此渠道的最低捐款要求，不適用其他機構。":
    "Minimum donation for this charity and entry option only.",
  "此為該機構個人慈善跑手最低捐款／籌款額，非一般報名費；不適用其他機構。":
    "Minimum donation or fundraising for individual charity runners through this charity only.",
  "每人標準價HK$798；早鳥HK$698至11月22日23:59。非計時體驗跑。":
    "Standard HK$798 per person. Early-bird HK$698 until 23:59 on 22 November. This fun run is untimed.",
  "每人標準價HK$798；早鳥HK$698至11月22日香港時間23:59，包活動當日參加者本人入園。":
    "Standard HK$798 per person. Early-bird HK$698 until 23:59 HKT on 22 November. Includes park admission for the entrant on event day.",
  "每人正價HK$320；早鳥已過，會友／義工專屬優惠不當作一般費用。":
    "Standard HK$320 per person. Early-bird pricing has ended. Member and volunteer offers are separate.",
  "每位最低捐款HK$2,500。表格另列的HK$10,000／15,000／20,000是自行承諾籌款目標；HK$400,000是整體計劃目標。":
    "Minimum donation of HK$2,500 per person. The form lists voluntary fundraising pledges of HK$10,000, HK$15,000 or HK$20,000. HK$400,000 is the overall campaign target.",
  "每位最低籌款HK$4,000，另付每位HK$100留位費；金額不是整隊合計。留位費不計最低籌款、不退款及無捐款退稅收據。":
    "Minimum fundraising of HK$4,000 per person plus a HK$100 reservation fee per person. The fee is non-refundable, excluded from fundraising and does not qualify for a donation tax receipt.",
  "每位費用，並非每對親子費用。": "Fee per person.",
  "每個三人家庭標準價HK$1,950；早鳥HK$1,800至11月22日23:59。不是每人費用。":
    "Standard HK$1,950 for a family of three. Early-bird HK$1,800 until 23:59 on 22 November.",
  "每個三人家庭標準價HK$1,950；早鳥HK$1,800至11月22日23:59，第四名家庭成員可按官方條款另加HK$600。":
    "Standard HK$1,950 for a family of three. Early-bird HK$1,800 until 23:59 on 22 November. A fourth member can be added for HK$600 under the official terms.",
  "每對親子二人費用；不是每人費用。": "Fee per parent-and-child pair.",
  "每組親子報名費；成員資格請核對大會本屆組別表。":
    "Fee per family team. Check the organiser’s current category table for eligibility.",
  "親子組費用；隊伍人數及適用資格請查官方。":
    "Family category fee. Check the official team size and eligibility requirements.",
  "費用／最低籌款額待核實。": "Fee or minimum fundraising amount unverified.",
  "參賽資格及集合安排請參閱大會最新資料。":
    "Check the organiser’s latest information for eligibility and assembly arrangements.",
  "先到先得，額滿即止": "First come, first served until full",
  "即時報名名額待核實。": "Current entry availability is unconfirmed.",
  "一般報名（公開組）": "General entry (open category)",
  "一般報名（學生組）": "General entry (student category)",
  "領取號碼布時須出示有效香港全日制學生證。":
    "Show a valid Hong Kong full-time student ID when collecting your bib.",
  沙田: "Sha Tin",
  香港青少年發展聯會: "Hong Kong Association of Youth Development",
  "香港科學園設10公里及5公里個人賽，公開組及學生組分開收費。2公里主席盾為邀請賽。":
    "Hong Kong Science Park hosts individual 10K and 5K races, with separate rates for open and student categories. The 2K Chairman’s Shield is by invitation.",
  "10公里個人賽": "10K individual race",
  "5公里個人賽": "5K individual race",
  "按本屆官方資料新增賽事。": "Added this edition from official sources.",
  "大會活動頁列明已開放，12月15日截止，未列截止時刻。即時名額以大會確認為準。":
    "The organiser lists entry as open and gives 15 December as the deadline without a cutoff time. Confirm availability with the organiser.",
  "15歲或以上，未滿18歲須家長或監護人同意。":
    "Ages 15 and above. Entrants under 18 need parental or guardian consent.",
  "15歲或以上，四人一隊。": "Ages 15 and above, in teams of four.",
  "12歲或以上。": "Ages 12 and above.",
  "建議6歲或以上，每組2至6人。11歲或以下由成年家長或監護人報名陪同。":
    "Recommended for ages 6 and above, in groups of two to six. Children aged 11 or younger must enter with an adult parent or guardian.",
  西九文化區: "West Kowloon Cultural District",
  西九文化區藝術公園: "West Kowloon Cultural District Art Park",
  香港世界宣明會: "World Vision Hong Kong",
  "西九文化區藝術公園設6公里個人競賽、Jerrycan隊際賽及3公里開心跑。另有1公里漫步及寵物項目。":
    "The Art Park hosts a competitive 6K individual race, a Jerrycan team race and a 3K fun run. The event also offers a 1 km walk and pet activities.",
  "6公里個人跑": "6K individual race",
  "6公里Jerrycan隊際賽（非企業組）": "6K Jerrycan team race (non-corporate)",
  "3公里個人開心跑": "3K individual fun run",
  "3公里親子／組合開心跑": "3K family or group fun run",
  "啟德體育園列明15歲以上參加者須先登記為體育園會員。各組即時名額、費用及截止待核實。":
    "Kai Tak Sports Park states that participants over 15 must register as members before entering. Category availability, fees and the deadline are unconfirmed.",
  "飛越啟德、九龍城民政事務處": "Fly High Kai Tak and Kowloon City District Office",
  "啟德青年運動場舉行，設10公里及3公里公開組別。另有九龍城學界盃。":
    "Kai Tak Youth Sports Ground hosts public 10K and 3K categories. There is also a separate Kowloon City schools cup.",
  "10公里挑戰組": "10K challenge",
  "3公里青少年挑戰組": "3K youth challenge",
  "10公里繽紛組": "10K fun run",
  "3公里繽紛組（1–2人）": "3K fun run (one or two runners)",
};

export function englishRaceTerm<T extends string | null | undefined>(
  value: T,
  english: boolean,
): string | Exclude<T, string> {
  if (!english || typeof value !== "string") return value as string | Exclude<T, string>;
  const countdown = /^尚餘 (\d+) (日|小時|分鐘)截止$/.exec(value);
  if (countdown) {
    const [, count, unit] = countdown;
    const label = { 日: "day", 小時: "hour", 分鐘: "minute" }[unit]!;
    return `Closes in ${count} ${label}${count === "1" ? "" : "s"}`;
  }
  const datedSource = /^(\d{4})年(\d{1,2})月(\d{1,2})日(報名資料覆核|直接報名網站覆核)$/.exec(
    value,
  );
  if (datedSource) {
    const [, year, month, day, kind] = datedSource;
    const date = englishDate(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    return `${date}: ${kind === "報名資料覆核" ? "entry information recheck" : "registration website recheck"}`;
  }
  return Object.hasOwn(terms, value) ? terms[value] : value;
}
