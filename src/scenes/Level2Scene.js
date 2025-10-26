import GameScene from './GameScene.js'
import { screenSize } from '../gameConfig.json'

export default class Level2Scene extends GameScene {
  constructor() {
    super({ key: 'Level2Scene' })
    
    // 关卡2配置：中等难度
    this.levelConfig = {
      timeLimit: 150,        // 2.5分钟
      trashTypes: 5,         // 5种垃圾
      levelName: 'Tidal Pool',
      difficulty: 'Medium',
      nextLevel: 'Level3Scene'
    }
  }

  init() {
    super.init()
    this.timeLeft = this.levelConfig.timeLimit
    this.trashTypes = this.trashTypes.slice(0, this.levelConfig.trashTypes)
  }

  createUI() {
    super.createUI()
    // 关卡信息文字已删除，保持UI清爽
  }

  victory() {
    if (this.gameState !== 'playing') return
    
    this.gameState = 'victory'
    this.gameTimer.remove()
    this.victorySound.play()
    
    const victoryBg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2, 
      screenSize.width.value, screenSize.height.value, 0x000000, 0.8)
    victoryBg.setDepth(100)
    
    const titleText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 120, 
      `${this.levelConfig.levelName} Complete!`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#00ff88',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5)
    titleText.setDepth(102)

    const descText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 60, 
      'The tidal pool is clean and safe for marine life!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)
    descText.setDepth(102)

    this.createVictoryButtons()
  }

  createVictoryButtons() {
    const buttonY = screenSize.height.value / 2 + 40
    
    const nextButton = this.add.text(screenSize.width.value / 2 - 120, buttonY, 
      'Next Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    nextButton.setDepth(103)

    const selectButton = this.add.text(screenSize.width.value / 2 + 120, buttonY, 
      'Level Select', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#4f46e5',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    selectButton.setDepth(103)

    const retryButton = this.add.text(screenSize.width.value / 2, buttonY + 60, 
      'Play Again', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    retryButton.setDepth(103)

    // 设置悬停效果 - 分别设置以避免数组引用问题
    nextButton.on('pointerover', () => nextButton.setScale(1.1))
    nextButton.on('pointerout', () => nextButton.setScale(1.0))
    
    selectButton.on('pointerover', () => selectButton.setScale(1.1))
    selectButton.on('pointerout', () => selectButton.setScale(1.0))
    
    retryButton.on('pointerover', () => retryButton.setScale(1.1))
    retryButton.on('pointerout', () => retryButton.setScale(1.0))

    nextButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start(this.levelConfig.nextLevel)
    })

    selectButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start('LevelSelectScene')
    })

    retryButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.restart()
    })
  }
}