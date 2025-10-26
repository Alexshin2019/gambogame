import Phaser from 'phaser'
import { screenSize, audioConfig } from '../gameConfig.json'

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  preload() {
    // 加载关卡选择需要的基本素材
    this.load.image('game_title', 'https://cdn-game-mcp.gambo.ai/25bdbb7e-45fb-4a10-b4bb-67a02130a8c1/images/beach_turtle_rescue_clean_title.png')
    this.load.image('light_beach_background', 'https://cdn-game-mcp.gambo.ai/bf5765c0-5f4f-4a10-87e6-36110dc164d6/images/light_beach_background.png')
    this.load.image('bright_ocean_with_waves', 'https://cdn-game-mcp.gambo.ai/83f1cc87-b76a-4e49-9b13-44668b076d68/images/bright_ocean_with_waves.png')
    this.load.audio('ui_click_sound', 'https://cdn-game-mcp.gambo.ai/2920f481-4ba2-4d99-a642-ed801b40dd27/sound_effects/ui_click_sound.mp3')
    this.load.audio('summer_beach_vibes', 'https://cdn-game-mcp.gambo.ai/3b6e0a8a-2760-4764-9a35-dc48fd252e1f/music/summer_beach_vibes.wav')
  }

  create() {
    // 创建背景
    this.createBackground()
    
    // 初始化音频
    this.initAudio()
    
    // 创建UI
    this.createUI()
    
    // 播放背景音乐
    this.backgroundMusic.play()
  }

  createBackground() {
    // 沙滩背景
    this.beachBackground = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'light_beach_background')
    const beachScaleX = screenSize.width.value / this.beachBackground.width
    const beachScaleY = screenSize.height.value / this.beachBackground.height
    const beachScale = Math.max(beachScaleX, beachScaleY)
    this.beachBackground.setScale(beachScale)
    
    // 海面图层
    this.oceanLayer = this.add.image(screenSize.width.value / 2 - 5, -25, 'bright_ocean_with_waves')
    this.oceanLayer.setOrigin(0.5, 0)
    const oceanScaleX = screenSize.width.value / this.oceanLayer.width
    const targetOceanHeight = screenSize.height.value / 5
    const oceanScaleY = targetOceanHeight / this.oceanLayer.height
    const oceanScale = Math.max(oceanScaleX, oceanScaleY)
    this.oceanLayer.setScale(oceanScale)
    
    // 潮汐动画
    this.tweens.add({
      targets: this.oceanLayer,
      y: this.oceanLayer.y - 8,
      duration: 6000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  initAudio() {
    this.uiClickSound = this.sound.add('ui_click_sound', { volume: audioConfig.soundVolume.value })
    this.backgroundMusic = this.sound.add('summer_beach_vibes', { 
      volume: audioConfig.musicVolume.value * 0.3,
      loop: true 
    })
  }

  createUI() {
    // 标题
    this.add.text(screenSize.width.value / 2, 80, 'Select Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)

    // 关卡按钮
    this.createLevelButtons()

    // 返回按钮
    const backButton = this.add.text(100, screenSize.height.value - 50, '← Back to Menu', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#6b7280',
      stroke: '#ffffff',
      strokeThickness: 2
    }).setOrigin(0.5).setInteractive()

    backButton.on('pointerover', () => backButton.setScale(1.1))
    backButton.on('pointerout', () => backButton.setScale(1.0))
    
    backButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start('MainMenuScene')
    })
  }

  createLevelButtons() {
    const levels = [
      {
        number: 1,
        name: 'Beach Cleanup',
        difficulty: 'Easy',
        time: '3:00',
        description: 'Learn the basics of turtle rescue',
        scene: 'Level1Scene',
        color: '#10b981'
      },
      {
        number: 2,
        name: 'Tidal Pool',
        difficulty: 'Medium',
        time: '2:30',
        description: 'More trash types appear',
        scene: 'Level2Scene',
        color: '#f59e0b'
      },
      {
        number: 3,
        name: 'Rocky Shore',
        difficulty: 'Hard',
        time: '2:00',
        description: 'All trash types present',
        scene: 'Level3Scene',
        color: '#dc2626'
      },
      {
        number: 4,
        name: 'Storm Cleanup',
        difficulty: 'Expert',
        time: '1:30',
        description: 'Post-storm emergency',
        scene: 'Level4Scene',
        color: '#7c2d12'
      },
      {
        number: 5,
        name: 'Coral Reef',
        difficulty: 'Master',
        time: '1:00',
        description: 'Ultimate challenge!',
        scene: 'Level5Scene',
        color: '#581c87'
      }
    ]

    const startX = screenSize.width.value / 2 - 200
    const startY = 180
    const buttonWidth = 380
    const buttonHeight = 80
    const spacing = 95

    levels.forEach((level, index) => {
      const x = startX
      const y = startY + index * spacing

      // 创建按钮背景
      const buttonBg = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x000000, 0.6)
      buttonBg.setStrokeStyle(3, level.color)
      buttonBg.setInteractive()

      // 关卡编号
      const levelNumber = this.add.text(x - 160, y, level.number.toString(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        fill: level.color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5)

      // 关卡名称
      const levelName = this.add.text(x - 50, y - 15, level.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1
      }).setOrigin(0.5)

      // 难度和时间
      const difficultyText = this.add.text(x - 50, y + 8, `${level.difficulty} • ${level.time}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fill: level.color,
        stroke: '#000000',
        strokeThickness: 1
      }).setOrigin(0.5)

      // 描述
      const descriptionText = this.add.text(x - 50, y + 25, level.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fill: '#d1d5db',
        stroke: '#000000',
        strokeThickness: 1
      }).setOrigin(0.5)

      // Play按钮
      const playButton = this.add.text(x + 120, y, 'PLAY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        fill: level.color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setInteractive()

      // 悬停效果 - 避免数组引用问题
      buttonBg.on('pointerover', () => {
        buttonBg.setScale(1.05)
        levelNumber.setScale(1.05)
        levelName.setScale(1.05)
        difficultyText.setScale(1.05)
        descriptionText.setScale(1.05)
        playButton.setScale(1.05)
        buttonBg.setFillStyle(parseInt(level.color.replace('#', '0x')), 0.2)
      })

      buttonBg.on('pointerout', () => {
        buttonBg.setScale(1.0)
        levelNumber.setScale(1.0)
        levelName.setScale(1.0)
        difficultyText.setScale(1.0)
        descriptionText.setScale(1.0)
        playButton.setScale(1.0)
        buttonBg.setFillStyle(0x000000, 0.6)
      })

      playButton.on('pointerover', () => {
        playButton.setScale(1.2)
      })

      playButton.on('pointerout', () => {
        playButton.setScale(1.0)
      })

      // 点击事件
      const clickHandler = () => {
        this.uiClickSound.play()
        this.scene.start(level.scene)
      }

      buttonBg.on('pointerdown', clickHandler)
      playButton.on('pointerdown', clickHandler)
    })
  }
}