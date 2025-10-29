import GameScene from './GameScene.js'
import { screenSize } from '../gameConfig.json'

export default class Level5Scene extends GameScene {
  constructor() {
    super({ key: 'Level5Scene' })
    
    // 레벨 5 설정: 마스터 난이도
    this.levelConfig = {
      timeLimit: 60,         // 1분! 극한 도전
      trashTypes: 8,         // 모든 8가지 쓰레기 유형 (최종 도전)
      levelName: 'Coral Reef',
      difficulty: 'Master',
      nextLevel: null        // 마지막 레벨
    }
  }

  init() {
    super.init()
    this.timeLeft = this.levelConfig.timeLimit
    // 모든 8가지 쓰레기 유형 사용 (최고 난이도)
    this.trashTypes = this.trashTypes.slice(0, this.levelConfig.trashTypes)
  }

  createUI() {
    super.createUI()
    


    // 최종 도전 힌트 추가
    this.add.text(screenSize.width.value / 2, 120, 
      '🏆 FINAL CHALLENGE 🏆', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)

    this.add.text(screenSize.width.value / 2, 145, 
      'Protect the precious coral reef ecosystem!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fill: '#dc2626',
      stroke: '#ffffff',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5)
  }

  victory() {
    if (this.gameState !== 'playing') return
    
    this.gameState = 'victory'
    this.gameTimer.remove()
    this.victorySound.play()
    
    const victoryBg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2, 
      screenSize.width.value, screenSize.height.value, 0x000000, 0.8)
    victoryBg.setDepth(100)
    
    // 게임 전체 클리어 화면
    const gameCompleteText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 140, 
      '🎉 GAME COMPLETE! 🎉', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      fontStyle: 'bold',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5)
    gameCompleteText.setDepth(102)

    const levelCompleteText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 80, 
      'Coral Reef Protected!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      fill: '#00ff88',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)
    levelCompleteText.setDepth(102)

    const heroText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 30, 
      'You are a true Ocean Hero! 🌊🐢\nAll baby turtles can now swim safely!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)
    heroText.setDepth(102)

    // 업적 텍스트 추가
    const achievementText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 + 20, 
      '⭐ Master Beach Cleaner Achievement Unlocked! ⭐', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5)
    achievementText.setDepth(102)

    this.createFinalVictoryButtons()
  }

  createFinalVictoryButtons() {
    const buttonY = screenSize.height.value / 2 + 80
    
    // 레벨 선택 버튼으로 돌아가기
    const selectButton = this.add.text(screenSize.width.value / 2 - 100, buttonY, 
      'Level Select', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#4f46e5',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    selectButton.setDepth(103)

    // 최종 레벨 다시 플레이 버튼
    const retryButton = this.add.text(screenSize.width.value / 2 + 100, buttonY, 
      'Play Again', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    retryButton.setDepth(103)

    // 메인 메뉴 버튼
    const menuButton = this.add.text(screenSize.width.value / 2, buttonY + 60, 
      'Main Menu', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#22d3ee',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive()
    menuButton.setDepth(103)

    // 호버 효과 설정 - 배열 참조 문제 방지를 위해 개별적으로 설정
    selectButton.on('pointerover', () => selectButton.setScale(1.1))
    selectButton.on('pointerout', () => selectButton.setScale(1.0))
    
    retryButton.on('pointerover', () => retryButton.setScale(1.1))
    retryButton.on('pointerout', () => retryButton.setScale(1.0))
    
    menuButton.on('pointerover', () => menuButton.setScale(1.1))
    menuButton.on('pointerout', () => menuButton.setScale(1.0))

    selectButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start('LevelSelectScene')
    })

    retryButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.restart()
    })

    menuButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start('MainMenuScene')
    })
  }
}