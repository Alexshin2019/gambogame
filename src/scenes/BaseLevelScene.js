import Phaser from "phaser"
import { gameConfig, penguinConfig, audioConfig, screenSize } from '../gameConfig.json'

export default class BaseLevelScene extends Phaser.Scene {
  constructor(config) {
    super(config)
    
    // 게임 영역 위치 (고정값)
    this.gridRows = gameConfig.gridRows.value
    this.gridCols = gameConfig.gridCols.value
    this.cellSize = gameConfig.cellSize.value
    this.gameAreaX = (screenSize.width.value - this.gridCols * this.cellSize) / 2
    this.gameAreaY = 200
    this.trashTypes = ['front_view_trash_tile_plastic_bottle', 'front_view_trash_tile_plastic_bag', 'front_view_trash_tile_soda_can', 'front_view_trash_tile_food_wrapper', 'front_view_trash_tile_cigarette_butt', 'front_view_trash_tile_paper_cup', 'front_view_trash_tile_glass_bottle', 'front_view_trash_tile_aluminum_foil']
  }

  // 레벨 설정 - 서브클래스에서 재정의 필요
  getLevelConfig() {
    return {
      timeLimit: 180,        // 시간 제한 (초)
      trashTypes: 8,         // 쓰레기 종류 수
      minMatchCount: 3,      // 최소 일치 수
      penguinCount: 6,        // 펭귄 수
      background: 'light_beach_background',
      levelName: 'Base Level',
      difficulty: 'Easy'
    }
  }

  init() {
    // 레벨 설정 가져오기
    this.levelConfig = this.getLevelConfig()
    
    // 모든 게임 상태 변수 재설정
    this.gameState = 'playing'
    this.timeLeft = this.levelConfig.timeLimit
    this.selectedTile = null
    this.isDragging = false
    
    // 그리드 관련
    this.grid = []
    this.gridSprites = []
    
    // 펭귄 관련
    this.penguinPosition = penguinConfig.initialPosition.value
    this.penguinTarget = penguinConfig.targetPosition.value
    this.consecutiveMatches = 0
    this.isComboActive = false
    this.penguinStates = []
    this.savedPenguinsCount = 0
    this.totalMatches = 0
    this.penguinEggs = []
    this.babyPenguins = []
    this.iceNests = []
    
    // 콤보 시스템
    this.comboTimeWindow = 3000
    this.comboMinMatches = 3
    this.matchTimestamps = []
    this.isComboActive = false
    this.lastComboTime = 0
    this.isInChainReaction = false
    this.chainStartTime = 0
    this.penguinSeaProgress = []
    
    // 타이머 정리
    if (this.gameTimer) {
      this.gameTimer.remove()
      this.gameTimer = null
    }
    if (this.comboTimer) {
      this.comboTimer.remove()
      this.comboTimer = null
    }
  }

  preload() {
    // 로딩 진행률 설정
    this.setupLoadingProgress()
    
    // 서브클래스에서 추가 자료를 로드하기 위해 이 메서드를 재정의할 수 있습니다.
    this.loadLevelAssets()
  }


  // 서브클래스에서 이 메서드를 재정의하여 레벨별 자료를 로드합니다.
  loadLevelAssets() {
    // 서브클래스 구현
  }

  create() {
    // 배경 생성
    this.createBackground()
    
    // 오디오 초기화
    this.initAudio()
    
    // 애니메이션 생성
    this.createAnimations()
    
    // 게임 그리드 생성
    this.createGrid()
    
    // UI 생성
    this.createUI()
    
    // 펭귄 생성
    this.createPenguin()
    
    // 입력 설정
    this.setupInput()
    
    // 게임 타이머 시작
    this.startGameTimer()
    
    // 콤보 상태 확인 타이머 시작
    this.startComboTimer()
    
    // 배경 음악과 겨울 벨 소리 재생
    this.backgroundMusic.play()
    this.winterBellsAmbient.play()
  }

