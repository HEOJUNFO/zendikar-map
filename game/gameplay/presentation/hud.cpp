#include "gameplay/presentation/hud.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <iterator>
#include <numbers>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "engine/hud/widgets.hpp"

namespace game {
namespace {

using engine::Color;
using engine::hud::Align;
using engine::hud::Axis;
using engine::hud::Element;
using engine::hud::Fade;
using engine::hud::Shape;
using engine::hud::Theme;
using engine::hud::Ui;
using engine::hud::box;
using engine::hud::text;

// ══ 디자인 체계 ═══════════════════════════════════════════════════════════════
// HUD·메뉴의 색, 글자 크기, 간격, 판·단추의 양식은 모두 여기서 정한다. 컴포넌트는 숫자를 직접 적지 않고 이 이름들을 쓴다.
// 새 HUD 요소도 같은 부품으로 짓는다: 게임 중 표기는 cluster()·emblem()·figures()·hud_text()·hud_shape()·hud_bar()·hud_mark(), 메뉴는 menu_button()·panel()·field()·THEME 의 위젯.

// ── 글꼴 면 (game/CMakeLists.txt 의 --face 차례) ──
// 본문·입력 — 완성형 한글 전부. 닉네임·방 이름처럼 아무 글자나 올 수 있는 글은 이 면으로만 쓴다
constexpr uint32_t FACE_REGULAR = 0;
// 굵은 글 — 단추, 항목, 패널 제목, 작은 이름표. content/fonts/bold.txt 에 적은 글자만 있다
constexpr uint32_t FACE_BOLD = 1;
// 큰 굵은 글 (크게 구웠다) — 화면 제목과 큰 숫자. content/fonts/display.txt 에 적은 글자만 있다
constexpr uint32_t FACE_DISPLAY = 2;

// ── 색 — 메뉴 배경 그림(하늘거주지 유적)의 하늘빛·청록 바다·회백색 돌에 맞춘 밝은 톤. 강조는 유적 무늬의 청록 하나, 붉은 흙빛은 오류에만 ──
// 메뉴 (회백색 돌빛 판 위)
constexpr Color INK{0.07f, 0.13f, 0.25f};                  // 본문 — 깊은 바다빛
constexpr Color INK_SOFT{0.27f, 0.33f, 0.43f};             // 흐린 글 — 이름표, 안내 (돌빛 판 위 대비 6:1)
constexpr Color INK_FAINT{0.27f, 0.33f, 0.43f, 0.55f};     // 쓸 수 없는 항목의 글
constexpr Color STONE{0.965f, 0.957f, 0.930f};           // 볕에 바랜 회백색 돌
constexpr Color PANEL{0.965f, 0.957f, 0.930f, 0.94f};      // 판 — 그림이 살짝 비친다
constexpr Color FIELD{1.0f, 0.995f, 0.98f};                // 입력 칸·목록의 바탕
constexpr Color LINE{0.07f, 0.13f, 0.25f, 0.20f};          // 얇은 선 — 판의 테두리, 구분선, 위젯의 테두리
constexpr Color TEAL{0.03f, 0.43f, 0.41f};                 // 강조 — 유적 무늬의 청록 (돌빛 판 위 대비 5:1)
constexpr Color TEAL_HOVER{0.05f, 0.51f, 0.48f};
constexpr Color TEAL_PRESSED{0.02f, 0.34f, 0.33f};
constexpr Color TEAL_WASH{0.03f, 0.43f, 0.41f, 0.12f};     // 가리킨 줄·단추의 옅은 청록
constexpr Color TEAL_TINT{0.03f, 0.43f, 0.41f, 0.22f};     // 고른 줄, 눌린 단추
constexpr Color ON_TEAL{0.99f, 0.99f, 0.97f};              // 청록 바탕 위의 글자
constexpr Color RUST{0.70f, 0.19f, 0.13f};            // 오류 — 유적 무늬의 붉은 흙빛 (돌빛 판 위 대비 5:1)
// 메뉴의 바탕
constexpr Color SKY{0.60f, 0.77f, 0.90f};                  // 그림이 없을 때의 바탕 — 하늘빛에서
constexpr Color HAZE{0.93f, 0.94f, 0.92f};                 //   옅은 돌빛으로
constexpr Color SCRIM{0.965f, 0.957f, 0.930f, 0.74f};      // 그림 위 왼쪽에 까는 가림 막
constexpr Color SCRIM_CLEAR{0.965f, 0.957f, 0.930f, 0.0f};
constexpr Color VEIL{0.965f, 0.957f, 0.930f, 0.30f};       // 일시정지 — 멈춘 장면 위의 옅은 막
// 게임 중 (장면 위에 판 없이) — 밝은 글자에 깊은 바다빛 그림자
constexpr Color HUD_INK{0.99f, 0.98f, 0.95f};
constexpr Color HUD_SHADE{0.03f, 0.07f, 0.16f, 0.70f};
constexpr Color HUD_MINT{0.62f, 0.97f, 0.87f};             // 지금 있는 곳, 박에 맞음, 배수 x2 — 밝은 청록
constexpr Color HUD_GOLD{0.90f, 0.93f, 0.62f};             // 배수 x3 — 청록과 호박색 사이의 연한 금빛
constexpr Color HUD_AMBER{1.0f, 0.80f, 0.45f};             // 배수 x4, 전투 중인 방의 남은 적 — 바랜 호박색 (붉게 가지 않는다)
constexpr Color HUD_ALERT{1.0f, 0.66f, 0.56f};             // 나쁜 일 (피격, 바닥난 체력·탄, 미스) — 밝은 붉은 흙빛
constexpr Color PORTAL_GLOW{0.80f, 0.98f, 0.94f};          // 포털을 넘을 때 화면에 번지는 빛 — 밝은 청록에서
constexpr Color PORTAL_PALE{0.95f, 0.99f, 1.0f};           //   흰 하늘빛으로
constexpr Color RUSH_GLOW{0.74f, 0.96f, 0.97f};            // 대시 — 화면 가장자리에서 번지는 빛, 밝은 청록 하늘빛
constexpr Color RUSH_STREAK{0.96f, 0.99f, 1.0f};           //   그 위를 흐르는 바람 줄기 — 흰 하늘빛

// ── 글자 크기 (단위) ──
constexpr float TYPE_DISPLAY = 22.0f;  // 화면 제목 (FACE_DISPLAY)
constexpr float TYPE_LOGO = 17.0f;     // 게임 제목의 로고타이프 (FACE_DISPLAY, 글자 사이 LOGO_TRACKING)
constexpr float LOGO_TRACKING = 3.5f;
constexpr float TYPE_MULTIPLIER = 26.0f;  // 게임 중 오른쪽 위의 아주 큰 배수 (FACE_DISPLAY)
constexpr float TYPE_HERO = 20.0f;     // 게임 중 아래 두 모서리의 큰 숫자 — 체력, 탄 (FACE_DISPLAY)
constexpr float TYPE_SCORE = 11.0f;    // 게임 중의 점수 (FACE_DISPLAY)
constexpr float TYPE_FIGURE = 9.0f;    // 큰 숫자에 딸린 작은 숫자 — 최대 체력, 탄창의 크기 (FACE_DISPLAY)
constexpr float TYPE_TITLE = 10.5f;   // 메뉴 항목, 패널 제목, 판정
constexpr float TYPE_BODY = 7.0f;      // 본문, 위젯
constexpr float TYPE_SMALL = 6.0f;     // 이름표, 안내, 알림

// ── 간격 (단위) ──
constexpr float SPACE_XS = 2.0f;
constexpr float SPACE_S = 4.0f;
constexpr float SPACE_M = 6.0f;
constexpr float SPACE_L = 10.0f;
constexpr float HAIRLINE = 0.5f;  // 얇은 선의 두께
constexpr float SHADOW = 0.5f;    // 게임 중 글자·표식의 그림자가 비껴 난 거리

// ── 메뉴의 틀 (단위) — hud_unit 이 이 폭이 들어가게 단위를 고른다 ──
constexpr float MARGIN = 20.0f;          // 화면 가장자리에서
constexpr float COLUMN_WIDTH = 112.0f;   // 왼쪽 단 — 제목과 항목(단추)
constexpr float GUTTER = 12.0f;          // 왼쪽 단과 패널 사이
constexpr float PANEL_WIDTH = 208.0f;    // 오른쪽 패널
constexpr float PANEL_INNER = PANEL_WIDTH - 2.0f * SPACE_L;
constexpr float FRAME_HEIGHT = 216.0f;   // 틀의 높이 — 화면 아래에서 FRAME_BOTTOM 만큼 띄운다
constexpr float FRAME_BOTTOM = 12.0f;
constexpr float HEADER_HEIGHT = 52.0f;   // 왼쪽 단의 제목 자리 — 그 밑에서 항목이 시작하고, 패널의 위도 여기에 맞춘다
constexpr float MENU_ROW = 17.0f;        // 왼쪽 단 항목의 줄 높이
constexpr float MENU_BAR = 2.0f;         // 고른·포커스를 가진 항목 왼쪽의 막대 폭
constexpr float LABEL_WIDTH = 50.0f;     // 패널에서 칸 이름이 차지하는 폭 — 칸들이 한 줄로 맞는다
constexpr float FIELD_ROW = 16.0f;       // 패널에서 칸 한 줄의 높이 — 위젯이 달라도 줄 간격이 같다
constexpr float OPTION_GAP = 1.0f;       // 옵션 패널의 줄 사이 — 줄이 일곱이라 패널의 여느 간격보다 좁다 (줄의 높이 안에 이미 여백이 있다)
constexpr float SLIDER_WIDTH = 100.0f;
constexpr float INPUT_WIDTH = PANEL_INNER - LABEL_WIDTH - SPACE_S;  // 입력 칸 — 패널의 남는 폭을 다 쓴다
constexpr float SCRIM_SOLID = 100.0f;    // 가림 막이 고르게 덮는 폭 — 그 오른쪽으로는 SCRIM_FADE 에 걸쳐 걷힌다
constexpr float SCRIM_FADE = 130.0f;
// 메뉴 배경 그림에서 화면 비율이 달라 잘려도 남길 자리 — 큰 헤드론(가운데에서 오른쪽, 위쪽)
constexpr float BACKDROP_FOCUS_X = 0.6f;
constexpr float BACKDROP_FOCUS_Y = 0.15f;

// ── 게임 중 HUD 의 치수 (단위) ──
// 판 없이 장면 위에 직접 놓인다. 모양은 각진 선·마름모(헤드론의 단면)·비스듬한 칸으로 통일한다 (engine/hud 의 Shape) — 요소는 적게, 여백은 넓게:
//   왼쪽 위 미니맵 · 위 가운데 방 진행 · 오른쪽 위 배수·점수·연속 수 / 한가운데 조준점과 박자 표식 / 왼쪽 아래 체력 · 아래 가운데 대시 · 오른쪽 아래 탄
// 네 모서리의 묶음 뒤에는 모서리에서 번지는 옅은 바탕(HUD_PLATE)만 있고, 글자와 도형은 저마다 비껴 난 바다빛 그림자를 갖는다 — 어두운 실내에서도 밝은 창가에서도 읽힌다.
// 여느 때에는 살짝 비치고(HUD_REST), 값이 바뀌면 그 묶음만 잠깐 또렷해지고 커졌다 가라앉는다 (HudMotion 의 *_pulse).
// 묶음은 움직임에 밀렸다 따라온다 (shove·spread — 조준점과 박자 표식은 밀리지 않는다). 대시하는 동안에는 화면 가장자리에 빛이 번진다 (rush)
constexpr float HUD_MARGIN = 12.0f;      // 화면 가장자리에서
constexpr float HUD_REST = 0.86f;        // 묶음의 여느 때 불투명도 — 값이 바뀌거나 체력이 바닥나면 1
constexpr float HUD_LABEL = 0.72f;       // 작은 글 (최대값, 연속 수, 글쇠)
constexpr float HUD_TRACK = 0.42f;       // 막대·칸·마름모 틀의 빈 바탕
constexpr float HUD_DIM = 0.45f;         // 아직 쓸 수 없는 것 — 쿨다운 중의 대시, 빼 둔 탄창의 칸
constexpr float HUD_PLATE = 0.55f;       // 모서리의 옅은 바탕이 가장 짙은 곳(화면 모서리) — 안쪽으로 다 걷힌다
constexpr float HUD_POP = 0.06f;         // 값이 바뀐 묶음이 커지는 정도 (배수는 그 두 배)
constexpr float LINE_WEIGHT = 0.75f;     // 마름모 테와 꺾쇠의 선 두께
// 아래 두 모서리의 묶음 (체력·탄) — 마름모 틀, 그 옆에 큰 숫자와 작은 최대값, 숫자 밑에 비스듬한 칸. 탄은 좌우를 뒤집은 것이다
constexpr float CLUSTER_WIDTH = 96.0f;
constexpr float CLUSTER_HEIGHT = 28.0f;
constexpr float EMBLEM = 22.0f;          // 마름모 틀의 크기
constexpr float EMBLEM_TOP = 3.0f;       // 묶음 위에서 마름모 틀까지
constexpr float FIGURES_SIDE = EMBLEM + 5.0f;  // 묶음의 바깥 가장자리에서 숫자와 칸까지
constexpr float FIGURE_RAISE = 2.6f;     // 작은 숫자(TYPE_FIGURE)를 큰 숫자(TYPE_HERO)의 글자 밑선에 맞추려고 올리는 높이
constexpr float CELLS_TOP = 23.0f;       // 묶음 위에서 칸까지 — 큰 숫자의 글자 밑선(19)에서 4 단위 아래
constexpr float CELL_HEIGHT = 5.0f;
constexpr float CELL_SKEW = 2.5f;        // 칸의 윗변이 오른쪽으로 비껴 난 거리
constexpr float CELL_GAP = 1.5f;         // 칸 사이 (비스듬한 변끼리)
constexpr float HEALTH_CELL = 15.0f;     // 체력 한 칸이 차지하는 폭 (비껴 난 거리까지) — HIT_DAMAGE 만큼. 네 칸
constexpr float ROUND_CELL = 8.5f;       // 탄 한 발의 칸
constexpr float PIP = 3.5f;              // 재장전 단계를 보이는 작은 마름모
// 오른쪽 위 묶음 (배수·점수·연속 수) — 오른쪽 끝에 맞춘다
constexpr float TALLY_WIDTH = 96.0f;
constexpr float TALLY_HEIGHT = 56.0f;
constexpr float TALLY_INSET = 2.0f;      // 묶음의 오른쪽 가장자리에서 글자·칸까지
constexpr float SCORE_TOP = 28.0f;       // 묶음 위에서 점수의 줄까지 — 배수의 글자 밑선(25) 바로 아래
constexpr float STREAK_TOP = 43.0f;      // 다음 배수까지의 칸
constexpr float STREAK_CELL = 5.5f;
constexpr float STREAK_HEIGHT = 3.0f;
constexpr float STREAK_SKEW = 1.5f;
constexpr float STREAK_GAP = 1.0f;
constexpr int STREAK_CELLS = 10;
constexpr float STREAK_LABEL_TOP = 48.0f;  // 연속 수의 줄
// 위 가운데 — 방 진행: 양 끝이 마름모인 얇은 막대와 그 밑의 작은 글
constexpr float PROGRESS_WIDTH = 96.0f;
constexpr float PROGRESS_BAR = 2.0f;     // 막대의 두께
constexpr float PROGRESS_END = 8.0f;     // 양 끝 마름모의 크기 — 막대의 끝이 마름모의 한가운데다
// 아래 가운데 — 능력(대시): 마름모 틀 안의 겹꺾쇠, 쿨다운 동안 속에서 차오르는 마름모, 그 밑에 글쇠
constexpr float SLOT = 26.0f;
constexpr float DASH_GLYPH_WIDTH = 4.0f;   // 겹꺾쇠 한 획
constexpr float DASH_GLYPH_HEIGHT = 8.0f;
constexpr float DASH_GLYPH_WEIGHT = 1.0f;
// 묶음마다 밀리는 정도 — 조금씩 달라 깊이가 다른 것처럼 보인다 (아래 것이 더 가깝다)
constexpr float DEPTH_HEALTH = 1.0f;
constexpr float DEPTH_AMMO = 1.1f;
constexpr float DEPTH_ABILITY = 0.9f;
constexpr float DEPTH_TALLY = 0.75f;
constexpr float DEPTH_MAP = 0.6f;
constexpr float DEPTH_PROGRESS = 0.5f;
// 조준점 — 작은 가운데 점과 그것을 크게 감싼 얇고 살짝 비치는 선의 마름모 (꺾쇠 둘 ‹ › 이 맞붙은 것 — 높이가 화면 높이의 1/9). 박자 표식은 양옆에서 이 마름모로 모여드는 같은 기울기의 꺾쇠다:
// 꺾쇠의 꼭짓점이 마름모의 좌우 꼭짓점(가운데에서 GATE_RADIUS)에 닿는 때가 칸의 머리다 — 온박의 꺾쇠는 그 순간 마름모의 절반과 딱 겹치고(크기가 같다), 반박의 작은 꺾쇠는 꼭짓점 둘레에 겹친다.
// 기울기가 같아 닿기 전에는 어디서도 마름모와 만나지 않는다 (눈은 처음 닿는 순간을 박으로 읽는다). 그 순간 마름모의 선이 안쪽으로 굵어졌다 돌아온다 (맥동 — 바깥 가장자리는 그대로라 닿는 자리가 움직이지 않는다)
constexpr float GATE_RADIUS = 15.0f;     // 가운데에서 마름모의 꼭짓점까지
constexpr float GATE_WEIGHT = 0.55f;     // 마름모와 박자 꺾쇠의 선 두께 — 틀(LINE_WEIGHT)보다 얇다
constexpr float GATE_REST = 0.7f;        // 마름모와 박자 꺾쇠의 여느 때 불투명도 (그림자도 같이 옅다) — 정박의 번쩍임과 미스 때만 잠깐 1
constexpr float GATE_SWELL = 0.5f;       // 박의 머리에서 마름모의 선이 굵어지는 정도 (선 두께의 배수)
// 마름모의 모양(가로:세로)은 어느 상태에서도 바뀌지 않는다 — 커져도 가로·세로가 같이 커지고, 떨어도 통째로 옮겨질 뿐이다.
// 어긋남은 마름모는 그대로 두고 같은 모양의 옅은 잔상으로 보인다: 일렀으면 바깥에 (표식이 아직 닿기 전이었다), 늦었으면 안쪽에 (표식이 이미 지나갔다)
constexpr float GATE_EARLY = 21.0f;      // 이른 잔상 — 가운데에서 꼭짓점까지
constexpr float GATE_LATE = 9.0f;        // 늦은 잔상
constexpr float GATE_ECHO = 0.6f;        // 잔상이 가장 짙을 때의 불투명도 — 남은 시간만큼 걷힌다
constexpr float ON_BEAT_POP = 0.15f;     // 정박 — 마름모가 커졌다 돌아오는 정도
constexpr float BEAT_MARK = 2.0f * GATE_RADIUS;  // 온박 꺾쇠의 높이 (닿을 때) — 마름모의 높이와 같다. 폭은 높이의 절반 (마름모와 같은 기울기)
constexpr float HALF_BEAT_MARK = 18.0f;  // 반박 꺾쇠의 높이 — 온박 사이에 작게
constexpr float BEAT_SHRINK = 0.4f;      // 가장 먼 꺾쇠가 줄어드는 정도 — 멀수록 작고 옅다
constexpr float BEAT_SPACING = 60.0f;    // 박자 하나 사이의 거리 — 1 단위가 11 ms. 가장 먼 꺾쇠는 가운데에서 화면 폭의 1/4 남짓(135 단위)에서 나타난다
constexpr int BEAT_MARKS = 2;            // 한쪽에 보이는 다가오는 박자 수
constexpr float TIMING_TOP = 20.0f;      // 조준점 가운데에서 타이밍 표시의 첫 줄까지
constexpr float HIT_MARK = 7.0f;         // 조준점에서 대각선 명중 표시의 네 팔까지
constexpr float HIT_STROKE = 4.5f;
constexpr float HIT_WEIGHT = 0.9f;
constexpr float HURT_PATCH = 70.0f, HURT_DEPTH = 18.0f;
// 대시의 가장자리 빛 — 화면 가장자리에서 가장 짙고 안쪽으로 다 걷힌다 (가운데는 건드리지 않는다). 좌우가 넓고 위아래는 얇다
constexpr float RUSH_SIDE = 30.0f;       // 좌우 빛의 폭
constexpr float RUSH_CAP = 14.0f;        // 위아래 빛의 높이
constexpr float RUSH_ALPHA = 0.34f;      // 빛이 가장 짙은 곳(화면 가장자리)의 불투명도
constexpr float RUSH_STREAK_ALPHA = 0.6f;  // 바람 줄기가 가장 또렷할 때
constexpr float RUSH_TRAVEL = 34.0f;     // 바람 줄기가 안쪽에서 가장자리까지 흐르는 거리
constexpr float RUSH_PERIOD = 9.0f;      // 그 거리를 흐르는 시간 (틱)
constexpr float MAP_CELL = 9.0f;         // 시선 화살촉과 방 표식을 읽을 수 있는 방 한 칸
constexpr float MAP_GAP = 2.0f;          // 칸 사이 — 문이 난 쪽에는 이 틈을 잇는 막대가 놓인다
constexpr float MAP_DOOR = 1.5f;         // 그 막대의 폭
constexpr float MAP_REST = 0.8f;         // 미니맵의 불투명도 — 다른 묶음보다 옅다
constexpr int MAP_CELLS = 2 * FLOOR_REACH + 1;
// 잠깐 보이는 것들이 남아 있는 시간 (틱) — 박에 맞은 번쩍임, 박에서 어긋난 표시, 미스의 떨림, 맞힌 표시, 맞았을 때의 가장자리 띠
constexpr uint64_t ON_BEAT_TICKS = 8;
constexpr uint64_t OFF_BEAT_TICKS = 10;
constexpr uint64_t MISS_TICKS = 12;
constexpr float MISS_SHAKE = 3.0f;       // 미스 — 마름모가 통째로 좌우로 떠는 폭 (모양은 그대로, 가운데 점은 떨지 않는다)
constexpr float MISS_SWINGS = 1.5f;      //   남아 있는 동안 오가는 횟수
constexpr uint64_t HIT_TICKS = 14;
constexpr uint64_t HURT_TICKS = 20;
/** 체력이 여기까지 내려오면(한 번 더 맞으면 죽는다) 체력 묶음이 붉은 흙빛이 되고 늘 또렷하다 */
constexpr int32_t LOW_HEALTH = HIT_DAMAGE;

// ── 위젯의 양식 ──
/** 여느 위젯 — 흰 바탕에 얇은 선, 가리키면 옅은 청록, 포커스는 청록 테두리 */
constexpr Theme THEME{.text = INK, .muted = INK_SOFT, .surface = FIELD, .hover = {0.90f, 0.95f, 0.94f}, .active = {0.80f, 0.90f, 0.88f}, .accent = TEAL,
                      .line = LINE, .focus = TEAL, .size = TYPE_BODY, .padding = 3.5f, .row = 11.0f, .padding_x = 6.0f, .face = FACE_BOLD};
/** 그 화면의 주된 동작 — 청록으로 채운 단추. 포커스는 바다빛 테두리 */
constexpr Theme PRIMARY = [] {
  Theme theme = THEME;
  theme.text = ON_TEAL;
  theme.surface = TEAL;
  theme.hover = TEAL_HOVER;
  theme.active = TEAL_PRESSED;
  theme.focus = INK;
  return theme;
}();
/** 판 없이 그림(가림 막) 위에 놓이는 줄 — 바탕이 없고, 가리키면 옅은 청록 (스위치) */
constexpr Theme BARE = [] {
  Theme theme = THEME;
  theme.hover = TEAL_WASH;
  theme.active = TEAL_TINT;
  theme.padding = 2.5f;
  return theme;
}();

// ══ 부품 — 상태(의 일부)를 받아 요소를 돌려준다 ═══════════════════════════════

Element body(std::string_view content, Color color = INK) { return text(content, color, TYPE_BODY); }
Element small(std::string_view content, Color color = INK_SOFT) { return text(content, color, TYPE_SMALL); }
/** 부모의 폭을 가로지르는 얇은 선 */
Element rule(Color color = LINE) { return box({.height = HAIRLINE, .fill_x = true, .background = color}); }

// ── 게임 중 ───────────────────────────────────────────────────────────────────

Color faded(Color color, float alpha) { return {color.red, color.green, color.blue, color.alpha * alpha}; }

/** 장면 위에서도 읽히는 글자 — 밝은 글자 밑에 비껴 난 바다빛 그림자. alpha 로 함께 옅어진다 */
Element hud_text(std::string_view content, Color color, float size, uint32_t face, float alpha = 1.0f) {
  Element shade = text(content, faded(HUD_SHADE, alpha), size, face);
  shade.style.offset_x = SHADOW;
  shade.style.offset_y = SHADOW;
  return box({.axis = Axis::stack}, std::move(shade), text(content, faded(color, alpha), size, face));
}

/** 장면 위의 표식(조준점의 점) — 밝은 사각형 밑에 바다빛 테두리 */
Element hud_mark(float width, float height, float offset_x, float offset_y, float alpha = 1.0f, Color color = HUD_INK) {
  return box({.axis = Axis::stack, .width = width + 2.0f * SHADOW, .height = height + 2.0f * SHADOW, .background = faded(HUD_SHADE, alpha), .anchor_x = Align::center,
              .anchor_y = Align::center, .offset_x = offset_x, .offset_y = offset_y},
             box({.width = width, .height = height, .background = faded(color, alpha), .anchor_x = Align::center, .anchor_y = Align::center}));
}

/** 장면 위의 막대 한 토막 — 밝은 사각형 밑에 비껴 난 바다빛 그림자. (x, y) 는 부모(stack) 안에서의 자리 */
Element hud_bar(float x, float y, float width, float height, Color color) {
  return box({.axis = Axis::stack, .offset_x = x, .offset_y = y}, box({.width = width, .height = height, .background = HUD_SHADE, .offset_x = SHADOW, .offset_y = SHADOW}),
             box({.width = width, .height = height, .background = color}));
}
/** 막대의 빈 바탕 */
Element hud_track(float x, float y, float width, float height) {
  return box({.width = width, .height = height, .background = faded(HUD_SHADE, HUD_TRACK), .offset_x = x, .offset_y = y});
}

/** 도형 하나 (마름모·테·꺾쇠·비스듬한 칸 — size 는 선의 두께나 비껴 난 거리) — 그림자 없이. (x, y) 는 부모(stack) 안에서의 자리 */
Element bare_shape(Shape shape, float size, float x, float y, float width, float height, Color color) {
  return box({.width = width, .height = height, .background = color, .shape = shape, .shape_size = size, .offset_x = x, .offset_y = y});
}
/** 장면 위의 도형 — 밝은 도형 밑에 비껴 난 바다빛 그림자. alpha 로 함께 옅어진다 */
Element hud_shape(Shape shape, float size, float x, float y, float width, float height, Color color, float alpha = 1.0f) {
  return box({.axis = Axis::stack, .width = width, .height = height, .offset_x = x, .offset_y = y},
             bare_shape(shape, size, SHADOW, SHADOW, width, height, faded(HUD_SHADE, alpha)), bare_shape(shape, size, 0.0f, 0.0f, width, height, faded(color, alpha)));
}
/** 비스듬한 칸의 빈 바탕 */
Element cell_track(float x, float y, float width, float height, float skew) { return bare_shape(Shape::slant, skew, x, y, width, height, faded(HUD_SHADE, HUD_TRACK)); }

/** 부모(stack)의 한가운데에서 (x, y) 만큼 옮긴 자리에 놓는다 */
Element centred(Element element, float x = 0.0f, float y = 0.0f) {
  element.style.anchor_x = Align::center;
  element.style.anchor_y = Align::center;
  element.style.offset_x = x;
  element.style.offset_y = y;
  return element;
}

/** 마름모 틀 — 옅은 바탕의 마름모에 color 의 테를 두르고, 그 안에 표시(centred 로 놓은 것들)를 담는다 */
template <class... Marks>
Element emblem(float size, Color color, Marks&&... marks) {
  return box({.axis = Axis::stack, .width = size, .height = size}, box({.fill_x = true, .fill_y = true, .background = faded(HUD_SHADE, HUD_TRACK), .shape = Shape::diamond}),
             box({.fill_x = true, .fill_y = true, .background = color, .shape = Shape::ring, .shape_size = LINE_WEIGHT}), std::forward<Marks>(marks)...);
}

/** 큰 숫자와 그 뒤의 작은 "/최대값" — 글자 밑선을 맞춘다 (작은 숫자의 줄을 큰 숫자의 줄 아래 끝에서 그 차이만큼 올려 놓는다) */
Element figures(uint32_t value, uint32_t limit, Color color) {
  return box({.axis = Axis::row, .align = Align::end}, hud_text(std::to_string(value), color, TYPE_HERO, FACE_DISPLAY),
             box({.padding_x = 0.5f}, hud_text("/" + std::to_string(limit), HUD_INK, TYPE_FIGURE, FACE_DISPLAY, HUD_LABEL), box({.height = FIGURE_RAISE})));
}

/**
 * 묶음 뒤의 옅은 바탕 — 화면 모서리에서 가장 짙고 안쪽으로(가로로도 세로로도) 다 걷힌다: 가장자리가 없어 상자로 보이지 않는다.
 * 세로로 번지는 띠를 가로로 늘어놓아 두 방향의 번짐을 낸다. 묶음이 밀려도 화면 가장자리에 틈이 나지 않게 화면 밖까지 깐다
 */
Element corner_shade(float width, float height, bool right, bool bottom) {
  constexpr int STRIPS = 16;
  constexpr float OVERHANG = HUD_MARGIN + 6.0f;
  const float span = width + OVERHANG, strip = span / static_cast<float>(STRIPS);
  Element shade = box({.axis = Axis::row, .height = height + OVERHANG, .anchor_x = right ? Align::end : Align::start, .anchor_y = bottom ? Align::end : Align::start,
                       .offset_x = right ? OVERHANG : -OVERHANG, .offset_y = bottom ? OVERHANG : -OVERHANG});
  for (int i = 0; i < STRIPS; i++) {
    // 모서리에서 먼 띠일수록 옅다 (끝에서 0)
    const float away = (static_cast<float>(right ? STRIPS - 1 - i : i) + 0.5f) / static_cast<float>(STRIPS);
    const Color edge = faded(HUD_SHADE, HUD_PLATE * (1.0f - away) * (1.0f - away)), clear = faded(HUD_SHADE, 0.0f);
    shade.children.push_back(box({.width = strip, .fill_y = true, .background = bottom ? clear : edge, .background_end = bottom ? edge : clear}));
  }
  return shade;
}

/**
 * 모서리의 묶음 — 모서리에서 번지는 옅은 바탕 위에 내용을 겹쳐 놓는다. right·bottom 이 그 모서리다.
 * 여느 때에는 살짝 비치고(HUD_REST), pulse(0..1 — 값이 방금 바뀌었다)만큼 또렷해지며 제 모서리를 붙박고 커진다. vivid 면 늘 또렷하다
 */
template <class... Children>
Element cluster(float width, float height, bool right, bool bottom, float pulse, float pop, bool vivid, Children&&... children) {
  return box({.axis = Axis::stack, .width = width, .height = height, .anchor_x = right ? Align::end : Align::start, .anchor_y = bottom ? Align::end : Align::start,
              .opacity = vivid ? 1.0f : HUD_REST + (1.0f - HUD_REST) * pulse, .scale = 1.0f + pop * pulse, .origin_x = right ? Align::end : Align::start,
              .origin_y = bottom ? Align::end : Align::start},
             corner_shade(width, height, right, bottom), std::forward<Children>(children)...);
}

/**
 * 묶음을 제 자리(모서리, 위·아래 가운데 — 묶음의 anchor)에 놓고, 움직임에 밀린 만큼 옮긴다 — depth 는 그 묶음이 밀리는 정도,
 * 벌어짐(spread)은 화면 가운데에서 바깥쪽으로 (가운데에 맞춘 방향으로는 벌어지지 않는다)
 */
Element placed(Element group, const HudMotion& motion, float depth) {
  const auto outward = [](Align anchor) { return anchor == Align::end ? 1.0f : anchor == Align::center ? 0.0f : -1.0f; };
  const float out_x = outward(group.style.anchor_x), out_y = outward(group.style.anchor_y);
  group.style.offset_x = -out_x * HUD_MARGIN + motion.shove_x * depth + motion.spread * out_x;
  group.style.offset_y = -out_y * HUD_MARGIN + motion.shove_y * depth + motion.spread * out_y;
  return group;
}

/**
 * 왼쪽 아래 — 체력. 마름모 틀 안의 십자, 그 옆에 큰 숫자와 작은 최대값, 숫자 밑에 비스듬한 칸 넷(한 칸이 한 번 맞는 만큼).
 * 방금 잃은 만큼은 붉은 흙빛으로 잠깐 남았다 줄어든다 (잔상). 바닥나면(LOW_HEALTH 이하) 숫자·칸·틀이 붉은 흙빛이고 묶음이 늘 또렷하다
 */
Element health_cluster(const HudState& state) {
  const int32_t health = std::max(state.health, 0);
  const bool low = health <= LOW_HEALTH;
  const Color color = low ? HUD_ALERT : HUD_INK;
  // 칸이 채워지는 가로 길이와 칸 사이의 간격 — 비스듬한 변끼리 CELL_GAP 만큼 떨어진다
  constexpr float RUN = HEALTH_CELL - CELL_SKEW;
  Element bar = box({.axis = Axis::stack});
  const int cells = state.max_health / HIT_DAMAGE;
  const float cell_run = RUN * static_cast<float>(PLAYER_HEALTH / HIT_DAMAGE) / static_cast<float>(cells);
  for (int i = 0; i < cells; i++) {
    const float x = FIGURES_SIDE + static_cast<float>(i) * (cell_run + CELL_GAP);
    const auto part = [&](float amount) { return std::clamp((amount - static_cast<float>(i * HIT_DAMAGE)) / static_cast<float>(HIT_DAMAGE), 0.0f, 1.0f) * cell_run; };
    const float filled = part(static_cast<float>(health)), ghost = part(state.motion.health_ghost);
    bar.children.push_back(cell_track(x, CELLS_TOP, cell_run + CELL_SKEW, CELL_HEIGHT, CELL_SKEW));
    if (ghost > filled) bar.children.push_back(bare_shape(Shape::slant, CELL_SKEW, x + filled, CELLS_TOP, CELL_SKEW + ghost - filled, CELL_HEIGHT, HUD_ALERT));
    if (filled > 0.0f) bar.children.push_back(hud_shape(Shape::slant, CELL_SKEW, x, CELLS_TOP, CELL_SKEW + filled, CELL_HEIGHT, color));
  }
  // 마름모 틀 안의 십자 — 사각형 둘
  constexpr float CROSS = 8.0f, ARM = 2.0f;
  Element mark = emblem(EMBLEM, color, centred(box({.width = CROSS, .height = ARM, .background = color})), centred(box({.width = ARM, .height = CROSS, .background = color})));
  mark.style.offset_y = EMBLEM_TOP;
  Element numerals = figures(static_cast<uint32_t>(health), static_cast<uint32_t>(state.max_health), color);
  numerals.style.offset_x = FIGURES_SIDE;
  return cluster(CLUSTER_WIDTH, CLUSTER_HEIGHT, false, true, state.motion.health_pulse, HUD_POP, low, std::move(mark), std::move(numerals), std::move(bar));
}

/** 재장전의 단계 — 작은 마름모 둘: 탄창을 빼면 첫째가 차고, 끼우면 사라진다 (탄창이 비었거나 빼 둔 동안만 보인다) */
Element reload_steps(uint32_t stage) {
  const auto pip = [](bool done) {
    return done ? hud_shape(Shape::diamond, 0.0f, 0.0f, 0.0f, PIP, PIP, HUD_INK) : hud_shape(Shape::ring, HAIRLINE, 0.0f, 0.0f, PIP, PIP, HUD_INK, HUD_LABEL);
  };
  return box({.axis = Axis::row, .gap = SPACE_XS}, pip(stage > 0), pip(false));
}

/**
 * 오른쪽 아래 — 탄. 체력 묶음을 좌우로 뒤집은 것: 마름모 틀 안의 권총, 그 왼쪽에 큰 숫자와 작은 탄창 크기, 숫자 밑에 탄 한 발이 비스듬한 한 칸 — 쏠 때마다 오른쪽부터 한 칸씩 꺼진다.
 * 재장전의 두 단계도 칸으로 보인다 — 탄창을 빼면 칸이 모두 옅은 붉은 흙빛이 되고, 끼우면 모두 찬다. 비었거나 빼 둔 동안에는 숫자와 틀이 붉은 흙빛이고 칸 위에 단계 표시(작은 마름모 둘)가 붙는다
 */
Element ammo_cluster(const HudState& state) {
  const bool empty = state.ammo == 0 || state.reload_stage;
  const Color color = empty ? HUD_ALERT : HUD_INK;
  constexpr float SPAN = static_cast<float>(Pistol::MAGAZINE - 1) * (ROUND_CELL - CELL_SKEW + CELL_GAP) + ROUND_CELL;
  const float cell_width = (SPAN - CELL_SKEW - static_cast<float>(state.magazine_capacity - 1) * CELL_GAP) / static_cast<float>(state.magazine_capacity) + CELL_SKEW;
  const float pitch = cell_width - CELL_SKEW + CELL_GAP, first = CLUSTER_WIDTH - FIGURES_SIDE - SPAN;
  Element rounds = box({.axis = Axis::stack});
  for (uint32_t i = 0; i < state.magazine_capacity; i++) {
    const float x = first + static_cast<float>(i) * pitch;
    if (state.reload_stage) rounds.children.push_back(bare_shape(Shape::slant, CELL_SKEW, x, CELLS_TOP, cell_width, CELL_HEIGHT, faded(HUD_ALERT, HUD_DIM)));
    else if (i < state.ammo) rounds.children.push_back(hud_shape(Shape::slant, CELL_SKEW, x, CELLS_TOP, cell_width, CELL_HEIGHT, HUD_INK));
    else rounds.children.push_back(cell_track(x, CELLS_TOP, cell_width, CELL_HEIGHT, CELL_SKEW));
  }
  // 마름모 틀 안의 권총 — 왼쪽을 겨눈 총열(사각형)과 뒤로 누운 손잡이(비스듬한 칸)
  Element mark = emblem(EMBLEM, color, centred(box({.width = 9.0f, .height = 3.0f, .background = color}), -0.5f, -2.0f),
                        centred(bare_shape(Shape::slant, -1.5f, 0.0f, 0.0f, 4.5f, 5.0f, color), 2.75f, 2.0f));
  mark.style.anchor_x = Align::end;
  mark.style.offset_y = EMBLEM_TOP;
  Element numerals = figures(state.ammo, state.magazine_capacity, color);
  numerals.style.anchor_x = Align::end;
  numerals.style.offset_x = -FIGURES_SIDE;
  Element steps = empty ? reload_steps(state.reload_stage) : Element{};
  steps.style.offset_x = first;
  steps.style.offset_y = CELLS_TOP - PIP - SPACE_XS;
  return cluster(CLUSTER_WIDTH, CLUSTER_HEIGHT, true, true, state.motion.ammo_pulse, HUD_POP, false, std::move(mark), std::move(numerals), std::move(rounds), std::move(steps));
}

/** 배수의 색 — 단계마다 조금씩 뜨거워진다: 흰빛 → 청록 → 연한 금빛 → 바랜 호박색 (붉게 가지 않는다) */
Color heat(uint32_t multiplier) {
  constexpr Color HEAT[]{HUD_INK, HUD_MINT, HUD_GOLD, HUD_AMBER};
  return HEAT[std::clamp(multiplier, 1u, 4u) - 1];
}

/**
 * 오른쪽 위 — 아주 큰 배수, 그 밑에 점수, 다음 배수까지 이어 간 행동 수의 비스듬한 칸 열(가장 높은 배수에서는 다 찬다 — 칸은 다음 배수의 색이다)과 작은 연속 수.
 * 배수가 오르거나 연속 수를 잃으면(미스·피격) 묶음이 튄다
 */
Element tally_cluster(const HudState& state) {
  constexpr float PITCH = STREAK_CELL - STREAK_SKEW + STREAK_GAP, SPAN = static_cast<float>(STREAK_CELLS - 1) * PITCH + STREAK_CELL, FIRST = TALLY_WIDTH - TALLY_INSET - SPAN;
  const int lit = state.multiplier >= 4 ? STREAK_CELLS : static_cast<int>(state.streak % STREAK_CELLS);
  Element cells = box({.axis = Axis::stack});
  for (int i = 0; i < STREAK_CELLS; i++) {
    const float x = FIRST + static_cast<float>(i) * PITCH;
    cells.children.push_back(i < lit ? hud_shape(Shape::slant, STREAK_SKEW, x, STREAK_TOP, STREAK_CELL, STREAK_HEIGHT, heat(state.multiplier + 1))
                                     : cell_track(x, STREAK_TOP, STREAK_CELL, STREAK_HEIGHT, STREAK_SKEW));
  }
  const auto right = [](Element element, float top) {
    element.style.anchor_x = Align::end;
    element.style.offset_x = -TALLY_INSET;
    element.style.offset_y = top;
    return element;
  };
  return cluster(TALLY_WIDTH, TALLY_HEIGHT, true, false, state.motion.multiplier_pulse, 2.0f * HUD_POP, false,
                 right(hud_text("x" + std::to_string(state.multiplier), heat(state.multiplier), TYPE_MULTIPLIER, FACE_DISPLAY), 0.0f),
                 right(hud_text(std::to_string(state.score), HUD_INK, TYPE_SCORE, FACE_DISPLAY), SCORE_TOP), std::move(cells),
                 right(hud_text("연속 " + std::to_string(state.streak), HUD_INK, TYPE_SMALL, FACE_BOLD, HUD_LABEL), STREAK_LABEL_TOP));
}

/**
 * 위 가운데 — 방 진행. 양 끝이 마름모인 얇은 막대와 그 밑의 작은 글. 전투 중에는 이 방에 남은 적(잡을수록 줄어드는 호박색 막대와 남은 수),
 * 그 밖에는 층의 진행(비운 전투방만큼 차는 청록 막대와 비운 방 수)
 */
Element room_progress(const HudState& state) {
  const bool combat = state.enemies_left > 0 && state.enemies_total > 0;
  const float part = combat ? static_cast<float>(state.enemies_left) / static_cast<float>(state.enemies_total)
                            : state.rooms_total ? static_cast<float>(state.rooms_cleared) / static_cast<float>(state.rooms_total) : 0.0f;
  constexpr float LEFT = PROGRESS_END * 0.5f, TOP = (PROGRESS_END - PROGRESS_BAR) * 0.5f;
  Element bar = box({.axis = Axis::stack, .width = PROGRESS_WIDTH + PROGRESS_END, .height = PROGRESS_END}, hud_track(LEFT, TOP, PROGRESS_WIDTH, PROGRESS_BAR),
                    part > 0.0f ? hud_bar(LEFT, TOP, PROGRESS_WIDTH * std::min(part, 1.0f), PROGRESS_BAR, combat ? HUD_AMBER : HUD_MINT) : Element{},
                    hud_shape(Shape::diamond, 0.0f, 0.0f, 0.0f, PROGRESS_END, PROGRESS_END, HUD_INK),
                    hud_shape(Shape::diamond, 0.0f, PROGRESS_WIDTH, 0.0f, PROGRESS_END, PROGRESS_END, HUD_INK));
  const std::string label = combat ? "적 " + std::to_string(state.enemies_left) : "방 " + std::to_string(state.rooms_cleared) + "/" + std::to_string(state.rooms_total);
  return box({.gap = SPACE_XS, .align = Align::center, .anchor_x = Align::center, .opacity = HUD_REST}, std::move(bar), hud_text(label, HUD_INK, TYPE_SMALL, FACE_BOLD, HUD_LABEL),
             state.chamber.empty() ? Element{} : hud_text(state.chamber, HUD_MINT, TYPE_SMALL, FACE_REGULAR));
}

/**
 * 아래 가운데 — 대시. 마름모 틀 안의 겹꺾쇠(»)와 그 밑의 글쇠. 쿨다운 동안(ready 0..1)에는 틀과 겹꺾쇠가 옅고,
 * 틀 속에서 청록 마름모가 가운데부터 차올라 다 차면(1) 다시 또렷해진다
 */
Element dash_slot(float ready) {
  const bool charged = ready >= 1.0f;
  const Color color = faded(HUD_INK, charged ? 1.0f : HUD_DIM);
  const float fill = SLOT * std::clamp(ready, 0.0f, 1.0f);
  Element slot = emblem(SLOT, color, charged ? Element{} : centred(bare_shape(Shape::diamond, 0.0f, 0.0f, 0.0f, fill, fill, faded(HUD_MINT, HUD_DIM))),
                        centred(bare_shape(Shape::chevron_right, DASH_GLYPH_WEIGHT, 0.0f, 0.0f, DASH_GLYPH_WIDTH, DASH_GLYPH_HEIGHT, color), -0.5f * DASH_GLYPH_WIDTH),
                        centred(bare_shape(Shape::chevron_right, DASH_GLYPH_WEIGHT, 0.0f, 0.0f, DASH_GLYPH_WIDTH, DASH_GLYPH_HEIGHT, color), 0.5f * DASH_GLYPH_WIDTH));
  return box({.gap = SPACE_XS, .align = Align::center, .anchor_x = Align::center, .anchor_y = Align::end, .opacity = HUD_REST}, std::move(slot),
             hud_text("SHIFT", HUD_INK, TYPE_SMALL, FACE_BOLD, HUD_LABEL));
}

/** 가운데(stack 의 한가운데)에서 x 만큼 옮긴 자리의 마름모 — 꼭짓점까지 radius. 꺾쇠 둘(‹ ›)을 맞붙인 것이라 가로와 세로가 늘 같다 */
Element gate_diamond(float radius, float weight, float x, Color color, float alpha) {
  return box({.axis = Axis::stack, .anchor_x = Align::center, .anchor_y = Align::center},
             centred(hud_shape(Shape::chevron_left, weight, 0.0f, 0.0f, radius, 2.0f * radius, color, alpha), x - 0.5f * radius),
             centred(hud_shape(Shape::chevron_right, weight, 0.0f, 0.0f, radius, 2.0f * radius, color, alpha), x + 0.5f * radius));
}

/**
 * 조준점 — 작은 가운데 점과 그것을 감싼 얇고 살짝 비치는 마름모. 박의 머리(pulse 1)에서 선이 안쪽으로 굵어졌다 돌아온다 — 박자 표식이 여기로 모여든다.
 * 마름모의 모양(가로:세로)은 어느 상태에서도 그대로다.
 * 행동이 박에 맞춰 나갔으면(on_beat — 지난 시간 0..1) 밝은 청록으로 또렷하게 번쩍이며 통째로 살짝 커졌다 돌아온다. 어긋나 나갔으면(off — 지난 시간) 마름모는 그대로이고
 * 같은 모양의 옅은 잔상이 잠깐 남는다 — 일렀으면(side -1: 표식이 아직 닿기 전) 바깥에, 늦었으면 안쪽에 (나가지 않은 것이 아니라서 나쁜 일의 색을 쓰지 않는다. 글자로 풀어 쓰지 않는다).
 * 미스(miss — 지난 시간 0..1)는 나가지 않은 것이다: 나쁜 일의 색으로 또렷해지고 마름모가 통째로 좌우로 떨다 잦아든다 (가운데 점은 제자리 — 조준은 흐트러지지 않는다)
 */
Element crosshair(float pulse, std::optional<float> on_beat, std::optional<float> off, int side, std::optional<float> miss) {
  // 번쩍임은 밝은 청록(미스면 붉은 흙빛)에서 여느 색으로, 또렷한 데서 여느 불투명도로 돌아온다
  const Color flash = miss ? HUD_ALERT : HUD_MINT;
  const float age = miss ? *miss : on_beat ? *on_beat : 1.0f, back = age * age;
  const Color color{flash.red + (HUD_INK.red - flash.red) * back, flash.green + (HUD_INK.green - flash.green) * back, flash.blue + (HUD_INK.blue - flash.blue) * back};
  const float alpha = 1.0f + (GATE_REST - 1.0f) * back;
  const float shake = miss ? MISS_SHAKE * (1.0f - *miss) * std::cos(2.0f * std::numbers::pi_v<float> * MISS_SWINGS * *miss) : 0.0f;
  const float weight = GATE_WEIGHT * (1.0f + GATE_SWELL * pulse), pop = on_beat ? 1.0f + ON_BEAT_POP * (1.0f - *on_beat) * (1.0f - *on_beat) : 1.0f;
  Element gate = gate_diamond(GATE_RADIUS, weight, shake, color, alpha);
  gate.style.scale = pop;
  return box({.axis = Axis::stack, .anchor_x = Align::center, .anchor_y = Align::center},
             off ? gate_diamond(side < 0 ? GATE_EARLY : GATE_LATE, GATE_WEIGHT, 0.0f, HUD_INK, GATE_ECHO * (1.0f - *off)) : Element{}, std::move(gate),
             hud_mark(1.0f, 1.0f, 0.0f, 0.0f, 1.0f, color));
}

/**
 * 박자 표식 하나 — 조준점의 마름모로 다가오는 꺾쇠 (왼쪽 것은 ‹, 오른쪽 것은 › — 마름모의 그쪽 절반과 같은 기울기). side 는 -1(왼쪽)·+1(오른쪽),
 * distance 는 꺾쇠의 꼭짓점이 마름모의 그쪽 꼭짓점에서 떨어진 거리, height 는 닿을 때의 높이 — 온박은 BEAT_MARK, 반박은 HALF_BEAT_MARK. 멀수록 작고 옅다 (alpha — 마름모의 여느 불투명도에 곱한다)
 */
Element beat_mark(float side, float distance, float height, float alpha) {
  constexpr float REACH = static_cast<float>(BEAT_MARKS) * BEAT_SPACING;
  const float tall = height * (1.0f - BEAT_SHRINK * distance / REACH), wide = 0.5f * tall;
  return centred(hud_shape(side < 0.0f ? Shape::chevron_left : Shape::chevron_right, GATE_WEIGHT, 0.0f, 0.0f, wide, tall, HUD_INK, GATE_REST * alpha),
                 side * (GATE_RADIUS + distance - 0.5f * wide));
}

/**
 * 박자 — 조준점 양옆에서 꺾쇠들이 조준점의 마름모로 모여든다. 꺾쇠의 꼭짓점이 마름모의 좌우 꼭짓점에 닿는 때가 칸의 머리다 (그 순간 마름모의 선이 굵어진다):
 * 큰 꺾쇠는 온박(닿을 때 마름모의 절반과 겹친다), 그 사이의 작은 꺾쇠는 반박. phase 는 지금 박 안에서의 위치 0..1 (틱 사이에서도 이어진다)
 */
Element beat_track(float phase) {
  constexpr float REACH = static_cast<float>(BEAT_MARKS) * BEAT_SPACING;
  Element track = box({.axis = Axis::stack, .anchor_x = Align::center, .anchor_y = Align::center});
  for (const float side : {-1.0f, 1.0f}) {
    for (int k = 0; k <= BEAT_MARKS; k++) {
      // 멀수록 옅다
      const float beat = (static_cast<float>(k) + 1.0f - phase) * BEAT_SPACING, half = beat - 0.5f * BEAT_SPACING;
      if (k < BEAT_MARKS) track.children.push_back(beat_mark(side, beat, BEAT_MARK, 1.0f - beat / REACH));
      if (half >= 0.0f && half < REACH) track.children.push_back(beat_mark(side, half, HALF_BEAT_MARK, 0.8f * (1.0f - half / REACH)));
    }
  }
  return track;
}

/**
 * 타이밍 표시 (옵션, 처음부터 켜져 있다) — 조준점 아래에 마지막으로 판정을 받은 누름(미스도)이 박에서 벗어난 양과 최근 평균. 부호가 일렀는지(−) 늦었는지(+)다.
 * 판정 보정을 얼마로 둘지 사용자가 여기서 읽는다 (늘 +90 ms 면 슬라이더를 +90 으로). 작고 옅게 — 색은 그 누름의 판정이다: 정박이면 밝은 청록, 어긋남이면 흰빛, 미스면 붉은 흙빛
 * (누른 때는 가장 가까운 틱으로 판정받으므로 창의 끝은 반 틱 더 바깥이다)
 */
Element timing_readout(const Timing& timing) {
  constexpr float MS_PER_TICK = 1000.0f / static_cast<float>(TICK_RATE);
  const auto signed_ms = [](int ms) { return (ms > 0 ? "+" : "") + std::to_string(ms) + " ms"; };
  const float apart = std::abs(static_cast<float>(timing.last_ms));
  const Color verdict = apart < (static_cast<float>(ON_BEAT_WINDOW) + 0.5f) * MS_PER_TICK ? HUD_MINT : apart < (static_cast<float>(ACT_WINDOW) + 0.5f) * MS_PER_TICK ? HUD_INK : HUD_ALERT;
  Element last = hud_text(signed_ms(timing.last_ms), verdict, TYPE_SMALL, FACE_REGULAR, HUD_REST);
  Element mean = hud_text("평균 " + signed_ms(timing.mean_ms), HUD_INK, TYPE_SMALL, FACE_REGULAR, HUD_LABEL);
  return box({.gap = SPACE_XS, .align = Align::center, .anchor_x = Align::center, .anchor_y = Align::center, .offset_y = TIMING_TOP + TYPE_BODY}, std::move(last), std::move(mean));
}

/** 쏜 총알이 적에 맞았다 — 조준점 둘레 네 귀에 작은 마름모가 찍혀 밖으로 벌어지며 사라진다 (글자로 풀어 쓰지 않는다) */
Element hit_mark(float age) {
  Element marks = box({.axis = Axis::stack, .anchor_x = Align::center, .anchor_y = Align::center});
  const float spread = HIT_MARK + 2.5f * age;
  for (const float x : {-1.0f, 1.0f})
    for (const float y : {-1.0f, 1.0f})
      marks.children.push_back(centred(hud_shape(Shape::slant, -x * y * (HIT_STROKE - HIT_WEIGHT), 0.0f, 0.0f, HIT_STROKE, HIT_STROKE, HUD_INK, 1.0f - age), x * spread, y * spread));
  return marks;
}

/** Red dash-like flash at the attacked edge; diagonals meet at that corner. */
Element hurt_edge(float age, float bearing, bool motion) {
  if (age >= 1.0f) return {};
  const float strength = (1.0f - age) * (1.0f - age);
  const Color glow = faded(HUD_ALERT, 0.50f * strength), clear = faded(HUD_ALERT, 0.0f);
  const int sector = (static_cast<int>(std::round(bearing / (std::numbers::pi_v<float> / 4.0f))) + 8) % 8;
  const bool right = sector >= 1 && sector <= 3, left = sector >= 5 && sector <= 7;
  const bool top = sector == 0 || sector == 1 || sector == 7, bottom = sector >= 3 && sector <= 5;
  const Align horizontal = right ? Align::end : left ? Align::start : Align::center;
  const Align vertical = top ? Align::start : bottom ? Align::end : Align::center;
  Element edge = box({.axis = Axis::stack, .fill_x = true, .fill_y = true});
  const auto patch = [&](bool sideways, bool far) {
    Element glow_patch = box({.axis = Axis::stack, .width = sideways ? HURT_DEPTH : HURT_PATCH, .height = sideways ? HURT_PATCH : HURT_DEPTH,
                             .background = far ? clear : glow, .background_end = far ? glow : clear, .fade = sideways ? Fade::right : Fade::down,
                             .anchor_x = horizontal, .anchor_y = vertical});
    for (uint32_t i = 0; i < 3; i++) {
      const float length = 11.0f + static_cast<float>(i) * 3.0f;
      const float inset = 3.0f + (motion ? 6.0f * age : 0.0f);
      glow_patch.children.push_back(box({.width = sideways ? length : 0.75f, .height = sideways ? 0.75f : length,
                                        .background = faded(HUD_ALERT, 0.78f * strength),
                                        .anchor_x = sideways ? (far ? Align::end : Align::start) : Align::center,
                                        .anchor_y = sideways ? Align::center : (far ? Align::end : Align::start),
                                        .offset_x = sideways ? (far ? -inset : inset) : static_cast<float>(static_cast<int>(i) - 1) * 10.0f,
                                        .offset_y = sideways ? static_cast<float>(static_cast<int>(i) - 1) * 10.0f : (far ? -inset : inset)}));
    }
    return glow_patch;
  };
  if (top || bottom) edge.children.push_back(patch(false, bottom));
  if (right || left) edge.children.push_back(patch(true, right));
  return edge;
}

/**
 * 대시 — 화면 네 가장자리에서 밝은 청록 하늘빛이 번지고, 좌우 가장자리로 가는 바람 줄기들이 안쪽에서 밖으로 흘러 나간다 (가운데의 조준점과 박자 표식은 가리지 않는다).
 * rush 는 세기 0..1, age 는 켜진 뒤로 지난 틱 — 줄기가 그만큼 흘렀다
 */
Element rush_edge(float rush, float age) {
  // 줄기마다 화면 가운데 높이에서의 자리, 길이, 두께, 흐름의 어긋남 (오른쪽 가장자리는 위아래를 뒤집어 쓴다)
  struct Streak {
    float y, length, thickness, phase;
  };
  constexpr Streak STREAKS[]{{-96.0f, 34.0f, 0.5f, 0.0f}, {-71.0f, 52.0f, 1.0f, 0.55f}, {-48.0f, 28.0f, 0.5f, 0.3f}, {-27.0f, 44.0f, 0.5f, 0.8f}, {-8.0f, 22.0f, 0.5f, 0.15f},
                             {13.0f, 48.0f, 1.0f, 0.65f}, {35.0f, 30.0f, 0.5f, 0.4f},  {58.0f, 56.0f, 0.5f, 0.9f},  {79.0f, 26.0f, 1.0f, 0.25f}, {101.0f, 40.0f, 0.5f, 0.7f}};
  const Color glow = faded(RUSH_GLOW, RUSH_ALPHA * rush), clear = faded(RUSH_GLOW, 0.0f);
  Element edge = box({.axis = Axis::stack, .fill_x = true, .fill_y = true},
                     box({.width = RUSH_SIDE, .fill_y = true, .background = glow, .background_end = clear, .fade = Fade::right}),
                     box({.width = RUSH_SIDE, .fill_y = true, .background = clear, .background_end = glow, .fade = Fade::right, .anchor_x = Align::end}),
                     box({.height = RUSH_CAP, .fill_x = true, .background = glow, .background_end = clear}),
                     box({.height = RUSH_CAP, .fill_x = true, .background = clear, .background_end = glow, .anchor_y = Align::end}));
  for (const bool right : {false, true}) {
    for (const Streak& streak : STREAKS) {
      // 안쪽에서 나타나 가장자리로 흘러 나가며 사라진다 — 머리(가장자리 쪽)가 밝고 꼬리는 걷힌다
      const float run = age / RUSH_PERIOD + streak.phase + (right ? 0.5f : 0.0f), flow = run - std::floor(run);
      const Color head = faded(RUSH_STREAK, RUSH_STREAK_ALPHA * rush * std::sin(std::numbers::pi_v<float> * flow)), tail = faded(RUSH_STREAK, 0.0f);
      const float inset = (1.0f - flow) * RUSH_TRAVEL;
      edge.children.push_back(box({.width = streak.length, .height = streak.thickness, .background = right ? tail : head, .background_end = right ? head : tail, .fade = Fade::right,
                                   .anchor_x = right ? Align::end : Align::start, .anchor_y = Align::center, .offset_x = right ? -inset : inset,
                                   .offset_y = right ? -streak.y : streak.y}));
    }
  }
  return edge;
}

/** 포털을 넘는 중 — 화면이 포털 빛으로 밝게 번졌다 걷힌다. 방이 바뀌는 한가운데(progress 0.5)에서 장면을 다 덮는다 (수치와 조준점은 그 위에 남는다) */
Element portal_veil(float progress) {
  const float cover = 1.0f - std::fabs(2.0f * progress - 1.0f);
  // 천천히 번지기 시작해 한가운데에서 머문다
  const float alpha = cover * cover * (3.0f - 2.0f * cover);
  return box({.fill_x = true, .fill_y = true, .background = faded(PORTAL_GLOW, alpha), .background_end = faded(PORTAL_PALE, alpha)});
}

/**
 * 미니맵 — 화면 왼쪽 위에 층의 칸을 작은 격자로, 옅게 (MAP_REST). 가 본 방은 채운 네모, 지금 있는 방은 테두리를 두른 큰 청록 네모,
 * 문 너머의 안 가 본 방은 빈 테두리 (색만이 아니라 크기와 테두리로 가른다). 문은 칸 사이를 잇는 막대로 보인다.
 * 현재 방 중심에서 시선의 반대로 지도를 돌린다. 위를 향한 화살촉은 방 안 위치를 따라가며 특수방은 단색 깃발·해골로 가른다.
 * 지금 있는 방만 또렷하고 나머지는 비친다 (비운 방 수는 위 가운데의 방 진행이 보인다)
 */
Element minimap(const HudState& state) {
  constexpr float PITCH = MAP_CELL + MAP_GAP, SPAN = static_cast<float>(MAP_CELLS) * PITCH - MAP_GAP;
  Element grid = box({.axis = Axis::stack, .width = SPAN, .height = SPAN, .opacity = MAP_REST});
  float pivot_x = SPAN * 0.5f, pivot_y = SPAN * 0.5f;
  for (const MapCell& cell : state.map) {
    const float x = static_cast<float>(cell.x + FLOOR_REACH) * PITCH, y = static_cast<float>(cell.z + FLOOR_REACH) * PITCH;
    if (cell.kind == MapCell::Kind::current) {
      pivot_x = x + MAP_CELL * 0.5f;
      pivot_y = y + MAP_CELL * 0.5f;
    }
    for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
      if (!(cell.doors >> d & 1u)) continue;
      // 칸의 그 쪽 변 가운데에서 틈을 건너는 막대
      const bool sideways = DIRECTION_X[d] != 0;
      const float along = (MAP_CELL - MAP_DOOR) * 0.5f, out_x = DIRECTION_X[d] > 0 ? MAP_CELL : -MAP_GAP, out_y = DIRECTION_Z[d] > 0 ? MAP_CELL : -MAP_GAP;
      grid.children.push_back(box({.width = sideways ? MAP_GAP : MAP_DOOR, .height = sideways ? MAP_DOOR : MAP_GAP, .background = faded(HUD_INK, 0.5f), .offset_x = x + (sideways ? out_x : along),
                                   .offset_y = y + (sideways ? along : out_y)}));
    }
    switch (cell.kind) {
      case MapCell::Kind::known:
        grid.children.push_back(box({.width = MAP_CELL, .height = MAP_CELL, .background = faded(HUD_SHADE, 0.25f), .outline = faded(HUD_INK, 0.5f), .offset_x = x, .offset_y = y}));
        break;
      case MapCell::Kind::visited:
        grid.children.push_back(box({.width = MAP_CELL, .height = MAP_CELL, .background = faded(HUD_INK, 0.6f), .outline = faded(HUD_SHADE, 0.6f), .offset_x = x, .offset_y = y}));
        break;
      case MapCell::Kind::current:
        grid.children.push_back(box({.width = MAP_CELL + 2.0f, .height = MAP_CELL + 2.0f, .background = HUD_MINT, .outline = HUD_INK, .offset_x = x - 1.0f, .offset_y = y - 1.0f}));
        break;
    }
    if (cell.room_kind == RoomKind::shop || cell.room_kind == RoomKind::boss) {
      const bool current = cell.kind == MapCell::Kind::current;
      // 현재 방의 표식은 플레이어 반대 귀에 둔다. 실제 위치를 옮기지 않고 화살촉과 겹침을 피한다.
      const float icon_x = current ? (state.map_player_x >= 0.0f ? 0.0f : MAP_CELL - 3.0f) : 3.0f;
      const float icon_y = current ? (state.map_player_z >= 0.0f ? 0.0f : MAP_CELL - 3.0f) : 3.0f;
      const Color ink = cell.kind == MapCell::Kind::known ? HUD_INK : Color{HUD_SHADE.red, HUD_SHADE.green, HUD_SHADE.blue};
      grid.children.push_back(bare_shape(cell.room_kind == RoomKind::shop ? Shape::banner : Shape::skull, 0.0f, x + icon_x, y + icon_y, 3.0f, 3.0f, ink));
    }
    if (cell.kind == MapCell::Kind::current) {
      constexpr float POINTER = 3.0f, TRAVEL = 2.4f;
      const float at_x = x + MAP_CELL * 0.5f + state.map_player_x * TRAVEL;
      const float at_y = y + MAP_CELL * 0.5f + state.map_player_z * TRAVEL;
      grid.children.push_back(bare_shape(Shape::pointer, 0.0f, at_x - POINTER * 0.5f, at_y - POINTER * 0.5f, POINTER, POINTER,
                                         Color{HUD_SHADE.red, HUD_SHADE.green, HUD_SHADE.blue}));
    }
  }
  if (grid.children.empty()) return grid;
  const float rotation = -state.map_yaw, c = std::cos(rotation), s = std::sin(rotation);
  float min_x = SPAN * 2.0f, min_y = SPAN * 2.0f, max_x = -SPAN * 2.0f, max_y = -SPAN * 2.0f;
  for (Element& mark : grid.children) {
    auto& style = mark.style;
    const float dx = style.offset_x + style.width * 0.5f - pivot_x, dy = style.offset_y + style.height * 0.5f - pivot_y;
    const float center_x = pivot_x + c * dx - s * dy, center_y = pivot_y + s * dx + c * dy;
    style.offset_x = center_x - style.width * 0.5f;
    style.offset_y = center_y - style.height * 0.5f;
    const bool pointer = style.shape == Shape::pointer;
    style.rotation = pointer ? 0.0f : rotation;
    const float half_x = pointer ? style.width * 0.5f : (std::abs(c) * style.width + std::abs(s) * style.height) * 0.5f;
    const float half_y = pointer ? style.height * 0.5f : (std::abs(s) * style.width + std::abs(c) * style.height) * 0.5f;
    min_x = std::min(min_x, center_x - half_x);
    min_y = std::min(min_y, center_y - half_y);
    max_x = std::max(max_x, center_x + half_x);
    max_y = std::max(max_y, center_y + half_y);
  }
  // 공개된 부분만 HUD 여백 안에 붙인다. 전층이 드러나도 회전한 대각선(최대 약 109 단위)이 잘리지 않는다.
  for (Element& mark : grid.children) {
    mark.style.offset_x -= min_x;
    mark.style.offset_y -= min_y;
  }
  grid.style.width = max_x - min_x;
  grid.style.height = max_y - min_y;
  return grid;
}

Element economy_readout(const HudState& state) {
  Element lines = box({.gap = SPACE_XS, .offset_x = HUD_MARGIN, .offset_y = 124.0f});
  lines.children.push_back(hud_text("골드 " + std::to_string(state.gold), HUD_GOLD, TYPE_BODY, FACE_REGULAR));
  if (state.ensnared) lines.children.push_back(hud_text("속박 / 이동속도 감소", HUD_MINT, TYPE_SMALL, FACE_REGULAR));
  if (state.burning) lines.children.push_back(hud_text("화상 / 불길에서 벗어나세요", HUD_ALERT, TYPE_SMALL, FACE_REGULAR));
  for (const Card& card : CARDS)
    if ((state.cards >> static_cast<uint8_t>(card.id)) & 1u) lines.children.push_back(hud_text(card.name, HUD_MINT, TYPE_SMALL, FACE_REGULAR));
  return lines;
}

Element shop_cards(const HudState& state) {
  if (!state.shop) return {};
  Element board = box({.padding = SPACE_M, .gap = SPACE_S, .width = 250.0f, .background = Color{0.025f, 0.045f, 0.065f, 0.98f},
                       .outline = HUD_GOLD, .anchor_x = Align::center, .anchor_y = Align::center});
  board.children.push_back(text("하늘거주지 기억 상점", HUD_GOLD, TYPE_TITLE, FACE_BOLD));
  board.children.push_back(text("1-8 카드 선택 / E 구매 / 문으로 이동", HUD_INK, TYPE_SMALL, FACE_REGULAR));
  for (uint32_t row = 0; row < CARDS.size() / 2; row++) {
    Element pair = box({.axis = Axis::row, .gap = SPACE_S});
    for (uint32_t column = 0; column < 2; column++) {
      const uint32_t index = row * 2 + column;
      const Card& card = CARDS[index];
      const bool owned = !card.repeatable && ((state.cards >> static_cast<uint8_t>(card.id)) & 1u);
      const bool selected = index == state.selected_card;
      Element offer = box({.padding = SPACE_S, .gap = 1.0f, .width = 117.0f, .height = 34.0f,
                           .background = selected ? Color{0.08f, 0.20f, 0.21f} : Color{0.06f, 0.09f, 0.13f},
                           .outline = selected ? HUD_MINT : Color{0.20f, 0.28f, 0.31f}});
      offer.children.push_back(text(std::to_string(index + 1) + " " + std::string(card.name), HUD_INK, TYPE_SMALL, FACE_REGULAR));
      offer.children.push_back(text(card.effect, HUD_INK, TYPE_SMALL, FACE_REGULAR));
      offer.children.push_back(text(owned ? "보유 중" : std::to_string(card.price) + " 골드" + (state.gold < card.price ? " / 골드 부족" : " / 구매 가능"),
                                    owned ? HUD_MINT : state.gold < card.price ? HUD_ALERT : HUD_GOLD, TYPE_SMALL, FACE_REGULAR));
      pair.children.push_back(std::move(offer));
    }
    board.children.push_back(std::move(pair));
  }
  std::string_view result = "처치와 방 정복으로 골드를 모으세요";
  switch (state.shop_result) {
    case ShopResult::purchased: result = "구매 완료 / 카드 효과가 적용되었습니다"; break;
    case ShopResult::insufficient_gold: result = "골드 부족 / 다른 방에서 전투 후 돌아오세요"; break;
    case ShopResult::already_owned: result = "이미 보유한 카드 / 다른 카드를 선택하세요"; break;
    case ShopResult::full_health: result = "체력이 가득합니다 / 회복이 필요할 때 구매하세요"; break;
    case ShopResult::unavailable: result = "상점방에서 구매할 수 있습니다"; break;
    case ShopResult::browsing: break;
  }
  board.children.push_back(text(result, HUD_INK, TYPE_SMALL, FACE_REGULAR));
  return board;
}

Element boss_readout(const HudState& state) {
  if (!state.boss_health) return {};
  Element line = box({.gap = SPACE_XS, .align = Align::center, .anchor_x = Align::center, .offset_y = 35.0f});
  line.children.push_back(hud_text("하늘거주지 공명룡", HUD_AMBER, TYPE_BODY, FACE_REGULAR));
  if (*state.boss_health > 0) {
    line.children.push_back(hud_text("체력 " + std::to_string(*state.boss_health) + " / " + std::to_string(BOSS.health), HUD_INK, TYPE_BODY, FACE_REGULAR));
    line.children.push_back(box({.width = 100.0f * static_cast<float>(*state.boss_health) / static_cast<float>(BOSS.health), .height = 1.5f, .background = HUD_AMBER}));
  } else {
    line.children.push_back(hud_text("쓰러진 심장을 쏘세요 / 마무리 선율 " + std::to_string(state.finish_hits) + " / 5", HUD_MINT, TYPE_BODY, FACE_REGULAR));
  }
  return line;
}

// ── 메뉴 ──────────────────────────────────────────────────────────────────────

/** 메뉴 화면의 바탕 — 배경 그림 한 장 (없으면 하늘빛에서 돌빛으로 번지는 바탕). 움직이지 않는다 */
Element backdrop(const engine::hud::Picture& picture) {
  if (picture.id) return engine::hud::image(picture, {.fill_x = true, .fill_y = true}, BACKDROP_FOCUS_X, BACKDROP_FOCUS_Y);
  return box({.fill_x = true, .fill_y = true, .background = SKY, .background_end = HAZE});
}

/** 바탕 위 왼쪽의 가림 막 — 왼쪽 단의 글자가 그림 위에서 읽히게 돌빛을 깔고, 오른쪽으로 걷힌다 */
Element scrim() {
  return box({.axis = Axis::row, .fill_y = true}, box({.width = SCRIM_SOLID, .fill_y = true, .background = SCRIM}),
             box({.width = SCRIM_FADE, .fill_y = true, .background = SCRIM, .background_end = SCRIM_CLEAR, .fade = Fade::right}));
}

/** 왼쪽 단의 제목 자리 — 큰 제목과 그 밑의 한 줄(없으면 빈 요소). 높이가 같아 화면마다 그 밑의 항목이 같은 자리에서 시작한다 */
Element header(Element title, Element caption = {}) { return box({.width = COLUMN_WIDTH, .height = HEADER_HEIGHT}, std::move(title), std::move(caption)); }

Element display(std::string_view title) { return text(title, INK, TYPE_DISPLAY, FACE_DISPLAY); }

/** 게임 제목 — 넓은 자간의 굵은 대문자. 자간은 글자를 하나씩 띄워 놓아 낸다 */
Element logo() {
  Element letters = box({.axis = Axis::row, .gap = LOGO_TRACKING});
  for (const char& letter : std::string_view{"ZENDIKAR"}) letters.children.push_back(text({&letter, 1}, INK, TYPE_LOGO, FACE_DISPLAY));
  return letters;
}

/** 왼쪽 단의 맨 아래 — 글쇠 안내 */
Element hints(std::string_view first, std::string_view second = {}) {
  return box({.gap = SPACE_XS, .anchor_y = Align::end}, small(first), second.empty() ? Element{} : small(second));
}

/** 왼쪽 단 — 제목 자리, 그 밑의 내용(항목이나 단추들), 맨 아래의 글쇠 안내 */
Element column(Element head, Element content, Element foot) {
  return box({.axis = Axis::stack, .width = COLUMN_WIDTH, .fill_y = true}, box({}, std::move(head), std::move(content)), std::move(foot));
}

/** 메뉴의 틀 — 왼쪽 단과 오른쪽 패널을 나란히, 화면 왼쪽 아래에. 패널의 위는 왼쪽 단의 항목이 시작하는 높이에 맞춘다 (배경 그림의 위쪽을 가리지 않는다) */
Element frame(Element left, Element panel) {
  panel.style.offset_y = HEADER_HEIGHT;
  return box({.axis = Axis::row, .gap = GUTTER, .height = FRAME_HEIGHT, .anchor_y = Align::end, .offset_x = MARGIN, .offset_y = -FRAME_BOTTOM}, std::move(left),
             box({.axis = Axis::stack, .fill_y = true}, std::move(panel)));
}

/** 오른쪽 패널 — 위에 청록 띠를 두른 돌빛 판에 제목과 구분선, 그 밑에 내용. 높이는 내용에 맞는다. 제목이 아무 글자나 올 수 있는 글(방 이름)이면 title_face 를 FACE_REGULAR 로 */
template <class... Children>
Element panel(std::string_view title, uint32_t title_face, Children&&... children) {
  return box({.width = PANEL_WIDTH, .background = PANEL, .outline = LINE}, box({.height = 1.0f, .fill_x = true, .background = TEAL}),
             box({.padding = SPACE_L, .gap = SPACE_M, .fill_x = true}, box({.gap = SPACE_S, .fill_x = true}, text(title, INK, TYPE_TITLE, title_face), rule()),
                 std::forward<Children>(children)...));
}

/** 왼쪽 단 항목의 한 줄 — 왼쪽의 막대 자리와 큰 글자. 막대와 글자색으로 고름·포커스·가리킴을 보인다 (menu_items·menu_button 이 같이 쓴다) */
Element menu_row(std::string_view name, Color color, Element bar) {
  return box({.axis = Axis::row, .gap = SPACE_S, .align = Align::center, .width = COLUMN_WIDTH, .height = MENU_ROW},
             box({.axis = Axis::stack, .width = MENU_BAR, .height = TYPE_TITLE}, std::move(bar)), text(name, color, TYPE_TITLE, FACE_BOLD));
}
Element menu_bar(float width, Color color) { return box({.width = width, .height = TYPE_TITLE, .background = color}); }

/**
 * 왼쪽 단의 단추(일시정지, 대기실) — 메인 메뉴의 항목과 같은 모양: 판 없이 큰 글자.
 * 포커스를 가지면 청록 글자와 굵은 막대, 가리키면 가는 바다빛 막대, 누르는 동안 짙은 청록, 쓸 수 없으면 흐린 글자
 */
Element menu_button(const Ui& ui, engine::hud::Id id, std::string_view name, bool disabled = false) {
  const bool focused = ui.focus == id && !disabled, hovered = ui.hover == id && !disabled;
  Element row = menu_row(name, disabled ? INK_FAINT : ui.pressed == id ? TEAL_PRESSED : focused ? TEAL : INK,
                         focused ? menu_bar(MENU_BAR, TEAL) : hovered ? menu_bar(HAIRLINE, INK_SOFT) : Element{});
  row.control = {.kind = engine::hud::Control::Kind::button, .id = id, .disabled = disabled};
  return row;
}

/** 이름이 붙은 칸 — 흐린 이름, 위젯, 그 값을 적은 글(없으면 빈 요소) */
Element field(std::string_view name, Element widget, Element value = {}) {
  return box({.axis = Axis::row, .gap = SPACE_S, .align = Align::center, .height = FIELD_ROW}, box({.width = LABEL_WIDTH}, body(name, INK_SOFT)), std::move(widget),
             std::move(value));
}

/** 안쪽 여백이 있는 위젯(스위치 줄)을 그 여백만큼 왼쪽으로 내어, 속의 그림이 다른 칸의 위젯과 왼쪽 끝을 맞추게 한다 */
Element outdented(Element widget, float padding) {
  widget.style.offset_x = -padding;
  return box({.axis = Axis::stack}, std::move(widget));
}

/** 단추 밑의 알림 한 줄 — 로비의 오류(붉은 흙빛, 앞에 '오류:')가 있으면 그것, 없으면 누를 수 없는 까닭(흐린 글). 둘 다 없으면 빈 요소 */
Element notice(std::string_view blocker, const Lobby& lobby) {
  if (!lobby.error.empty()) return small("오류: " + lobby.error, RUST);
  return blocker.empty() ? Element{} : small(blocker);
}

/** 패널의 단추 줄 — 그 패널의 단추와, 서버와 끊겨 있을 때만 '다시 연결' */
Element action_row(const Ui& ui, const Lobby& lobby, Element action) {
  return box({.axis = Axis::row, .gap = SPACE_S}, std::move(action),
             lobby.link == Lobby::Link::offline ? engine::hud::button(ui, THEME, HUD_RECONNECT, "다시 연결") : Element{});
}

Element nickname_field(const Ui& ui, const Menu& menu) {
  return field("닉네임", engine::hud::input(ui, THEME, HUD_NICKNAME, menu.nickname, NICKNAME_LENGTH, INPUT_WIDTH));
}

Element options_panel(const Ui& ui, const Options& options) {
  char sensitivity[16];
  std::snprintf(sensitivity, sizeof sensitivity, "%.1f", static_cast<double>(options.sensitivity));
  char offset[16];
  std::snprintf(offset, sizeof offset, "%+d ms", static_cast<int>(std::lround(options.judge_offset)));
  // 줄이 일곱이라 줄 사이를 패널의 여느 간격보다 좁게 두고(OPTION_GAP), 스위치 둘(상하 반전·화면 흔들림)은 한 줄에 둔다 — 일시정지의 틀(작은 화면) 안에 든다
  return panel("옵션", FACE_BOLD, box({.gap = OPTION_GAP},
               field("마우스 감도", engine::hud::slider(ui, THEME, HUD_SENSITIVITY, options.sensitivity, SENSITIVITY_MIN, SENSITIVITY_MAX, SENSITIVITY_STEP, SLIDER_WIDTH),
                     body(sensitivity)),
               field("시야각", engine::hud::slider(ui, THEME, HUD_FOV, options.fov, FOV_MIN, FOV_MAX, FOV_STEP, SLIDER_WIDTH), body(std::to_string(std::lround(options.fov)) + "도")),
               // 켜짐은 스위치의 자리와 함께 글로도 적는다
               field("상하 반전", outdented(engine::hud::toggle(ui, BARE, HUD_INVERT_Y, options.invert_y ? "켬" : "끔", options.invert_y), BARE.padding),
                     box({.axis = Axis::row, .gap = SPACE_S, .align = Align::center}, body("화면 흔들림", INK_SOFT),
                         engine::hud::toggle(ui, BARE, HUD_SHAKE, options.shake ? "켬" : "끔", options.shake))),
               field("음악", engine::hud::slider(ui, THEME, HUD_MUSIC_VOLUME, options.music, 0.0f, 1.0f, VOLUME_STEP, SLIDER_WIDTH), body(std::to_string(std::lround(options.music * 100.0f)))),
               field("효과음", engine::hud::slider(ui, THEME, HUD_EFFECTS_VOLUME, options.effects, 0.0f, 1.0f, VOLUME_STEP, SLIDER_WIDTH), body(std::to_string(std::lround(options.effects * 100.0f)))),
               field("판정 보정", engine::hud::slider(ui, THEME, HUD_JUDGE_OFFSET, options.judge_offset, -JUDGE_OFFSET_MAX, JUDGE_OFFSET_MAX, JUDGE_OFFSET_STEP, SLIDER_WIDTH), body(offset)),
               field("타이밍 표시", outdented(engine::hud::toggle(ui, BARE, HUD_TIMING, options.timing ? "켬" : "끔", options.timing), BARE.padding))));
}

/** 조작 한 줄 — 흐린 이름과 그 글쇠 */
Element control_line(std::string_view name, std::string_view keys) {
  return box({.axis = Axis::row, .gap = SPACE_S}, box({.width = LABEL_WIDTH}, small(name)), small(keys, INK));
}

/** 받지 못한 에셋 팩을 다시 받는 단추 — 받지 못했을 때만 */
Element assets_retry(const Ui& ui, const Menu& menu) { return menu.assets == Assets::failed ? engine::hud::button(ui, THEME, HUD_ASSETS_RETRY, "다시 시도") : Element{}; }

Element solo_panel(const Ui& ui, const Menu& menu) {
  // 장면의 에셋이 오기 전에는 시작할 수 없다 — 까닭을 단추 밑에 한 줄로
  const std::string_view blocker = play_blocker(menu);
  return panel("혼자 하기", FACE_BOLD,
               box({.gap = SPACE_XS}, small("하늘거주지 원정 / 탁류가 깨어난 유적"), control_line("이동", "W A S D"), control_line("조준", "마우스"), control_line("발사", "클릭"), control_line("재장전", "R"),
                   control_line("대시", "Shift"), control_line("점프", "Space"), control_line("상점", "1-8 선택 / E 구매"), control_line("일시정지", "ESC")),
               box({.axis = Axis::row, .gap = SPACE_S}, engine::hud::button(ui, PRIMARY, HUD_SOLO_START, "시작", !blocker.empty()), assets_retry(ui, menu)),
               blocker.empty() ? Element{} : small(blocker));
}

Element find_panel(const Ui& ui, const Menu& menu, const Lobby& lobby) {
  std::vector<std::string> rows;
  int selected = -1;
  for (const Lobby::RoomEntry& room : lobby.rooms) {
    if (menu.room == room.id) selected = static_cast<int>(rows.size());
    rows.push_back(room.name + " · " + std::to_string(room.players) + "/" + std::to_string(room.max_players) + (room.playing ? " · 진행 중" : " · 대기 중"));
  }
  const std::vector<std::string_view> items(rows.begin(), rows.end());
  const char* empty = lobby.link == Lobby::Link::offline ? "서버 연결 끊김" : lobby.link == Lobby::Link::connecting ? "불러오는 중…" : "열린 방 없음";
  const std::string_view blocker = join_blocker(menu, lobby);
  return panel("방 찾기", FACE_BOLD, nickname_field(ui, menu), engine::hud::list(ui, THEME, HUD_ROOMS, items, selected, PANEL_INNER, 4, empty),
               action_row(ui, lobby, engine::hud::button(ui, PRIMARY, HUD_JOIN, "참가", !blocker.empty())), notice(blocker, lobby));
}

Element create_panel(const Ui& ui, const Menu& menu, const Lobby& lobby) {
  const std::string_view blocker = create_blocker(menu, lobby);
  return panel("방 만들기", FACE_BOLD, field("방 이름", engine::hud::input(ui, THEME, HUD_ROOM_NAME, menu.room_name, ROOM_NAME_LENGTH, INPUT_WIDTH)),
               field("최대 인원", engine::hud::slider(ui, THEME, HUD_MAX_PLAYERS, static_cast<float>(menu.max_players), MIN_PLAYERS, MAX_PLAYERS, 1.0f, SLIDER_WIDTH),
                     body(std::to_string(menu.max_players) + "명")),
               nickname_field(ui, menu), action_row(ui, lobby, engine::hud::button(ui, PRIMARY, HUD_CREATE, "만들기", !blocker.empty())), notice(blocker, lobby));
}

/**
 * 메인 메뉴의 항목 — 판 없이 그림(가림 막) 위에 놓인 큰 글자. 고른 항목은 청록 글자와 왼쪽의 막대로 보이고,
 * 막대는 이 목록이 포커스를 가졌을 때 굵다 (포커스가 패널로 가면 가늘어진다). 가리킨 항목은 가는 바다빛 막대
 */
Element menu_items(const Ui& ui, MenuItem chosen) {
  // MenuItem 차례
  static constexpr std::string_view ITEMS[] = {"혼자 하기", "방 찾기", "방 만들기", "옵션"};
  const bool focused = ui.focus == HUD_MENU;
  Element rows = box({});
  for (int i = 0; i < static_cast<int>(std::size(ITEMS)); i++) {
    const bool selected = i == static_cast<int>(chosen);
    const bool hovered = ui.hover == HUD_MENU && ui.hover_item == i;
    rows.children.push_back(
        menu_row(ITEMS[i], selected ? TEAL : INK, selected ? menu_bar(focused ? MENU_BAR : HAIRLINE, TEAL) : hovered ? menu_bar(HAIRLINE, INK_SOFT) : Element{}));
  }
  rows.control = {.kind = engine::hud::Control::Kind::list, .id = HUD_MENU, .count = static_cast<int>(std::size(ITEMS)), .selected = static_cast<int>(chosen), .row_height = MENU_ROW};
  return rows;
}

/** 메인 메뉴 — 왼쪽에 제목과 항목, 오른쪽에 고른 항목의 패널 */
Element main_menu(const Ui& ui, const Menu& menu, const Lobby& lobby) {
  Element detail;
  switch (menu.item) {
    case MenuItem::solo: detail = solo_panel(ui, menu); break;
    case MenuItem::find: detail = find_panel(ui, menu, lobby); break;
    case MenuItem::create: detail = create_panel(ui, menu, lobby); break;
    case MenuItem::options: detail = options_panel(ui, menu.options); break;
  }
  return frame(column(header(logo()), menu_items(ui, menu.item), hints("↑↓ 선택 · Enter 확인", "Tab 다음 · ESC 뒤로")),
               std::move(detail));
}

/** 대기실의 참가자 한 줄 — 준비는 표식의 모양(채움·빈 테두리)과 글로 적는다 (색만으로 가르지 않는다) */
Element member_row(const Lobby::Member& member, const Lobby& lobby) {
  const Lobby::Room& room = *lobby.room;
  const bool host = member.id == room.host;
  const bool marked = host || member.ready || room.playing;
  return box({.axis = Axis::row, .gap = SPACE_S, .align = Align::center},
             box({.width = 3.0f, .height = 3.0f, .background = marked ? std::optional{TEAL} : std::nullopt, .outline = marked ? TEAL : INK_SOFT}),
             body(member.nickname + (member.id == lobby.player_id ? " (나)" : "") + (host ? " · 방장" : room.playing ? "" : member.ready ? " · 준비" : " · 준비 안 함")));
}

/** 대기실 — 들어가 있는 방의 참가자들과 준비·시작·나가기. 방이 시작됐으면 준비·시작 대신 입장 */
Element room_menu(const Ui& ui, const Menu& menu, const Lobby& lobby) {
  const Lobby::Room& room = *lobby.room;
  const bool host = room.host == lobby.player_id;
  bool ready = false;
  Element members = box({.gap = SPACE_XS});
  for (const Lobby::Member& member : room.members) {
    if (member.id == lobby.player_id) ready = member.ready;
    members.children.push_back(member_row(member, lobby));
  }
  Element head = header(display("대기실"), body("참가자 " + std::to_string(room.members.size()) + "/" + std::to_string(room.max_players), INK_SOFT));
  Element foot = hints("↑↓ 선택 · Enter 확인");
  // 방 이름은 아무 글자나 올 수 있다 — 굵은 면에는 없는 글자가 있다
  if (room.playing) {
    // 서버는 아직 판을 돌리지 않는다 — 함께 하는 판처럼 보이게 하지 않고 있는 그대로 적는다
    const std::string_view blocker = play_blocker(menu);
    return frame(column(std::move(head),
                        box({}, menu_button(ui, HUD_ROOM_ENTER, "입장", !blocker.empty()), menu.assets == Assets::failed ? menu_button(ui, HUD_ASSETS_RETRY, "다시 시도") : Element{},
                            menu_button(ui, HUD_LEAVE, "나가기")),
                        std::move(foot)),
                 panel(room.name, FACE_REGULAR, std::move(members), small("게임 시작 · 협동 미지원 — 각자 진행"), notice(blocker, lobby)));
  }
  const std::string_view blocker = host ? start_blocker(lobby) : std::string_view{"방장 대기 중"};
  return frame(column(std::move(head),
                      box({}, host ? menu_button(ui, HUD_ROOM_START, "시작", !blocker.empty()) : menu_button(ui, HUD_READY, ready ? "준비 취소" : "준비"),
                          menu_button(ui, HUD_LEAVE, "나가기")),
                      std::move(foot)),
               panel(room.name, FACE_REGULAR, std::move(members), notice(blocker, lobby)));
}

/** 판의 요약 한 줄 — 일시정지와 끝난 화면의 제목 밑 */
Element summary(const HudState& state) {
  return body("점수 " + std::to_string(state.score) + " · 방 " + std::to_string(state.rooms_cleared) + "/" + std::to_string(state.rooms_total), INK_SOFT);
}

/** 판이 끝난 화면 — 죽었거나 층을 다 비웠다. 일시정지와 같은 양식 */
Element over_menu(const HudState& state) {
  const Ui& ui = state.ui;
  const std::string_view title = state.outcome == World::Outcome::cleared ? (state.finish_hits == 5 ? "수호자 격파" : "층 완료") : "사망";
  return frame(column(header(display(title), summary(state)),
                      box({}, menu_button(ui, HUD_RETRY, "다시 하기"), menu_button(ui, HUD_QUIT, "메인 메뉴로")), hints("↑↓ 선택 · Enter 확인")),
               Element{});
}

/** 일시정지 — 게임 중에 포인터가 풀리면(ESC) 나온다 */
Element pause_menu(const HudState& state) {
  const Ui& ui = state.ui;
  return frame(column(header(display("일시정지"), summary(state)),
                      box({}, menu_button(ui, HUD_RESUME, "계속하기"), menu_button(ui, HUD_PAUSE_OPTIONS, state.menu.pause_options ? "옵션 닫기" : "옵션"),
                          menu_button(ui, HUD_QUIT, "메인 메뉴로")),
                      hints("↑↓ 선택 · Enter 확인", state.menu.pause_options ? "ESC 옵션 닫기" : std::string_view{})),
               state.menu.pause_options ? options_panel(ui, state.menu.options) : Element{});
}

}  // namespace

