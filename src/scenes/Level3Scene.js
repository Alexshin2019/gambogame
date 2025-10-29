import GameScene from './GameScene.js'
import { screenSize } from '../gameConfig.json'

export default class Level3Scene extends GameScene {
  constructor() {
    super({ key: 'Level3Scene' })
    
    // 레벨 3 설정: 어려움 난이도
    this.levelConfig = {
      timeLimit: 120,        // 2분
      trashTypes: 7,         // 7가지 쓰레기 사용, 난이도 증가
      levelName: 'Rocky Shore',
      difficulty: 'Hard',
      nextLevel: 'Level4Scene'
    }
  }

  init() {
    super.init()
    this.timeLeft = this.levelConfig.timeLimit
    // 모든 쓰레기 유형 사용
    // 7가지 쓰레기 유형 사용 (이전 6가지 + 유리병)
    this.trashTypes = this.trashTypes.slice(0, this.levelConfig.trashTypes)
  }

  createUI() {
    super.createUI()
    // 레벨 정보 텍스트 삭제됨, UI 깔끔하게 유지
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
      'The rocky shore is now pristine and turtle-safe!', {
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

    // 호버 효과 설정 - 배열 참조 문제 방지를 위해 개별적으로 설정
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