  setupLoadingProgress() {
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(240, 270, 320, 50)

    const width = screenSize.width.value
    const height = screenSize.height.value
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fill: '#ffffff'
    }).setOrigin(0.5, 0.5)

    this.load.on('progress', (value) => {
      progressBar.clear()
      progressBar.fillStyle(0xffffff, 1)
      progressBar.fillRect(250, 280, 300 * value, 30)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })
  }

  // 겨울 빙하 배경 생성
  createBackground() {
    this.iceBackground = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, this.levelConfig.background)
    
    const iceScaleX = screenSize.width.value / this.iceBackground.width
    const iceScaleY = screenSize.height.value / this.iceBackground.height
    const iceScale = Math.max(iceScaleX, iceScaleY)
    this.iceBackground.setScale(iceScale)
    
    this.auroraLayer = this.add.image(screenSize.width.value / 2 - 5, -25, 'frozen_ocean_with_ice')
    this.auroraLayer.setOrigin(0.5, 0)
    
    const auroraScaleX = screenSize.width.value / this.auroraLayer.width
    const targetAuroraHeight = screenSize.height.value / 5
    const auroraScaleY = targetAuroraHeight / this.auroraLayer.height
    const auroraScale = Math.max(auroraScaleX, auroraScaleY)
    this.auroraLayer.setScale(auroraScale)
    
    this.auroraInitialY = this.auroraLayer.y
    this.createAuroraAnimation()
  }

  createAuroraAnimation() {
    this.tweens.add({
      targets: this.auroraLayer,
      y: this.auroraInitialY - 8,
      duration: 6000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
    
    this.tweens.add({
      targets: this.auroraLayer,
      x: this.auroraLayer.x + 4,
      duration: 4500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 1500
    })
    
    this.tweens.add({
      targets: this.auroraLayer,
      alpha: 0.92,
      duration: 8000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 2000
    })
    
    this.tweens.add({
      targets: this.auroraLayer,
      scaleY: this.auroraLayer.scaleY * 1.05,
      duration: 7000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 3000
    })
  }

  initAudio() {
    this.matchSound = this.sound.add('crisp_match_sound', { volume: audioConfig.soundVolume.value })
    this.swapSound = this.sound.add('swap_sound', { volume: audioConfig.soundVolume.value })
    this.penguinMoveSound = this.sound.add('penguin_move_sound', { volume: audioConfig.soundVolume.value })
    this.iceShuffleSound = this.sound.add('ice_shuffle_sound', { volume: audioConfig.soundVolume.value * 1.8 })
    this.victorySound = this.sound.add('victory_sound', { volume: audioConfig.soundVolume.value })
    this.gameOverSound = this.sound.add('game_over_sound', { volume: audioConfig.soundVolume.value })
    this.uiClickSound = this.sound.add('ui_click_sound', { volume: audioConfig.soundVolume.value })
    this.comboTriggerSound = this.sound.add('optimized_combo_sound', { volume: audioConfig.soundVolume.value * 1.2 })
    this.backgroundMusic = this.sound.add('winter_wind_chill', { 
      volume: audioConfig.musicVolume.value * 0.4,
      loop: true 
    })
    this.winterBellsAmbient = this.sound.add('soft_winter_bells', { 
      volume: audioConfig.musicVolume.value * 0.2,
      loop: true 
    })
  }

  createAnimations() {
    if (!this.anims.exists('penguin_waddle')) {
      this.anims.create({
        key: 'penguin_waddle',
        frames: [
          { key: 'baby_penguin_waddle_frame1', duration: 400 },
          { key: 'baby_penguin_waddle_frame2', duration: 400 }
        ],
        repeat: -1
      })
    }
  }

  // 레벨 완료 후 메뉴로 돌아가는 기능 추가
  victory() {
    if (this.gameState !== 'playing') return
    
    this.gameState = 'victory'
    this.gameTimer.remove()
    this.victorySound.play()
    
    // 승리 화면 생성
    const victoryBg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2, 
      screenSize.width.value, screenSize.height.value, 0x000000, 0.7)
    
    this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 100, 
      `${this.levelConfig.levelName} Complete!`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#00ff88',
      stroke: '#ffffff',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)

    this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 20, 
      'All baby penguins have reached the frozen sea safely!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5)

    // 버튼 추가
    this.createVictoryButtons()
  }

  createVictoryButtons() {
    const buttonY = screenSize.height.value / 2 + 80
    
    // 다음 레벨 버튼
    const nextButton = this.add.text(screenSize.width.value / 2 - 100, buttonY, 
      'Next Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#00ff88',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setInteractive()

    // 레벨 선택 버튼
    const selectButton = this.add.text(screenSize.width.value / 2 + 100, buttonY, 
      'Level Select', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#4f46e5',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setInteractive()

    nextButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.goToNextLevel()
    })

    selectButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.start('LevelSelectScene')
    })
  }

  goToNextLevel() {
    // 서브클래스에서 다음 레벨을 정의하기 위해 이 메서드를 재정의할 수 있습니다.
    this.scene.start('LevelSelectScene')
  }

  gameOver() {
    if (this.gameState !== 'playing') return
    
    this.gameState = 'gameover'
    this.gameTimer.remove()
    this.gameOverSound.play()
    
    const gameOverBg = this.add.rectangle(screenSize.width.value / 2, screenSize.height.value / 2, 
      screenSize.width.value, screenSize.height.value, 0x000000, 0.7)
    
    this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 - 50, 'Time\'s Up!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#ff4444',
      stroke: '#ffffff',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)

    const retryButton = this.add.text(screenSize.width.value / 2, screenSize.height.value / 2 + 50, 
      'Try Again', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fill: '#ffeb3b',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setInteractive()

    retryButton.on('pointerdown', () => {
      this.uiClickSound.play()
      this.scene.restart()
    })
  }

  // 여기에는 원본 GameScene의 모든 핵심 게임 로직 메서드가 포함되어야 합니다.
  // 단순화를 위해 필요한 메서드 참조만 추가합니다.
  createGrid() {
    // 원본 createGrid 로직 재사용
    this.grid = []
    this.gridSprites = []
    
    for (let row = 0; row < this.gridRows; row++) {
      this.grid[row] = []
      this.gridSprites[row] = []
      for (let col = 0; col < this.gridCols; col++) {
        const trashType = Phaser.Utils.Array.GetRandom(this.trashTypes.slice(0, this.levelConfig.trashTypes))
        this.grid[row][col] = trashType
        
        const x = this.gameAreaX + col * this.cellSize + this.cellSize / 2
        const y = this.gameAreaY + row * this.cellSize + this.cellSize / 2
        
        const sprite = this.add.sprite(x, y, trashType)
        this.setTrashSpriteScale(sprite)
        sprite.setData('row', row)
        sprite.setData('col', col)
        sprite.setDepth(1)
        
        // 상호 작용 설정
        sprite.setInteractive()
        sprite.on('pointerdown', () => this.handleClick(sprite))
        sprite.on('pointerover', () => this.onTileHover(sprite))
        sprite.on('pointerout', () => this.onTileLeave(sprite))
        
        this.gridSprites[row][col] = sprite
      }
    }
    
    // 초기 일치 없음 확인
    this.removeInitialMatches()
  }

  // 단순화된 필수 메서드 - 실제 프로젝트에서는 원본 GameScene의 모든 메서드를 완전히 복사해야 합니다.
  createUI() {
    // 제목 생성 - 새 표지 이미지에 맞춰 크기 조정 필요
    const titleScale = Math.min(screenSize.width.value / 1536, 0.35) // 새 이미지의 1536px 너비 기준
    this.gameTitle = this.add.image(screenSize.width.value / 2, 70, 'game_title')
    this.gameTitle.setScale(titleScale)

    // 레벨 정보 텍스트는 삭제되어 UI를 깔끔하게 유지합니다.

    // 시간 표시
    this.timeText = this.add.text(screenSize.width.value - 50, 150, `Time: ${this.timeLeft}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      fill: '#dc2626',
      stroke: '#ffffff',
      strokeThickness: 3
    }).setOrigin(1, 0)

    // 진행률 표시줄
    this.createProgressBar()
  }

  // 원본 GameScene의 모든 메서드를 복사해야 합니다...
  // 여기서는 프레임워크만 보여주며, 실제 사용 시에는 완전히 복사해야 합니다.
}