HudState select_hud_state(const World& world, const Menu& menu, const Lobby& lobby, const Ui& ui, const engine::hud::Picture& backdrop, const HudMotion& motion, float tick_phase,
                          std::optional<Timing> timing, float lead) {
  HudState state{
      .health = world.player().health,
      .ammo = world.pistol().ammo,
      .reload_stage = world.pistol().reload_stage,
      .multiplier = multiplier(world.streak()),
      .score = world.score(),
      .gold = world.gold(),
      .cards = world.owned_cards(),
      .max_health = world.max_health(),
      .magazine_capacity = world.magazine_capacity(),
      .shop = world.in_shop(),
      .ensnared = world.ensnared(),
      .burning = world.burning(),
      .selected_card = world.selected_card(),
      .shop_result = world.shop_result(),
      .rooms_cleared = world.rooms_cleared(),
      .rooms_total = world.rooms_total(),
      .outcome = world.outcome(),
      .menu = menu,
      .lobby = lobby,
      .ui = ui,
      .backdrop = backdrop,
  };
  // 메뉴에는 박자도 잠깐 보이는 표시도 미니맵도 없다 — 상태에 두지 않아야 메뉴가 프레임마다 다시 조립되지 않는다
  if (menu.screen != Screen::playing) return state;
  const Room& chamber = world.floor().rooms[world.room()];
  state.map_player_x = std::clamp(world.player().position.x / ROOM_HALF, -1.0f, 1.0f);
  state.map_player_z = std::clamp(world.player().position.z / ROOM_HALF, -1.0f, 1.0f);
  state.map_yaw = world.player().yaw;
  state.chamber = chamber.kind == RoomKind::shop ? "원정대 교역소" : chamber.kind == RoomKind::boss ? "공명룡의 둥지" : chamber.shape == 2 ? "탁류의 심연" : "하늘거주지 유적";
  // 틱 사이에서도 이어 간다 — 정수 틱으로만 그리면 표식이 16.7 ms 계단으로 움직인다
  // 표식은 눈에 닿을 때의 자리로 — lead 만큼 앞선 때 (판정 보정이 크면 음수다: 그만큼 늦춘다)
  const float beat_ticks = static_cast<float>(TICKS_PER_BEAT);
  const float ahead = static_cast<float>(world.tick() % TICKS_PER_BEAT) + std::clamp(tick_phase, 0.0f, 1.0f) + lead;
  state.beat = (ahead - beat_ticks * std::floor(ahead / beat_ticks)) / beat_ticks;
  if (menu.options.timing) state.timing = timing;
  state.streak = world.streak();
  state.motion = motion;
  for (const Enemy& enemy : world.enemies())
    if (enemy.kind == EnemyKind::boss) {
      state.boss_health = enemy.health;
      state.finish_hits = enemy.finish_hits;
      break;
    }
  // 전투 중인 방의 남은 적 — 그 방에 처음 놓인 수에 견준다
  if (const uint32_t left = static_cast<uint32_t>(world.enemies().size())) {
    const Room& here = world.floor().rooms[world.room()];
    state.enemies_left = left;
    state.enemies_total = std::max(left, static_cast<uint32_t>(here.chargers) + here.casters + here.spiders + here.bats);
  }
  // 대시의 쿨다운 — 쓴 칸의 다음다음 칸(한 박 뒤)의 머리에서 다 찬다
  if (world.dash_slot() && world.dash_tick()) {
    const uint64_t ready = (*world.dash_slot() + world.dash_cooldown_slots()) * TICKS_PER_SLOT, since = *world.dash_tick();
    if (world.tick() < ready && since < ready) state.dash_ready = static_cast<float>(world.tick() - since) / static_cast<float>(ready - since);
  }
  const auto age = [&](std::optional<uint64_t> since, uint64_t lasting) {
    return since && world.tick() - *since < lasting ? std::optional{static_cast<float>(world.tick() - *since) / static_cast<float>(lasting)} : std::nullopt;
  };
  // 정박·어긋남·미스 가운데 나중 것만 보인다 (같은 틱이면 미스 — 나가지 않은 것이 보여야 한다)
  if (world.miss_tick() && world.miss_tick() >= world.beat_tick() && world.miss_tick() >= world.off_tick()) {
    state.miss = age(world.miss_tick(), MISS_TICKS);
  } else if (world.beat_tick() >= world.off_tick()) {
    state.on_beat = age(world.beat_tick(), ON_BEAT_TICKS);
  } else {
    state.off_beat = age(world.off_tick(), OFF_BEAT_TICKS);
    if (state.off_beat) state.off_side = world.off_side();
  }
  state.hit = age(world.hit_tick(), HIT_TICKS);
  state.hurt = age(world.hurt_tick(), HURT_TICKS);
  if (state.hurt) state.hurt_direction = world.hurt_direction();
  state.transit = age(world.portal_tick(), TRANSIT_TICKS);

  const Floor& floor = world.floor();
  for (uint32_t i = 0; i < floor.rooms.size(); i++) {
    const Room& room = floor.rooms[i];
    if (world.visited(i)) {
      state.map.push_back({room.x, room.z, i == world.room() ? MapCell::Kind::current : MapCell::Kind::visited, room.doors, room.kind});
      continue;
    }
    // 가 본 방과 문으로 이어진 방만 보인다
    for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
      const auto beyond = room.door(d) ? floor.at(room.x + DIRECTION_X[d], room.z + DIRECTION_Z[d]) : std::nullopt;
      if (!beyond || !world.visited(*beyond)) continue;
      state.map.push_back({room.x, room.z, MapCell::Kind::known, 0, room.kind});
      break;
    }
  }
  return state;
}

