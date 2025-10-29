import Phaser from 'phaser'
import { screenSize, audioConfig, loadingConfig } from '../gameConfig.json'

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' })
    this.loadingProgress = 0
    this.penguinIcons = []
    this.blackScreenDuration = loadingConfig.blackScreenDuration.value // 검은 화면 대기 시간 (밀리초)
    this.enableBlackScreen = loadingConfig.enableBlackScreen.value // 검은 화면 대기 단계 활성화 여부
  }

  preload() {
    // preload 단계에서 로딩 화면에 필요한 기본 자료를 먼저 로드합니다.
    this.load.image('loading_screen_background', 'https://cdn-game-mcp.gambo.ai/68695e6c-a5b6-4e9d-a9dc-a6cf1fe21719/images/loading_screen_background.png')
    this.load.image('loading_penguin_icon', 'https://cdn-game-mcp.gambo.ai/winter-theme/loading_penguin_icon.png')
    
    // 기본 자료 로드가 완료된 후 로딩 화면을 생성합니다.
    this.load.once('complete', () => {
      this.createLoadingUI()
      // 게임 리소스 로드를 지연하여 검은 화면 대기 효과를 구현합니다.
      this.startDelayedGameLoading()
    })
  }

  startDelayedGameLoading() {
    if (this.enableBlackScreen) {
      // 검은 화면 대기가 활성화된 경우, 지정된 시간 지연 후 게임 리소스 로드를 시작합니다.
      this.time.delayedCall(this.blackScreenDuration, () => {
        this.loadGameAssets()
      })
    } else {
      // 그렇지 않으면 즉시 게임 리소스 로드를 시작합니다.
      this.loadGameAssets()
    }
  }

  createLoadingUI() {
    // 로딩 화면 배경 생성
    this.createBackground()
    
    // 로딩 애니메이션 및 진행률 표시 생성
    this.createLoadingAnimation()
    
    // 진행률 표시줄 생성
    this.createProgressBar()
    
    // 로딩 텍스트 생성
    this.createLoadingText()
    
    // 검은 화면 대기가 활성화된 경우, 대기 상태 표시
    if (this.enableBlackScreen) {
      this.setWaitingState()
    }
  }

  setWaitingState() {
    // 대기하는 동안 로딩 상태 텍스트를 대기 상태로 업데이트합니다.
    this.loadingStatus.setText('Preparing game...')
    
    // 대기 점 애니메이션 생성
    this.createWaitingDots()
  }

  createWaitingDots() {
    let dotCount = 0
    this.waitingDotTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        dotCount = (dotCount + 1) % 4
        const dots = '.'.repeat(dotCount)
        this.loadingStatus.setText(`Preparing game${dots}`)
      },
      loop: true
    })
  }

  createBackground() {
    // 로딩 화면 배경 생성
    this.background = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'loading_screen_background')
    
    // 화면에 맞게 확대/축소 비율 계산
    const bgScaleX = screenSize.width.value / 1536
    const bgScaleY = screenSize.height.value / 1024
    const bgScale = Math.max(bgScaleX, bgScaleY)
    this.background.setScale(bgScale)
  }

  createLoadingAnimation() {
    // 로딩 애니메이션에 사용할 작은 거북이 아이콘 생성
    const centerX = screenSize.width.value / 2
    const centerY = screenSize.height.value / 2
    
    // 메인 펭귄 아이콘
    this.mainPenguin = this.add.image(centerX, centerY - 50, 'loading_penguin_icon')
    
    // 펭귄 아이콘 확대/축소 계산
    const penguinScale = 0.2 // 적당한 크기
    this.mainPenguin.setScale(penguinScale)
    
    // 펭귄이 천천히 회전하는 애니메이션 생성
    this.tweens.add({
      targets: this.mainPenguin,
      rotation: Math.PI * 2,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    })
    
    // 위아래로 움직이는 애니메이션 생성
    this.tweens.add({
      targets: this.mainPenguin,
      y: centerY - 30,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // 메인 펭귄 주위를 도는 작은 펭귄들 생성
    this.createOrbitalPenguins(centerX, centerY - 50)
  }

  createOrbitalPenguins(centerX, centerY) {
    const numPenguins = 5
    const radius = 100
    
    for (let i = 0; i < numPenguins; i++) {
      const angle = (i / numPenguins) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      const penguin = this.add.image(x, y, 'loading_penguin_icon')
      penguin.setScale(0.08) // 더 작은 크기
      penguin.setAlpha(0.6) // 반투명 효과
      
      this.penguinIcons.push(penguin)
      
      // 각 작은 펭귄이 중심을 중심으로 회전하지만 속도는 다릅니다.
      this.tweens.add({
        targets: penguin,
        rotation: Math.PI * 2,
        duration: 4000 + i * 500, // 다른 속도
        repeat: -1,
        ease: 'Linear'
      })
      
      // 궤도 운동
      this.tweens.add({
        targets: turtle,
        x: centerX + Math.cos(angle + Math.PI * 2) * radius,
        y: centerY + Math.sin(angle + Math.PI * 2) * radius,
        duration: 8000,
        repeat: -1,
        ease: 'Linear',
        onUpdate: (tween) => {
          const progress = tween.progress
          const currentAngle = angle + progress * Math.PI * 2
          turtle.x = centerX + Math.cos(currentAngle) * radius
          turtle.y = centerY + Math.sin(currentAngle) * radius
        }
      })
    }
  }

  createProgressBar() {
    const centerX = screenSize.width.value / 2
    const centerY = screenSize.height.value / 2
    
    // 진행률 표시줄 위치
    const barY = centerY + 120
    const barWidth = 400
    const barHeight = 20
    
    // 진행률 표시줄 배경
    this.progressBg = this.add.rectangle(centerX, barY, barWidth, barHeight, 0x2c3e50)
    this.progressBg.setStrokeStyle(3, 0x34495e)
    
    // 진행률 표시줄 채우기
    this.progressBar = this.add.rectangle(centerX - barWidth/2, barY, 0, barHeight - 4, 0x3498db)
    this.progressBar.setOrigin(0, 0.5)
    
    // 진행률 표시줄 광택 효과
    this.progressGlow = this.add.rectangle(centerX - barWidth/2, barY, 0, barHeight - 4, 0x5dade2)
    this.progressGlow.setOrigin(0, 0.5)
    this.progressGlow.setAlpha(0.7)
    
    // 진행률 백분율 텍스트
    this.progressText = this.add.text(centerX, barY + 40, '0%', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      fill: '#2c3e50',
      align: 'center'
    }).setOrigin(0.5)
    
    // 텍스트 그림자 추가
    this.progressText.setStroke('#ffffff', 4)
    this.progressText.setShadow(2, 2, '#000000', 0.3)
  }

  createLoadingText() {
    const centerX = screenSize.width.value / 2
    const centerY = screenSize.height.value / 2
    
    // 메인 로딩 텍스트
    this.loadingTitle = this.add.text(centerX, centerY - 150, 'Beach Turtle Rescue', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      fill: '#2c3e50',
      align: 'center'
    }).setOrigin(0.5)
    
    this.loadingTitle.setStroke('#ffffff', 6)
    this.loadingTitle.setShadow(3, 3, '#000000', 0.5)
    
    // 로딩 상태 텍스트
    this.loadingStatus = this.add.text(centerX, centerY + 200, 'Loading game assets...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fill: '#7f8c8d',
      align: 'center'
    }).setOrigin(0.5)
    
    // 로딩 점 애니메이션 생성
    this.createLoadingDots()
  }

  createLoadingDots() {
    // 상태 텍스트 뒤에 동적인 점 효과 추가
    this.loadingDots = 0
    this.loadingTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.loadingDots = (this.loadingDots + 1) % 4
        const dots = '.'.repeat(this.loadingDots)
        // 대기 상태가 아닐 때만 "Loading game assets"으로 업데이트
        if (!this.enableBlackScreen || this.load.isLoading()) {
          this.loadingStatus.setText(`Loading game assets${dots}`)
        }
      },
      loop: true
    })
  }

  loadGameAssets() {
    // 대기 단계의 점 애니메이션 정리
    if (this.waitingDotTimer) {
      this.waitingDotTimer.destroy()
    }
    
    // 상태 텍스트를 로딩 중으로 업데이트
    this.loadingStatus.setText('Loading game assets...')
    
    // 게임 리소스를 로드할 새로운 로더 생성
    const gameLoader = this.load
    
    // 로딩 진행 상황 감지
    gameLoader.on('progress', (progress) => {
      this.updateProgress(progress * 100)
    })
    
    gameLoader.on('complete', () => {
      this.onLoadComplete()
    })
    
    // 모든 게임에 필요한 자료 로드
    this.loadAllGameAssets(gameLoader)
    
    // 로드 시작
    gameLoader.start()
  }

  loadAllGameAssets(loader) {
    // Load asset pack by type
    this.load.pack('assetPack', '/assets/asset-pack.json')
  }

  updateProgress(progress) {
    this.loadingProgress = Math.min(progress, 100)
    
    // 진행률 표시줄 업데이트
    const barWidth = 400
    const fillWidth = (this.loadingProgress / 100) * barWidth
    
    this.progressBar.width = fillWidth
    this.progressGlow.width = fillWidth
    
    // 백분율 텍스트 업데이트
    this.progressText.setText(`${Math.floor(this.loadingProgress)}%`)
    
    // 진행률 표시줄 채우기 애니메이션 추가
    if (fillWidth > 0) {
      this.tweens.add({
        targets: this.progressGlow,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      })
    }
    
    // 진행률에 따라 로딩 상태 텍스트 업데이트
    if (this.loadingProgress < 25) {
      this.updateLoadingStatus('Loading backgrounds')
    } else if (this.loadingProgress < 50) {
      this.updateLoadingStatus('Loading characters')
    } else if (this.loadingProgress < 75) {
      this.updateLoadingStatus('Loading game assets')
    } else if (this.loadingProgress < 100) {
      this.updateLoadingStatus('Loading audio')
    } else {
      this.updateLoadingStatus('Ready to play!')
    }
  }

  updateLoadingStatus(status) {
    if (this.loadingStatus && this.loadingStatus.text !== status) {
      this.loadingStatus.setText(status)
    }
  }

  onLoadComplete() {
    // 로딩 점 애니메이션 중지
    if (this.loadingTimer) {
      this.loadingTimer.destroy()
    }
    
    // 최종 상태 업데이트
    this.updateProgress(100)
    this.loadingStatus.setText('Loading complete!')
    
    // 완료 애니메이션 추가
    this.tweens.add({
      targets: [this.mainTurtle, ...this.turtleIcons],
      scale: { from: this.mainTurtle.scale, to: this.mainTurtle.scale * 1.2 },
      duration: 500,
      yoyo: true,
      ease: 'Back.easeOut'
    })
    
    // 짧은 지연 후 메인 메뉴로 이동
    this.time.delayedCall(1500, () => {
      this.scene.start('MainMenuScene')
    })
  }
}