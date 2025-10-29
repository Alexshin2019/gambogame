import Phaser from 'phaser'
import { screenSize, audioConfig } from '../gameConfig.json'

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  preload() {
    // 모든 리소스는 LoadingScene에서 로드 완료되었으므로 여기서는 다시 로드할 필요가 없습니다.
  }

  create() {
    // 배경 생성
    this.createBackground()
    
    // 오디오 초기화
    this.initAudio()
    
    // UI 생성
    this.createUI()
    
    // 배경 음악 재생
    this.backgroundMusic.play()
  }
  
  update() {
    // 키보드 감지는 필요 없으며, 모든 상호작용은 버튼을 통해 이루어집니다.
  }
  
  startGame() {
    this.uiClickSound.play()
    this.scene.start('Level1Scene')
  }

  createBackground() {
    // 새로운 시작 페이지 배경 이미지 (텍스트 없음)
    this.titleBackground = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'beach_turtle_rescue_title_background_no_text')
    
    // 화면에 맞게 확대/축소 비율 계산 (이미지 비율 유지)
    const bgScaleX = screenSize.width.value / 1536 // 이미지 원본 너비는 1536
    const bgScaleY = screenSize.height.value / 1024 // 이미지 원본 높이는 1024
    const bgScale = Math.max(bgScaleX, bgScaleY) // 화면을 완전히 덮도록 더 큰 확대/축소 비율 사용
    this.titleBackground.setScale(bgScale)
  }

  initAudio() {
    this.uiClickSound = this.sound.add('ui_click_sound', { volume: audioConfig.soundVolume.value })
    this.backgroundMusic = this.sound.add('summer_beach_vibes', {
      volume: audioConfig.musicVolume.value * 0.3,
      loop: true
    })
  }

  createUI() {
    // 배경 이미지에 이미 게임 제목이 포함되어 있으므로 이제 두 개의 명확한 버튼을 만듭니다.
    this.createMainButtons()
  }

  createMainButtons() {
    // 화면 중앙 하단에 두 개의 아름다운 메인 버튼을 만듭니다.
    const centerX = screenSize.width.value / 2
    const buttonY = screenSize.height.value * 0.72
    const buttonSpacing = 220

    // 시작 버튼 생성
    const startButton = this.createBeautifulButton(centerX - buttonSpacing/2, buttonY, 'START GAME', '#00d4aa', '#ffffff', () => {
      this.startGame()
    })

    // 게임 방법 버튼 생성
    const howToPlayButton = this.createBeautifulButton(centerX + buttonSpacing/2, buttonY, 'HOW TO PLAY', '#4a90e2', '#ffffff', () => {
      this.showHowToPlay()
    })
  }

  createBeautifulButton(x, y, text, bgColor, textColor, onClick) {
    // 버튼 컨테이너 생성
    const buttonContainer = this.add.container(x, y)
    
    // 버튼 크기
    const buttonWidth = 180
    const buttonHeight = 60
    const cornerRadius = 15
    
    // 버튼 배경 그래픽 생성
    const buttonBg = this.add.graphics()
    
    // 메인 배경색 (그라데이션 효과는 다중 레이어로 구현)
    buttonBg.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color)
    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
    
    // 하이라이트 효과 추가 (상단 밝은 테두리)
    const highlight = this.add.graphics()
    highlight.lineStyle(3, 0xffffff, 0.4)
    highlight.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
    
    // 그림자 효과 추가 (하단 어두운 테두리)
    const shadow = this.add.graphics()
    shadow.lineStyle(2, 0x000000, 0.3)
    shadow.strokeRoundedRect(-buttonWidth/2 + 1, -buttonHeight/2 + 1, buttonWidth, buttonHeight, cornerRadius)
    
    // 버튼 텍스트 생성
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: text === 'START GAME' ? '20px' : '18px',
      fontStyle: 'bold',
      fill: textColor,
      align: 'center'
    }).setOrigin(0.5)
    
    // 텍스트 그림자 효과
    buttonText.setStroke('#000000', 4)
    buttonText.setShadow(2, 2, '#000000', 0.5)
    
    // 모든 요소를 컨테이너에 추가
    buttonContainer.add([shadow, buttonBg, highlight, buttonText])
    buttonContainer.setSize(buttonWidth, buttonHeight)
    buttonContainer.setInteractive()
    
    // 복원을 위해 원래 색상 저장
    const originalColor = Phaser.Display.Color.HexStringToColor(bgColor).color
    const hoverColor = Phaser.Display.Color.HexStringToColor(bgColor).lighten(20).color
    const pressColor = Phaser.Display.Color.HexStringToColor(bgColor).darken(20).color
    
    // 인터랙티브 효과 추가
    buttonContainer.on('pointerover', () => {
      // 호버 효과: 버튼 밝아지고, 약간 확대되며, 맥박 효과 추가
      buttonBg.clear()
      buttonBg.fillStyle(hoverColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(1.05)
      buttonText.setTint(0xffff99)
      
      // 발광 맥박 효과 추가
      this.tweens.add({
        targets: highlight,
        alpha: 0.8,
        duration: 300,
        yoyo: true,
        repeat: -1
      })
    })

    buttonContainer.on('pointerout', () => {
      // 원래 상태로 복원
      buttonBg.clear()
      buttonBg.fillStyle(originalColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(1.0)
      buttonText.clearTint()
      
      // 맥박 효과 중지
      this.tweens.killTweensOf(highlight)
      highlight.setAlpha(1)
    })

    buttonContainer.on('pointerdown', () => {
      // 누르는 효과: 버튼 어두워지고, 축소됨
      buttonBg.clear()
      buttonBg.fillStyle(pressColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(0.95)
      
      // 음향 효과 재생
      if (this.uiClickSound) {
        this.uiClickSound.play()
      }
      
      // 클릭 콜백 실행
      onClick()
      
      // 버튼 상태 복원
      this.time.delayedCall(150, () => {
        buttonBg.clear()
        buttonBg.fillStyle(originalColor)
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
        buttonContainer.setScale(1.0)
      })
    })

    // 진입 애니메이션 추가
    buttonContainer.setAlpha(0)
    buttonContainer.setScale(0.5)
    this.tweens.add({
      targets: buttonContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
      delay: text === 'START GAME' ? 200 : 400 // 버튼 순서대로 나타남
    })

    return buttonContainer
  }

  showHowToPlay() {
    // 설명 화면 생성
    const bg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2,
      screenSize.width.value, screenSize.height.value, 0x000000, 0.8)

    const instructions = `HOW TO PLAY

🎯 OBJECTIVE:
Match 3 or more trash pieces to clean the beach
and help baby turtles reach the sea safely!

🎮 CONTROLS:
• Click and drag to swap adjacent trash
• Create matches of 3+ identical items
• Clear trash to make turtles move forward

🐢 TURTLE RESCUE:
• Each match helps turtles progress
• Get all turtles to the ocean to win!
• Combo matches give extra progress

⏰ TIME LIMIT:
• Complete each level before time runs out
• Different levels have different time limits

Good luck, Ocean Hero! 🌊`

    const instructionText = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 50, instructions, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: screenSize.width.value - 100 }
    }).setOrigin(0.5)

    const closeButton = this.createBeautifulButton(screenSize.width.value / 2, screenSize.height.value / 2 + 200, 'GOT IT!', '#00d4aa', '#ffffff', () => {
      bg.destroy()
      instructionText.destroy()
      closeButton.destroy()
    })
  }
}