/** 성능 표시 (개발용) — 화면 위 가운데의 어두운 판에 숫자만 적는다. 어느 화면에서나 같은 자리다 */
Element perf_readout(const PerfReadout& perf) {
  char line[200];
  Element lines = box({.padding = SPACE_XS, .gap = 0.5f, .background = HUD_SHADE, .anchor_x = Align::center, .offset_y = SPACE_XS});
  const auto add = [&](int length) { lines.children.push_back(text(std::string_view(line, static_cast<std::size_t>(std::max(length, 0))), HUD_INK, TYPE_SMALL, FACE_REGULAR)); };
  const float fps = perf.span_ms > 0.0f ? static_cast<float>(perf.frames) * 1000.0f / perf.span_ms : 0.0f;
  add(std::snprintf(line, sizeof line, "%.0f fps  간격 %.1f / %.1f / %.1f ms (p50 / p99 / 최대)  넘김 %u / %u / %u (120 / 60 / 30 Hz)", fps, perf.p50, perf.p99, perf.longest, perf.over_120,
                    perf.over_60, perf.over_30));
  if (perf.gpu) add(std::snprintf(line, sizeof line, "GPU %.1f ms (장면 %.1f, 최대 %.1f)  CPU %.2f ms (최대 %.1f)", *perf.gpu, perf.gpu_scene, perf.gpu_longest, perf.cpu, perf.cpu_longest));
  else add(std::snprintf(line, sizeof line, "GPU 잴 수 없음  CPU %.2f ms (최대 %.1f)", perf.cpu, perf.cpu_longest));
  add(std::snprintf(line, sizeof line, "틱 %.2f  소리 %.2f  에셋 %.2f  장면 %.2f  HUD %.2f  제출 %.2f", perf.tick, perf.sound, perf.assets, perf.scene, perf.hud,
                    perf.submit));
  add(std::snprintf(line, sizeof line, "그리기 %u  삼각형 %u  화면 %u x %u (%.0f Hz)", perf.draws, perf.triangles, perf.surface_width, perf.surface_height,
                    perf.refresh_ms > 0.0f ? 1000.0f / perf.refresh_ms : 0.0f));
  if (perf.scene_width)
    add(std::snprintf(line, sizeof line, "장면 %u x %u  배율 %.2f  다중 표본 %s  갱신 %u 번에 한 프레임", perf.scene_width, perf.scene_height, perf.scale, perf.multisample ? "4" : "없음", perf.divisor));
  return lines;
}

