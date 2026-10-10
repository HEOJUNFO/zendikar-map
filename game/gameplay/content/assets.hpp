#pragma once

#include <cstddef>
#include <span>

// 게임 에셋 — 빌드에 묻힌 데이터 (방 표면의 텍스처와 소품, 손에 드는 무기는 여기 없다: 에셋 팩으로 따로 나가 실행 중에 받는다 — presentation/scenery).
// 메시의 원본은 content/meshes/*.mesh.txt (tools/meshc.mjs 가 .meshbin 으로 옮긴다),
// 글꼴은 Pretendard(npm pretendard, SIL OFL)를 tools/fontc.mjs 가 구운 .fontbin, 그림은 content/images 의 PNG 를 tools/imagec.mjs 가 옮긴 QOI,
// 소리는 content/audio 의 WAV 와 악보를 tools/samplec.mjs·songc.mjs 가 옮긴 샘플 뱅크와 곡이다.
// 지도 데이터(src/data)와는 따로다: 여기 것은 공식 설정이 아니라 이 게임이 지어낸 것이다.
namespace game::assets {

// 메시 — 방의 조각(room·sealed·gate)은 겉면 메시라 engine::SurfaceMesh::decode 로, 나머지는 색 메시라 engine::StaticMesh::decode 로 푼다
/** 방의 틀 — 0 은 시작 방, 1 부터가 전투방 틀 (domain/dungeon.hpp 의 Room::shape). 없는 번호면 비어 있다 */
std::span<const std::byte> room(unsigned shape);
/** 문 자리에 서는 조각 — 문이 나지 않은 문 자리를 메운 막음돌, 잠긴 문을 막는 룬 석판 */
std::span<const std::byte> sealed();
std::span<const std::byte> gate();
/** 적 — 근접 돌진형(유적의 돌 정령), 원거리형(깨어난 헤드론 조각)과 그 투사체 */
std::span<const std::byte> enemy_bolt();
/** 창 밖의 원경 — 하늘에 뜬 헤드론과 유적 조각 */
std::span<const std::byte> skyclave_backdrop();
/**
 * 화면 글자(HUD)의 글꼴 (engine::hud::Font::decode 로 푼다) — 면 셋:
 * 0 Regular (영문·숫자·기호와 완성형 한글 2,350 자) · 1 Bold (content/fonts/bold.txt 의 글자) · 2 큰 글자용 Bold (content/fonts/display.txt 의 글자)
 */
std::span<const std::byte> hud_font();
/**
 * 소리의 재료 — 드럼과 효과음 샘플 (engine::audio::Bank::decode 로 푼다). 원본은 content/audio/samples 의 WAV 이고 이름은 content/audio/samples.txt,
 * 출처와 라이선스는 content/audio/CREDITS.md 에 있다 (tools/samplec.mjs 가 QOA 로 눌러 옮긴다)
 */
std::span<const std::byte> sample_bank();
/** 게임 중의 드럼 (engine::audio::Song::decode 로 푼다 — 샘플 번호는 sample_bank 의 것). 원본은 content/audio/music/pulse.song.txt (tools/songc.mjs) */
std::span<const std::byte> pulse_song();
/** 메인 메뉴의 배경 그림 (engine::hud::Bitmap::decode 로 푼다). 그림 없이 빌드했으면 비어 있다 */
std::span<const std::byte> menu_background();

}  // namespace game::assets
