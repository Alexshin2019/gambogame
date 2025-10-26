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
    LoadingScene,       // 加载界面（启动场景）
    MainMenuScene,      // 主菜单
    LevelSelectScene,   // 关卡选择
    GameScene,          // 原始游戏场景（保留向后兼容）
    Level1Scene,        // 关卡1：海滩清理
    Level2Scene,        // 关卡2：潮池
    Level3Scene,        // 关卡3：岩石海岸
    Level4Scene,        // 关卡4：暴风雨清理
    Level5Scene         // 关卡5：珊瑚礁
  ],
}

export default new Phaser.Game(config)