Element screen_root(const HudState& state) {
  if (state.menu.screen == Screen::playing) {
    // 박의 머리에서 1, 반박에서 그 절반 — 곧 잦아든다
    const float pulse = std::exp(-6.0f * state.beat) + 0.5f * std::exp(-6.0f * (state.beat < 0.5f ? state.beat + 0.5f : state.beat - 0.5f));
    // 게임 중에는 조준점이 포인터다 — 커서를 그리지 않는다
    // 가장자리의 묶음들은 움직임에 밀린다. 가운데의 조준점과 박자 표식은 밀리지 않는다 (조준이 흐트러지지 않게)
    const HudMotion& motion = state.motion;
    return box({.axis = Axis::stack}, state.transit ? portal_veil(*state.transit) : Element{}, motion.rush > 0.0f ? rush_edge(motion.rush, motion.rush_age) : Element{},
               state.hurt ? hurt_edge(*state.hurt, state.hurt_direction, state.menu.options.shake) : Element{},
               placed(minimap(state), motion, DEPTH_MAP), placed(room_progress(state), motion, DEPTH_PROGRESS), placed(tally_cluster(state), motion, DEPTH_TALLY),
               placed(health_cluster(state), motion, DEPTH_HEALTH), placed(dash_slot(state.dash_ready), motion, DEPTH_ABILITY), placed(ammo_cluster(state), motion, DEPTH_AMMO),
               economy_readout(state), boss_readout(state), state.shop ? shop_cards(state) : beat_track(state.beat),
               state.shop ? Element{} : crosshair(pulse, state.on_beat, state.off_beat, state.off_side, state.miss),
               state.hit ? hit_mark(*state.hit) : Element{}, state.timing ? timing_readout(*state.timing) : Element{});
  }
  if (state.menu.screen == Screen::paused || state.menu.screen == Screen::over)
    // 멈춘 장면이 비치는 옅은 막 위에
    return box({.axis = Axis::stack}, box({.fill_x = true, .fill_y = true, .background = VEIL}), scrim(), state.menu.screen == Screen::over ? over_menu(state) : pause_menu(state),
               engine::hud::cursor(state.ui, STONE, INK));
  return box({.axis = Axis::stack}, backdrop(state.backdrop), scrim(), state.lobby.room ? room_menu(state.ui, state.menu, state.lobby) : main_menu(state.ui, state.menu, state.lobby),
             engine::hud::cursor(state.ui, STONE, INK));
}

Element hud_root(const HudState& state) {
  // 화면의 뿌리는 어느 것이나 겹쳐 놓는 상자다 — 성능 표시를 그 맨 위에 얹는다
  Element root = screen_root(state);
  if (state.perf) root.children.push_back(perf_readout(*state.perf));
  return root;
}

float hud_unit(uint32_t surface_width, uint32_t surface_height) {
  // 높이 270 단위를 기준으로 하되, 좁은 화면에서는 메뉴의 틀이 가로로 다 들어가게 줄인다
  constexpr float MENU_SPAN = 2.0f * MARGIN + COLUMN_WIDTH + GUTTER + PANEL_WIDTH;
  return std::max(2.0f, std::min(std::round(static_cast<float>(surface_height) / 270.0f), std::floor(static_cast<float>(surface_width) / MENU_SPAN)));
}

}  // namespace game
