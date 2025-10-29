import Phaser from "phaser"
import LoadingScene from "./scenes/LoadingScene"
import MainMenuScene from "./scenes/MainMenuScene"
import LevelSelectScene from "./scenes/LevelSelectScene"
import GameScene from "./scenes/GameScene"
import Level1Scene from "./scenes/Level1Scene"
import Level2Scene from "./scenes/Level2Scene"
import Level3Scene from "./scenes/Level3Scene"
import Level4Scene from "./scenes/Level4Scene"
import Level5Scene from "./scenes/Level5Scene"
import { screenSize, debugConfig, renderConfig } from "./gameConfig.json"

const config = {
  type: Phaser.AUTO,
  width: screenSize.width.value,
  height: screenSize.height.value,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      fps: 120,
      debug: debugConfig.debug.value,
      debugShowBody: debugConfig.debugShowBody.value,
      debugShowStaticBody: debugConfig.debugShowStaticBody.value,
      debugShowVelocity: debugConfig.debugShowVelocity.value,
    },
  },
  pixelArt: renderConfig.pixelArt.value,
  scene: [
    LoadingScene,       // 로딩 화면 (시작 장면)
    MainMenuScene,      // 메인 메뉴
    LevelSelectScene,   // 레벨 선택
    GameScene,          // 원본 게임 장면 (하위 호환성 유지)
    Level1Scene,        // 레벨 1: 해변 청소
    Level2Scene,        // 레벨 2: 갯벌
    Level3Scene,        // 레벨 3: 바위 해안
    Level4Scene,        // 레벨 4: 폭풍우 청소
    Level5Scene         // 레벨 5: 산호초
  ],
}

export default new Phaser.Game(config)
