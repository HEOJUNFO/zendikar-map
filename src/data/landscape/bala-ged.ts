// 바탕 지형 — bala-ged. 모양·규칙은 src/data/types.ts 의 Landscape
// 정글(Guum Wilds)은 팬 지도 숲 채색이 그린다. 여기에는 그 안의 석회암 언덕과 되살아난 늪, Bojuka Bay 의 절벽만 둔다.
// 뒤엉킨 계곡 지역 지도의 범위(phase1.ts 의 bounds: x 2165–2300, y 990–1090)에는 그 지도도 그리는 것만 둔다 — 늪 둘은 범위 밖, 서쪽 절벽은 그 지도에도 있다.
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
        [2202, 943], [2199, 952], [2191, 958], [2179, 960], [2166, 958], [2157, 951], [2154, 942], [2158, 933],
        [2167, 927], [2179, 926], [2191, 928], [2199, 935],
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
        [2232, 972], [2228, 979], [2219, 983], [2208, 983], [2196, 984], [2186, 983], [2181, 978], [2183, 972],
        [2190, 968], [2200, 965], [2207, 960], [2216, 957], [2225, 960], [2231, 965],
      ],
      basis: `${PG}: "Damp, fetid air, thick vegetation, algae-choked marshes, and mold-covered thickets—these are the elements that define Bala Ged" / surrakar 는 "never far from either their caves or a bog". Sanguine Syphoner (FDN #68, 2024) 플레이버: "As life returned to the bogs of Bala Ged, the vampires returned to feed upon it."`,
      estimate: '공식 자료는 늪의 자리를 밝히지 않는다. surrakar 가 동굴이나 늪에서 멀리 벗어나지 않는다는 서술에 따라, 이 지도가 석회암 언덕(Surrakar caves 추정 자리) 남동쪽에 작은 늪을 두었다. 뒤엉킨 계곡 지역 지도의 범위(y 990부터)에 들지 않게 언덕 바로 밑에 붙였다.',
    },
    {
      id: 'guum-bog-riverroot',
      kind: 'swamp',
      label: 'Guum Wilds의 늪',
      ring: [
        [2156, 1040], [2161, 1045], [2163, 1053], [2162, 1062], [2160, 1070], [2154, 1076], [2148, 1073], [2146, 1065],
        [2147, 1056], [2146, 1048], [2150, 1042],
      ],
      basis: `Beneath Riverroot Tree (2020): "the shimmering bog that stretched out to the east of the Riverroot tree" (코르 제국 말기의 이야기). Sanguine Syphoner (FDN #68, 2024) 플레이버: "As life returned to the bogs of Bala Ged". Yarok, the Desecrated (SLC #25) 플레이버: "stalking jungles and the mirey quags within".`,
      estimate: '나무 동쪽의 늪은 옛 이야기의 것이고, 지금의 늪은 2024년 카드가 발라 게드의 늪에 생명이 돌아왔다고만 한다. 옛 이야기의 방향을 따라 이 지도가 Riverroot 마을(추정 자리) 동쪽 곁에 작은 늪을 두었다. 더 동쪽은 뒤엉킨 계곡 지역 지도의 범위(x 2165부터)라, 그 지도가 그리지 않는 늪이 들어가지 않게 범위 서쪽에 좁게 두었다.',
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
        [2324, 1023], [2316, 1027], [2306, 1028], [2297, 1022], [2291, 1013], [2290, 1003], [2289, 994], [2292, 987],
        [2300, 986],
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
        [2323, 983], [2325, 976], [2332, 972], [2334, 966], [2336, 959], [2337, 952], [2343, 949], [2350, 950],
        [2356, 945], [2366, 945],
      ],
      basis: `${PG}: "several waterfalls that cascade down the surrounding cliffs" / "protected from the waves by the thousands of trees between it and the ocean".`,
      estimate: '공식 자료는 만을 절벽이 둘러싼다고만 한다. 바다 쪽(동쪽)은 나무 띠가 막는다고 했으므로, 이 지도가 뭍 쪽인 서·남·북 기슭에 절벽을 그렸다. 폭포는 2009년의 모습이라 그리지 않았다. 엘드라지 침공 뒤 만의 모습은 공식 서술이 없다. 절벽은 바위 지형이라 남은 것으로 보고 그렸다(만 자체도 지도에 남아 있다).',
    },
  ],
}
