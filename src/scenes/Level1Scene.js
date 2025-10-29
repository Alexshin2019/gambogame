import GameScene from './GameScene.js'
import { screenSize } from '../gameConfig.json'

export default class Level1Scene extends GameScene {
  constructor() {
    super({ key: 'Level1Scene' })
    
    // 레벨 1 설정: 쉬움 난이도 (겨울 빙하 테마)
    this.levelConfig = {
      timeLimit: 180,        // 3분
      trashTypes: 4,         // 4가지 쓰레기만, 매칭 단순화
      levelName: 'Ice Cleanup',
      difficulty: 'Easy',
      nextLevel: 'Level2Scene',
      background: 'snowy_ice_background'
    }
  }

  init() {
    super.init()
    // 기본 설정을 레벨 구성으로 덮어씁니다.
    this.timeLeft = this.levelConfig.timeLimit
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
    
    // 승리 화면 생성 - 낮은 깊이 설정
    const victoryBg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2, 
      screenSize.width.value, screenSize.height.value, 0x000000, 0.8)
    victoryBg.setDepth(100)
    
    // 제목 텍스트 - 가시성을 위해 더 높은 깊이 설정
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

    // 설명 텍스트 - 더 높은 깊이 설정
    const descText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 60, 
      'All baby turtles have reached the sea safely!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)
    descText.setDepth(102)

    // 버튼 추가
    this.createVictoryButtons()
  }

  createVictoryButtons() {
    const buttonY = screenSize.height.value / 2 + 40
    
    // 다음 레벨 버튼
    const nextButton = this.add.text(screenSize.width.value / 2 - 120, buttonY, 
      'Next Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    nextButton.setDepth(103)

    // 레벨 선택 버튼으로 돌아가기
    const selectButton = this.add.text(screenSize.width.value / 2 + 120, buttonY, 
      'Level Select', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#4f46e5',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    selectButton.setDepth(103)

    // 다시 플레이 버튼
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