// 바탕 지형 — bala-ged. 모양·규칙은 src/data/types.ts 의 Landscape
// 정글(Guum Wilds)은 팬 지도 숲 채색이 그린다. 여기에는 그 안의 석회암 언덕과 되살아난 늪, Bojuka Bay 의 절벽만 둔다.
// 뒤엉킨 계곡 지역 지도의 범위(phase1.ts 의 bounds: x 2081–2243, y 940–1060)에는 그 지도도 그리는 것만 둔다 — 늪 둘은 범위 밖, 서쪽 절벽은 그 지도에도 있다.
// Umung River 의 물길과 폭포는 엘드라지 침공 때 먼지가 되었고(Bane of Bala Ged) 2020년 이후 다시 흐른다는 서술이 없어 그리지 않는다.
import type { Landscape } from '../types'

const PG = 'A Planeswalker\'s Guide to Zendikar: Bala Ged and Elves (2009)'

export const landscape: Landscape = {
  areas: [
    {
      id: 'surrakar-limestone-hillocks',
      kind: 'hills',
      label: 'Surrakar의 석회암 언덕',
      location: 'surrakar-caves',
      ring: [
        [2125.4, 883.6], [2121.8, 894.4], [2112.2, 901.6], [2097.8, 904], [2082.2, 901.6], [2071.4, 893.2], [2067.8, 882.4], [2072.6, 871.6],
        [2083.4, 864.4], [2097.8, 863.2], [2112.2, 865.6], [2121.8, 874],
      ],
      // 언덕 기호는 간격이 먼저 막혀 밀도로는 거의 줄지 않는다(0.4 아래로는 통째로 빈다) — 듬성듬성은 범위를 좁혀서 낸다
      density: 0.5,
      basis: `${PG}: "Deep within the Guum Wilds can be found slick, slimy limestone outcroppings of rock dotted with cave mouths … even brave expedition groups know to steer clear of the limestone hillocks." 아트북(2016)은 같은 노두를 과거형("were")으로 적는다. Nissa's Resolve (2015): 엘드라지가 휩쓴 발라 게드에서 니사는 "the partially collapsed and corrupted mouth of a surrakar tunnel" 을 찾는다.`,
      estimate: '2009년의 노두가 엘드라지 침공 뒤에도 남았다는 직접 서술은 없다. Nissa\'s Resolve(2015)에서 니사가 반쯤 무너지고 오염된 surrakar 굴 입구를 찾으므로, 동굴 입구가 뚫린 바위 노두는 침공 뒤에도 남은 것으로 보고 듬성듬성 그렸다(같은 이야기에서 뒤엉킨 계곡의 언덕은 사라졌다고 하므로 뒤엉킨 계곡에는 언덕을 그리지 않는다). 자리는 Guum Wilds 깊은 곳이라는 서술과 Surrakar caves 의 추정 자리를 따랐고, 언덕 지대의 범위는 이 지도가 골랐다.',
    },
    // 2009 가이드가 발라 게드를 정의한다고 한 늪은, 엘드라지 침공 뒤 2024년 카드에서 생명이 돌아왔다고 나온다
    {
      id: 'guum-bog-surrakar',
      kind: 'swamp',
      label: 'Guum Wilds의 늪',
      ring: [
        [2161.4, 918.4], [2156.6, 926.8], [2145.8, 931.6], [2132.6, 931.6], [2118.2, 932.8], [2106.2, 931.6], [2100.2, 925.6], [2102.6, 918.4],
        [2111, 913.6], [2123, 910], [2131.4, 904], [2142.2, 900.4], [2153, 904], [2160.2, 910],
      ],
      basis: `${PG}: "Damp, fetid air, thick vegetation, algae-choked marshes, and mold-covered thickets—these are the elements that define Bala Ged" / surrakar 는 "never far from either their caves or a bog". Sanguine Syphoner (FDN #68, 2024) 플레이버: "As life returned to the bogs of Bala Ged, the vampires returned to feed upon it."`,
      estimate: '공식 자료는 늪의 자리를 밝히지 않는다. surrakar 가 동굴이나 늪에서 멀리 벗어나지 않는다는 서술에 따라, 이 지도가 석회암 언덕(Surrakar caves 추정 자리) 남동쪽에 작은 늪을 두었다. 뒤엉킨 계곡 지역 지도의 범위(y 940부터)에 들지 않게 언덕 바로 밑에 붙였다.',
    },
    {
      id: 'guum-bog-riverroot',
      kind: 'swamp',
      label: 'Guum Wilds의 늪',
      ring: [
        [2070.2, 1000], [2076.2, 1006], [2078.6, 1015.6], [2077.4, 1026.4], [2075, 1036], [2067.8, 1043.2], [2060.6, 1039.6], [2058.2, 1030],
        [2059.4, 1019.2], [2058.2, 1009.6], [2063, 1002.4],
      ],
      basis: `Beneath Riverroot Tree (2020): "the shimmering bog that stretched out to the east of the Riverroot tree" (코르 제국 말기의 이야기). Sanguine Syphoner (FDN #68, 2024) 플레이버: "As life returned to the bogs of Bala Ged". Yarok, the Desecrated (SLC #25) 플레이버: "stalking jungles and the mirey quags within".`,
      estimate: '나무 동쪽의 늪은 옛 이야기의 것이고, 지금의 늪은 2024년 카드가 발라 게드의 늪에 생명이 돌아왔다고만 한다. 옛 이야기의 방향을 따라 이 지도가 Riverroot 마을(추정 자리) 동쪽 곁에 작은 늪을 두었다. 더 동쪽은 뒤엉킨 계곡 지역 지도의 범위(x 2081부터)라, 그 지도가 그리지 않는 늪이 들어가지 않게 범위 서쪽에 좁게 두었다.',
    },
  ],
  lines: [
    // 만의 바다 쪽(동쪽)은 나무 띠라 절벽을 두지 않는다. 빗금이 만 쪽(진행 방향 오른쪽)으로 떨어지게 남쪽 기슭은 서쪽으로, 북쪽 팔은 북쪽→동쪽으로 긋는다
    {
      id: 'bojuka-cliffs-southwest',
      kind: 'cliff',
      label: 'Bojuka Bay의 절벽',
      location: 'bojuka-bay',
      line: [
        [2271.8, 979.6], [2262.2, 984.4], [2250.2, 985.6], [2239.4, 978.4], [2232.2, 967.6], [2231, 955.6], [2229.8, 944.8], [2233.4, 936.4],
        [2243, 935.2],
      ],
      basis: `${PG}: "Fed by the Umung River and several waterfalls that cascade down the surrounding cliffs, Bojuka Bay is a watery marsh of vast proportions" / "protected from the waves by the thousands of trees between it and the ocean".`,
      estimate: '공식 자료는 만을 절벽이 둘러싼다고만 한다. 바다 쪽(동쪽)은 나무 띠가 막는다고 했으므로, 이 지도가 뭍 쪽인 서·남·북 기슭에 절벽을 그렸다. 폭포는 2009년의 모습이라(발라 게드의 강은 엘드라지 침공 때 먼지가 되었다) 그리지 않았다. 엘드라지 침공 뒤 만의 모습은 공식 서술이 없다. 절벽은 바위 지형이라 남은 것으로 보고 그렸다(만 자체도 지도에 남아 있다). 뒤엉킨 계곡 지역 지도에도 같은 자리에 절벽을 그린다.',
    },
    {
      id: 'bojuka-cliffs-north',
      kind: 'cliff',
      label: 'Bojuka Bay의 절벽',
      location: 'bojuka-bay',
      line: [
        [2270.6, 931.6], [2273, 923.2], [2281.4, 918.4], [2283.8, 911.2], [2286.2, 902.8], [2287.4, 894.4], [2294.6, 890.8], [2303, 892],
        [2310.2, 886], [2322.2, 886],
      ],
      basis: `${PG}: "several waterfalls that cascade down the surrounding cliffs" / "protected from the waves by the thousands of trees between it and the ocean".`,
      estimate: '공식 자료는 만을 절벽이 둘러싼다고만 한다. 바다 쪽(동쪽)은 나무 띠가 막는다고 했으므로, 이 지도가 뭍 쪽인 서·남·북 기슭에 절벽을 그렸다. 폭포는 2009년의 모습이라 그리지 않았다. 엘드라지 침공 뒤 만의 모습은 공식 서술이 없다. 절벽은 바위 지형이라 남은 것으로 보고 그렸다(만 자체도 지도에 남아 있다).',
    },
  ],
}
