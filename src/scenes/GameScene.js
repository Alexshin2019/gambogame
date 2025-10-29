import Phaser from "phaser"
import config from '../gameConfig.json'

export default class GameScene extends Phaser.Scene {
  constructor(config = { key: 'GameScene' }) {
    super(config)
    
    // 게임 영역 위치 (고정값)
    this.gridRows = config.gameConfig.gridRows.value
    this.gridCols = config.gameConfig.gridCols.value
    this.cellSize = config.gameConfig.cellSize.value
    this.gameAreaX = (config.screenSize.width.value - this.gridCols * this.cellSize) / 2
    this.gameAreaY = 200 // 위쪽에 UI 공간을 더 남겨둠
    this.trashTypes = ['front_view_trash_tile_plastic_bottle', 'front_view_trash_tile_plastic_bag', 'front_view_trash_tile_soda_can', 'front_view_trash_tile_food_wrapper', 'front_view_trash_tile_cigarette_butt', 'front_view_trash_tile_paper_cup', 'front_view_trash_tile_glass_bottle', 'front_view_trash_tile_aluminum_foil']
  }
  
  init() {
    // 모든 게임 상태 변수 재설정
    this.gameState = 'playing' // 'playing', 'victory', 'gameover'
    this.timeLeft = config.gameConfig.gameTime.value
    this.selectedTile = null
    this.isDragging = false
    
    // 그리드 관련
    this.grid = []
    this.gridSprites = []
    
    // 거북이 관련
    this.turtlePosition = config.turtleConfig.initialPosition.value
    this.turtleTarget = config.turtleConfig.targetPosition.value
    this.consecutiveMatches = 0 // 연속 제거 카운트
    this.isComboActive = false // combo 상태
    this.turtleStates = [] // 각 거북이의 상태: 'egg', 'hatching', 'moving_to_side', 'ready_for_sea', 'moving_to_sea', 'saved'
    this.savedTurtlesCount = 0 // 구출된 거북이 수
    this.totalMatches = 0 // 총 제거 횟수 (육성 계산용)
    this.turtleEggs = []
    this.babyTurtles = []
    this.sandNests = []
    
    // Combo 시스템 - 3초 내 제거 횟수 기반
    this.comboTimeWindow = 3000 // 3초 시간 윈도우
    this.comboMinMatches = 3 // 최소 3회 제거가 combo
    this.matchTimestamps = [] // 각 제거 시간 타임스탬프 기록
    this.isComboActive = false
    this.lastComboTime = 0 // 마지막 combo 트리거 시간 기록
    this.isInChainReaction = false // 체인 반응 표시 여부
    this.chainStartTime = 0 // 체인 반응 시작 시간
    this.turtleSeaProgress = [] // 각 거북이가 바다로 이동하는 진행 정도 (0-6)
    
    // 정리 타이머
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
    // 모든 리소스는 LoadingScene에서 이미 로드되었으므로 반복 로드할 필요 없음
  }

  create() {
    // 배경 생성
    this.createBackground()
    
    // 초기 오디오 설정
    this.initAudio()
    
    // 애니메이션 생성
    this.createAnimations()
    
    // 게임 그리드 생성
    this.createGrid()
    
    // UI 생성
    this.createUI()
    
    // 거북이 생성
    this.createTurtle()
    
    // 입력 설정
    this.setupInput()
    
    // 게임 타이머 시작
    this.startGameTimer()
    
    // combo 상태 확인 타이머 시작
    this.startComboTimer()
    
    // 배경 음악과 바다 환경 음향 재생
    this.backgroundMusic.play()
    this.oceanWavesAmbient.play()
  }
  
  createBackground() {
    // 첫 번째: 고정된 연두색 해변 배경 생성 (움직이지 않음)
    this.beachBackground = this.add.image(config.screenSize.width.value / 2, config.screenSize.height.value / 2, 'light_beach_background')
    
    // 해변 배경 확대 비율로 화면에 맞춤
    const beachScaleX = config.screenSize.width.value / this.beachBackground.width
    const beachScaleY = config.screenSize.height.value / this.beachBackground.height
    const beachScale = Math.max(beachScaleX, beachScaleY)
    this.beachBackground.setScale(beachScale)
    
    // 두 번째: 화면 위쪽 1/5 영역에서 움직이는 밝은 바다 레이어 생성 (흰색 파도 포함)
    // 바다 레이어는 화면 위쪽에 배치되고, 왼쪽으로 조금 이동하여 왼쪽 틈새 방지
    this.oceanLayer = this.add.image(config.screenSize.width.value / 2 - 5, -25, 'bright_ocean_with_waves')
    this.oceanLayer.setOrigin(0.5, 0) // 위쪽에서 정렬
    
    // 바다 레이어 확대 비율로 화면에 맞춤
    const oceanScaleX = config.screenSize.width.value / this.oceanLayer.width
    // 높이는 화면 높이의 1/5로 축소
    const targetOceanHeight = config.screenSize.height.value / 5 // 화면 높이의 1/5
    const oceanScaleY = targetOceanHeight / this.oceanLayer.height
    const oceanScale = Math.max(oceanScaleX, oceanScaleY)
    this.oceanLayer.setScale(oceanScale)
    
    // 바다 레이어의 초기 위치 저장, 조석 애니메이션에 사용
    this.oceanInitialY = this.oceanLayer.y
    
    // 바다 레이어에 조석 애니메이션 효과 추가
    this.createTidalAnimation()
  }

  createTidalAnimation() {
    // 바다 레이어의 조석 애니메이션 효과 - 해파도 음향과 함께
    // 주요 조석 파동 - 상하 부동으로 조석 주기 흐름 모방 (1/5 경계 주위 부동)
    this.tweens.add({
      targets: this.oceanLayer,
      y: this.oceanInitialY - 8, // 위로 8픽셀 이동 (조석 주기)
      duration: 6000, // 6초 완전 조석 주기, 해파도 음향과 함께
      ease: 'Sine.easeInOut',
      yoyo: true, // 자동으로 퇴적 효과 만들기
      repeat: -1, // 무한 반복으로 지속적인 조석 모방
    })
    
    // 보조 파동 움직임 - 해파의 좌우 약간 흔들림 모방
    this.tweens.add({
      targets: this.oceanLayer,
      x: this.oceanLayer.x + 4, // 좌우 약간 흔들림
      duration: 4500, // 다른 주기로 자연스러운 복합 효과 만들기
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 1500 // 지연 시작, 주 파동과 복합 리듬 형성
    })
    
    // 투명도 변화로 해수 깊이와 햇빛 반사 모방
    this.tweens.add({
      targets: this.oceanLayer,
      alpha: 0.92, // 약간의 투명도 변화, 광선 굴절 모방
      duration: 8000, // 더 긴 주기로 광선 변화 모방
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 2000 // 약간의 지연으로 더 자연스러운 효과 만들기
    })
    
    // 약간의 수직 확대 변화로 조석 강도 변화 모방
    this.tweens.add({
      targets: this.oceanLayer,
      scaleY: this.oceanLayer.scaleY * 1.05, // 수직 방향 약간 확대 변화
      duration: 7000, // 더 긴 주기로 조석 강도 변화 모방
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 3000
    })
  }
  
  initAudio() {
    // 초기 효과 설정
    this.matchSound = this.sound.add('crisp_match_sound', { volume: config.audioConfig.soundVolume.value })
    this.swapSound = this.sound.add('swap_sound', { volume: config.audioConfig.soundVolume.value })
    this.turtleMoveSound = this.sound.add('turtle_move_sound', { volume: config.audioConfig.soundVolume.value })
    this.sandShuffleSound = this.sound.add('sand_shuffle_sound', { volume: config.audioConfig.soundVolume.value * 1.8 })
    this.victorySound = this.sound.add('victory_sound', { volume: config.audioConfig.soundVolume.value })
    this.gameOverSound = this.sound.add('game_over_sound', { volume: config.audioConfig.soundVolume.value })
    this.uiClickSound = this.sound.add('ui_click_sound', { volume: config.audioConfig.soundVolume.value })
    this.comboTriggerSound = this.sound.add('optimized_combo_sound', { volume: config.audioConfig.soundVolume.value * 1.2 })
    this.backgroundMusic = this.sound.add('summer_beach_vibes', { 
      volume: config.audioConfig.musicVolume.value * 0.4,
      loop: true 
    })
    this.oceanWavesAmbient = this.sound.add('ocean_waves_ambient', { 
      volume: config.audioConfig.musicVolume.value * 0.2,
      loop: true 
    })
  }
  
  createAnimations() {
    // 소거북이 수영/움직임 애니메이션 생성
    // 부드러운 두 프레임 움직임 애니메이션 생성
    if (!this.anims.exists('turtle_crawl')) {
      this.anims.create({
        key: 'turtle_crawl',
        frames: [
          { key: 'baby_turtle_crawl_frame1', duration: 400 }, // 움직임 동작 1프레임
          { key: 'baby_turtle_crawl_frame2', duration: 400 }  // 움직임 동작 2프레임
        ],
        repeat: -1
      })
    }
  }
  
  // 보조 함수: 쓰레기 아이콘의 통일 확대
  setTrashSpriteScale(sprite) {
    const targetSize = this.cellSize * 0.8
    const baseScale = targetSize / Math.max(sprite.width, sprite.height)
    const scale = baseScale * 1.1 // 110%로 확대
    sprite.setData('normalScale', scale) // 정상 확대 값 저장
    sprite.setData('hoverScale', scale * 1.25) // 110% 기반에 더 확대 25% 저장
    sprite.setScale(scale)
  }

  createGrid() {
    // 그리드 배열은 init()에서 이미 초기화되었으므로 여기서 바로 사용
    
    for (let row = 0; row < this.gridRows; row++) {
      this.grid[row] = []
      this.gridSprites[row] = []
      
      for (let col = 0; col < this.gridCols; col++) {
        // 쓰레기 유형 랜덤 선택
        const trashType = Phaser.Utils.Array.GetRandom(this.trashTypes)
        this.grid[row][col] = trashType
        
        // 스프라이트 생성
        const x = this.gameAreaX + col * this.cellSize + this.cellSize / 2
        const y = this.gameAreaY + row * this.cellSize + this.cellSize / 2
        
        const sprite = this.add.image(x, y, trashType)
        this.setTrashSpriteScale(sprite)
        sprite.setInteractive()
        sprite.setData('row', row)
        sprite.setData('col', col)
        
        this.gridSprites[row][col] = sprite
        
        // 드래그 이벤트 추가
        sprite.on('pointerdown', (pointer) => this.onTilePointerDown(sprite, pointer))
        sprite.on('pointermove', (pointer) => this.onTilePointerMove(sprite, pointer))
        sprite.on('pointerup', (pointer) => this.onTilePointerUp(sprite, pointer))
        
        // 호버 효과 추가
        sprite.on('pointerover', () => this.onTileHover(sprite))
        sprite.on('pointerout', () => this.onTileLeave(sprite))
      }
    }
    
    // 초기 상태에서 일치 항목 제거
    this.removeInitialMatches()
  }
  
  removeInitialMatches() {
    let hasMatches = true
    let iterations = 0
    const maxIterations = 10
    
    while (hasMatches && iterations < maxIterations) {
      hasMatches = false
      iterations++
      
      for (let row = 0; row < this.gridRows; row++) {
        for (let col = 0; col < this.gridCols; col++) {
          if (this.hasMatchAt(row, col)) {
            // 다른 쓰레기 유형으로 랜덤 변경
            let newType
            do {
              newType = Phaser.Utils.Array.GetRandom(this.trashTypes)
            } while (newType === this.grid[row][col])
            
            this.grid[row][col] = newType
            this.gridSprites[row][col].setTexture(newType)
            this.setTrashSpriteScale(this.gridSprites[row][col])
            hasMatches = true
          }
        }
      }
    }
  }
  
  createUI() {
    // 현대적인 UI 패널 생성
    this.createModernUIPanel()
    
    // 시간 표시기 생성
    this.createTimeDisplay()
    
    // 진행 표시기 생성
    this.createProgressDisplay()
    
    // 게임 정보 패널 생성
    this.createGameInfoPanel()
  }

  createModernUIPanel() {
    // 배경 패널 생성 안 함, UI 요소를 게임 시나리오에 직접 표시
    // 이렇게 하면 파란색 바닥 문제를 피할 수 있고, UI가 더 깨끗해짐
  }

  createTimeDisplay() {
    // 시간 표시 컨테이너 - 가장자리에 붙이지 않고 위치 조정
    const timeContainer = this.add.container(100, 50)
    
    // 시간 아이콘 배경 - 그림자와 더 나은 시각 효과 추가
    const timeShadow = this.add.graphics()
    timeShadow.fillStyle(0x000000, 0.3)
    timeShadow.fillRoundedRect(-48, -18, 100, 40, 10) // 그림자 이동
    
    const timeBg = this.add.graphics()
    timeBg.fillStyle(0x3b82f6, 0.9)
    timeBg.fillRoundedRect(-50, -20, 100, 40, 10)
    timeBg.lineStyle(2, 0x60a5fa, 1)
    timeBg.strokeRoundedRect(-50, -20, 100, 40, 10)
    
    // 시간 아이콘 (⏰)
    const timeIcon = this.add.text(-35, 0, '⏰', {
      fontSize: '24px'
    }).setOrigin(0.5)
    
    // 시간 텍스트
    this.timeText = this.add.text(15, 0, `${this.timeLeft}s`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#1e293b',
      strokeThickness: 3
    }).setOrigin(0.5)
    
    timeContainer.add([timeShadow, timeBg, timeIcon, this.timeText])
    timeContainer.setDepth(10)
    
    // 펄스 애니메이션 추가
    this.tweens.add({
      targets: timeContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  createProgressDisplay() {
    // 진행 표시 컨테이너 - 오른쪽 가장자리에 붙이지 않고 위치 조정
    const progressContainer = this.add.container(config.screenSize.width.value - 200, 50)
    
    // 진행 패널 배경 - 그림자 효과 추가
    const progressShadow = this.add.graphics()
    progressShadow.fillStyle(0x000000, 0.3)
    progressShadow.fillRoundedRect(-148, -33, 300, 70, 15) // 그림자 이동
    
    const progressBg = this.add.graphics()
    progressBg.fillStyle(0x059669, 0.9)
    progressBg.fillRoundedRect(-150, -35, 300, 70, 15)
    progressBg.lineStyle(3, 0x10b981, 1)
    progressBg.strokeRoundedRect(-150, -35, 300, 70, 15)
    
    // 진행 제목
    const progressTitle = this.add.text(0, -20, '🐢 Turtle Progress', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#064e3b',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5)
    
    // 진행 바 컨테이너
    const progressBarContainer = this.add.container(0, 10)
    
    // 진행 바 배경
    this.progressBarBg = this.add.graphics()
    this.progressBarBg.fillStyle(0x064e3b, 0.8)
    this.progressBarBg.fillRoundedRect(-120, -8, 240, 16, 8)
    this.progressBarBg.lineStyle(2, 0x047857, 1)
    this.progressBarBg.strokeRoundedRect(-120, -8, 240, 16, 8)
    
    // 진행 바 채우기
    this.progressBar = this.add.graphics()
    
    // 진행 백분율 텍스트
    this.progressPercentText = this.add.text(0, 0, '0%', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#064e3b',
      strokeThickness: 2
    }).setOrigin(0.5)
    
    progressBarContainer.add([this.progressBarBg, this.progressBar, this.progressPercentText])
    progressContainer.add([progressShadow, progressBg, progressTitle, progressBarContainer])
    progressContainer.setDepth(10)
    
    this.progressContainer = progressContainer
  }

  createGameInfoPanel() {
    // 중앙 정보 패널 - 위쪽 가장자리에 붙이지 않고 위치 조정
    const infoContainer = this.add.container(config.screenSize.width.value / 2, 50)
    
    // 정보 패널 배경 - 그림자 효과 추가
    const infoShadow = this.add.graphics()
    infoShadow.fillStyle(0x000000, 0.3)
    infoShadow.fillRoundedRect(-98, -23, 200, 50, 12) // 그림자 이동
    
    const infoBg = this.add.graphics()
    infoBg.fillStyle(0x7c3aed, 0.9)
    infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
    infoBg.lineStyle(2, 0x8b5cf6, 1)
    infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    
    // Combo 상태 표시
    this.comboText = this.add.text(0, -8, 'Ready!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#4c1d95',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5)
    
    // 매치 카운트 표시
    this.matchCountText = this.add.text(0, 8, 'Matches: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fill: '#e5e7eb',
      align: 'center'
    }).setOrigin(0.5)
    
    infoContainer.add([infoShadow, infoBg, this.comboText, this.matchCountText])
    infoContainer.setDepth(10)
    
    this.infoContainer = infoContainer
    
    // 초기 매치 카운트 설정
    this.totalMatches = 0
  }

  updateComboDisplay(text) {
    // combo 텍스트 업데이트
    this.comboText.setText(text)
    
    // 시각 효과 추가
    this.comboText.setFill('#ffeb3b')
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        // 정상 상태로 복귀
        this.time.delayedCall(1500, () => {
          this.comboText.setText('Ready!')
          this.comboText.setFill('#ffffff')
        })
      }
    })
    
    // 배경 깜박임 효과
    const infoBg = this.infoContainer.list[1] // 배경 graphics (두 번째 요소, 첫 번째는 그림자)
    const originalColor = 0x7c3aed
    infoBg.clear()
    infoBg.fillStyle(0xfbbf24, 0.9) // 황금색 배경
    infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
    infoBg.lineStyle(2, 0xffeb3b, 1)
    infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    
    // 원래 배경 복원
    this.time.delayedCall(2000, () => {
      infoBg.clear()
      infoBg.fillStyle(originalColor, 0.8)
      infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
      infoBg.lineStyle(2, 0x8b5cf6, 1)
      infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    })
  }
  
  createTurtle() {
    // 거북이 배열은 init()에서 이미 초기화되었으므로 여기서 바로 사용
    
    // 게임 영역 아래쪽에 거북이 알 생성, 위치 조정으로 완전히 보이게 함
    const eggY = this.gameAreaY + this.gridRows * this.cellSize + 50
    
    for (let i = 0; i < 6; i++) {
      // 거북이 상태와 바다로 이동 진행 초기화
      this.turtleStates.push('egg')
      this.turtleSeaProgress.push(0)
      
      const eggX = this.gameAreaX + (i + 1) * (this.gridCols * this.cellSize / 7)
      
      // 먼저 모래 구덩이 생성 (알 아래)
      const sandNest = this.add.image(eggX, eggY + 5, 'turtle_egg_sand_nest')
      sandNest.setScale(0.15) // 모래 구덩이 크기 증가, 더 명확하게 보이게 함
      sandNest.setDepth(0) // 0으로 설정, 모래 구덩이 보이게 함
      this.sandNests.push(sandNest)
      
      // 그런 다음 거북이 알 생성
      const egg = this.add.image(eggX, eggY, 'turtle_egg')
      egg.setScale(0.108) // 90%로 축소: 0.12 * 0.9
      egg.setDepth(1) // 거북이 알이 모래 구덩이 위에 있도록 함
      this.turtleEggs.push(egg)
      
      // 대응하는 소거북이 애니메이션 스프라이트 생성 (초기에 숨김)
      const turtle = this.add.sprite(eggX, eggY, 'baby_turtle')
      turtle.setScale(0.12) // 거북이 크기 증가, 더 명확하게 보이게 함
      turtle.setVisible(false)
      turtle.setDepth(2) // 소거북이가 가장 위에 있도록 함
      turtle.setData('originalX', eggX) // 원래 X 위치 기록
      turtle.setData('targetX', eggX) // 목표 X 위치, 초기에는 원래 위치와 같음
      turtle.setData('isMoving', false) // 이동 중인지 기록
      this.babyTurtles.push(turtle)
    }
  }
  
  setupInput() {
    // 전체 포인터 이벤트 설정
    this.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false
        this.selectedTile = null
      }
    })
  }
  
  startGameTimer() {
    // 게임 타이머 생성
    this.gameTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    })
  }
  
  updateTimer() {
    if (this.gameState !== 'playing') return
    
    this.timeLeft--
    this.timeText.setText(`${this.timeLeft}s`)
    
    // 시간이 부족할 때의 경고 효과
    if (this.timeLeft <= 30 && this.timeLeft > 0) {
      // 시간 긴급 시 빨간색으로 깜박임
      this.timeText.setFill(this.timeLeft <= 10 ? '#ff4444' : '#ff8800')
      
      if (this.timeLeft <= 10) {
        // 마지막 10초 강하게 깜박임
        this.tweens.add({
          targets: this.timeText,
          alpha: 0.3,
          duration: 200,
          yoyo: true,
          repeat: 1
        })
      }
    }
    
    if (this.timeLeft <= 0) {
      this.gameOver()
    }
  }
  
  startComboTimer() {
    // combo 상태 확인 타이머 생성, 0.5초마다 확인
    this.comboTimer = this.time.addEvent({
      delay: 500, // 500밀리초마다 확인
      callback: this.updateComboStatus,
      callbackScope: this,
      loop: true
    })
  }
  
  updateComboStatus() {
    if (this.gameState !== 'playing') return
    
    const currentTime = this.time.now
    this.cleanOldTimestamps(currentTime)
    
    // combo 상태가 재설정되어야 하는지 확인
    if (this.isComboActive && currentTime - this.lastComboTime > 1000) {
      // combo 애니메이션 재생 후 1초 상태 재설정
      this.isComboActive = false
    }
  }
  
  onTilePointerDown(sprite, pointer) {
    if (this.gameState !== 'playing') return
    
    this.selectedTile = sprite
    this.isDragging = true
    this.dragStartX = pointer.x
    this.dragStartY = pointer.y
  }
  
  onTilePointerMove(sprite, pointer) {
    if (!this.isDragging || this.gameState !== 'playing') return
    
    const dragDistance = Phaser.Math.Distance.Between(
      this.dragStartX, this.dragStartY, 
      pointer.x, pointer.y
    )
    
    if (dragDistance > 20) {
      // 드래그 방향 확인
      const deltaX = pointer.x - this.dragStartX
      const deltaY = pointer.y - this.dragStartY
      
      let targetRow = this.selectedTile.getData('row')
      let targetCol = this.selectedTile.getData('col')
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 수평 드래그
        targetCol += deltaX > 0 ? 1 : -1
      } else {
        // 수직 드래그
        targetRow += deltaY > 0 ? 1 : -1
      }
      
      // 경계 확인
      if (targetRow >= 0 && targetRow < this.gridRows && 
          targetCol >= 0 && targetCol < this.gridCols) {
        
        const targetTile = this.gridSprites[targetRow][targetCol]
        this.swapTiles(this.selectedTile, targetTile)
      }
      
      this.isDragging = false
      this.selectedTile = null
    }
  }
  
  onTilePointerUp(sprite, pointer) {
    this.isDragging = false
    this.selectedTile = null
  }
  
  // 마우스 호버 효과
  onTileHover(sprite) {
    if (this.gameState !== 'playing' || this.isDragging) return
    
    const hoverScale = sprite.getData('hoverScale')
    if (hoverScale) {
      // 부드러운 확대 애니메이션 생성
      this.tweens.add({
        targets: sprite,
        scaleX: hoverScale,
        scaleY: hoverScale,
        duration: 150,
        ease: 'Power2'
      })
      
      // 깊이 증가, 다른 타일 위에 호버 타일 표시
      sprite.setDepth(10)
    }
  }
  
  // 마우스 떠나는 효과
  onTileLeave(sprite) {
    if (this.gameState !== 'playing') return
    
    const normalScale = sprite.getData('normalScale')
    if (normalScale) {
      // 부드러운 축소 애니메이션 생성
      this.tweens.add({
        targets: sprite,
        scaleX: normalScale,
        scaleY: normalScale,
        duration: 150,
        ease: 'Power2'
      })
      
      // 정상 깊이로 복원
      sprite.setDepth(1)
    }
  }
  
  swapTiles(tile1, tile2) {
    if (!tile1 || !tile2) return
    
    const row1 = tile1.getData('row')
    const col1 = tile1.getData('col')
    const row2 = tile2.getData('row')
    const col2 = tile2.getData('col')
    
    // 교환 효과 재생
    this.swapSound.play()
    
    // 그리드 데이터 교환
    const temp = this.grid[row1][col1]
    this.grid[row1][col1] = this.grid[row2][col2]
    this.grid[row2][col2] = temp
    
    // 스프라이트 텍스처와 확대 업데이트
    tile1.setTexture(this.grid[row1][col1])
    this.setTrashSpriteScale(tile1)
    tile2.setTexture(this.grid[row2][col2])
    this.setTrashSpriteScale(tile2)
    
    // 일치 확인
    this.time.delayedCall(100, () => {
      if (this.hasMatchAt(row1, col1) || this.hasMatchAt(row2, col2) ||
          this.findAllMatches().length > 0) {
        this.processMatches()
      } else {
        // 일치하는 것이 없으면 다시 교환
        const tempBack = this.grid[row1][col1]
        this.grid[row1][col1] = this.grid[row2][col2]
        this.grid[row2][col2] = tempBack
        
        tile1.setTexture(this.grid[row1][col1])
        this.setTrashSpriteScale(tile1)
        tile2.setTexture(this.grid[row2][col2])
        this.setTrashSpriteScale(tile2)
      }
    })
  }
  
  hasMatchAt(row, col) {
    const type = this.grid[row][col]
    if (!type) return false
    
    // 수평 일치 확인
    let horizontalCount = 1
    
    // 왼쪽으로 확인
    for (let c = col - 1; c >= 0 && this.grid[row][c] === type; c--) {
      horizontalCount++
    }
    
    // 오른쪽으로 확인
    for (let c = col + 1; c < this.gridCols && this.grid[row][c] === type; c++) {
      horizontalCount++
    }
    
    if (horizontalCount >= gameConfig.minMatchCount.value) return true
    
    // 수직 일치 확인
    let verticalCount = 1
    
    // 위로 확인
    for (let r = row - 1; r >= 0 && this.grid[r][col] === type; r--) {
      verticalCount++
    }
    
    // 아래로 확인
    for (let r = row + 1; r < this.gridRows && this.grid[r][col] === type; r++) {
      verticalCount++
    }
    
    return verticalCount >= gameConfig.minMatchCount.value
  }
  
  findAllMatches() {
    const matches = []
    const visited = new Set()
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const key = `${row},${col}`
        if (visited.has(key)) continue
        
        if (this.hasMatchAt(row, col)) {
          const matchGroup = this.getMatchGroup(row, col, visited)
          if (matchGroup.length >= gameConfig.minMatchCount.value) {
            matches.push(matchGroup)
          }
        }
      }
    }
    
    return matches
  }
  
  getMatchGroup(startRow, startCol, visited) {
    const type = this.grid[startRow][startCol]
    const group = []
    
    // 수평 일치 그룹 가져오기
    const horizontalGroup = this.getHorizontalMatchGroup(startRow, startCol, type, visited)
    // 수직 일치 그룹 가져오기
    const verticalGroup = this.getVerticalMatchGroup(startRow, startCol, type, visited)
    
    // 두 그룹 합치기 (중복 제거)
    const allPositions = new Set()
    
    // 수평 일치 추가
    if (horizontalGroup.length >= gameConfig.minMatchCount.value) {
      horizontalGroup.forEach(pos => {
        const key = `${pos[0]},${pos[1]}`
        if (!allPositions.has(key)) {
          allPositions.add(key)
          group.push(pos)
          visited.add(key)
        }
      })
    }
    
    // 수직 일치 추가
    if (verticalGroup.length >= gameConfig.minMatchCount.value) {
      verticalGroup.forEach(pos => {
        const key = `${pos[0]},${pos[1]}`
        if (!allPositions.has(key)) {
          allPositions.add(key)
          group.push(pos)
          visited.add(key)
        }
      })
    }
    
    return group
  }
  
  getHorizontalMatchGroup(row, col, type, visited) {
    const group = []
    
    // 현재 위치에서 왼쪽으로 스캔
    let leftCol = col
    while (leftCol >= 0 && this.grid[row][leftCol] === type) {
      leftCol--
    }
    leftCol++ // 마지막 일치 위치로 돌아옴
    
    // 가장 왼쪽에서 오른쪽으로 모든 일치 위치 수집
    let rightCol = leftCol
    while (rightCol < this.gridCols && this.grid[row][rightCol] === type) {
      const key = `${row},${rightCol}`
      if (!visited.has(key)) {
        group.push([row, rightCol])
      }
      rightCol++
    }
    
    return group
  }
  
  getVerticalMatchGroup(row, col, type, visited) {
    const group = []
    
    // 현재 위치에서 위로 스캔
    let topRow = row
    while (topRow >= 0 && this.grid[topRow][col] === type) {
      topRow--
    }
    topRow++ // 마지막 일치 위치로 돌아옴
    
    // 가장 위쪽에서 아래로 모든 일치 위치 수집
    let bottomRow = topRow
    while (bottomRow < this.gridRows && this.grid[bottomRow][col] === type) {
      const key = `${bottomRow},${col}`
      if (!visited.has(key)) {
        group.push([bottomRow, col])
      }
      bottomRow++
    }
    
    return group
  }
  
  processMatches() {
    const allMatches = this.findAllMatches()
    
    if (allMatches.length === 0) {
      // 일치하는 것이 없으면 체인 반응 종료
      this.isInChainReaction = false
      return
    }
    
    // 일치 효과 재생
    this.matchSound.play()
    
    const currentTime = this.time.now
    
    // 체인 반응 중이 아니면 새로운 체인 반응 시작
    if (!this.isInChainReaction) {
      this.isInChainReaction = true
      this.chainStartTime = currentTime
    }
    
    // 현재 제거된 시간 타임스탬프 기록
    this.matchTimestamps.push(currentTime)
    this.totalMatches++
    
    // 일치 카운트 표시 업데이트
    this.matchCountText.setText(`Matches: ${this.totalMatches}`)
    
    // combo 조건 확인
    this.checkComboCondition(currentTime)
    
    // 일치된 타일 제거
    let totalRemoved = 0
    allMatches.forEach(matchGroup => {
      matchGroup.forEach(([row, col]) => {
        this.gridSprites[row][col].setVisible(false)
        this.grid[row][col] = null
        totalRemoved++
      })
    })
    
    // 새로운 거북이가 육성되어야 하는지 확인
    this.checkTurtleHatching()
    
    // 지연 후 빈 자리 채우고 새로운 일치 확인
    this.time.delayedCall(300, () => {
      this.dropTiles()
      this.fillEmptySpaces()
      
      this.time.delayedCall(300, () => {
        // 재귀적으로 새로운 일치 확인
        this.processMatches()
      })
    })
  }
  
  // combo 조건 확인
  checkComboCondition(currentTime) {
    // 지나간 시간 타임스탬프 제거 (하지만 이미 트리거된 combo는 영향 없음)
    this.cleanOldTimestamps(currentTime)
    
    // combo 조건이 충족되는지 확인
    const validMatches = this.getValidMatchesForCombo(currentTime)
    
    if (validMatches >= this.comboMinMatches && !this.isComboActive) {
      // combo 트리거
      this.isComboActive = true
      this.lastComboTime = currentTime
      this.showComboText()
      this.updateComboDisplay('COMBO!')
      this.comboTriggerSound.play()
      this.moveHatchedTurtlesToSea()
      
      // combo 트리거 후 시간 타임스탬프 배열 재설정, 하지만 현재 제거는 유지
      this.resetComboTracking(currentTime)
    }
  }
  
  // combo에 대한 유효한 제거 횟수 가져오기
  getValidMatchesForCombo(currentTime) {
    // 만약 combo가 최근에 트리거된 경우 (500ms 이내), 중복 제거 계산 안 함
    if (this.lastComboTime > 0 && currentTime - this.lastComboTime < 500) {
      return 0
    }
    
    // 시간 윈도우 내에서 이전 combo와 중복되지 않은 제거 횟수 계산
    return this.matchTimestamps.filter(timestamp => {
      return currentTime - timestamp <= this.comboTimeWindow &&
             (this.lastComboTime === 0 || timestamp > this.lastComboTime)
    }).length
  }
  
  // combo 추적 재설정
  resetComboTracking(currentTime) {
    // 현재 제거만 유지, 다른 기록 제거
    this.matchTimestamps = [currentTime]
    this.isComboActive = false
  }
  
  // 지나간 시간 타임스탬프 제거
  cleanOldTimestamps(currentTime) {
    this.matchTimestamps = this.matchTimestamps.filter(timestamp => {
      return currentTime - timestamp <= this.comboTimeWindow
    })
  }
  

  
  dropTiles() {
    for (let col = 0; col < this.gridCols; col++) {
      let writePos = this.gridRows - 1
      
      for (let row = this.gridRows - 1; row >= 0; row--) {
        if (this.grid[row][col] !== null) {
          if (writePos !== row) {
            // 타일 이동
            this.grid[writePos][col] = this.grid[row][col]
            this.grid[row][col] = null
            
            // 스프라이트 위치와 텍스처 업데이트
            const sprite = this.gridSprites[writePos][col]
            const oldSprite = this.gridSprites[row][col]
            
            sprite.setTexture(this.grid[writePos][col])
            this.setTrashSpriteScale(sprite)
            sprite.setVisible(true)
            sprite.setData('row', writePos)
            sprite.setData('col', col)
            
            oldSprite.setVisible(false)
            
            // 애니메이션 효과
            const targetY = this.gameAreaY + writePos * this.cellSize + this.cellSize / 2
            this.tweens.add({
              targets: sprite,
              y: targetY,
              duration: 200,
              ease: 'Power2'
            })
          }
          writePos--
        }
      }
    }
  }
  
  fillEmptySpaces() {
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        if (this.grid[row][col] === null) {
          // 새로운 쓰레기 유형 생성, 즉시 일치 방지
          const newType = this.getSafeNewType(row, col)
          this.grid[row][col] = newType
          
          const sprite = this.gridSprites[row][col]
          sprite.setTexture(newType)
          this.setTrashSpriteScale(sprite)
          sprite.setVisible(true)
          sprite.setData('row', row)
          sprite.setData('col', col)
          
          // 새로운 타일도 호버 효과 유지 (이벤트 재바인딩)
          sprite.removeAllListeners() // 이전 이벤트 리스너 제거
          sprite.on('pointerdown', (pointer) => this.onTilePointerDown(sprite, pointer))
          sprite.on('pointermove', (pointer) => this.onTilePointerMove(sprite, pointer))
          sprite.on('pointerup', (pointer) => this.onTilePointerUp(sprite, pointer))
          sprite.on('pointerover', () => this.onTileHover(sprite))
          sprite.on('pointerout', () => this.onTileLeave(sprite))
          
          // 위에서 떨어지는 애니메이션
          sprite.y = this.gameAreaY - this.cellSize
          this.tweens.add({
            targets: sprite,
            y: this.gameAreaY + row * this.cellSize + this.cellSize / 2,
            duration: 300,
            ease: 'Bounce.easeOut'
          })
        }
      }
    }
  }
  
  getSafeNewType(row, col) {
    const maxAttempts = 10
    let attempts = 0
    
    while (attempts < maxAttempts) {
      const candidateType = Phaser.Utils.Array.GetRandom(this.trashTypes)
      
      // 임시로 이 유형으로 테스트하여 일치 방지 확인
      this.grid[row][col] = candidateType
      
      // 일치하는지 즉시 확인
      if (!this.hasMatchAt(row, col)) {
        // 안전한 유형, 즉시 일치 방지
        return candidateType
      }
      
      attempts++
    }
    
    // 시도 여러 번 모두 일치하면 랜덤 유형 반환 (연속 반응 허용)
    // 이 경우의 연속 반응은 게임 메커니즘으로 합리적임
    return Phaser.Utils.Array.GetRandom(this.trashTypes)
  }
  
  checkTurtleHatching() {
    // 매 두 번 제거 시 거북이 한 마리 육성
    const shouldHatch = Math.floor(this.totalMatches / 2)
    const currentHatched = this.turtleStates.filter(state => state !== 'egg').length
    
    if (shouldHatch > currentHatched) {
      // 새로운 거북이 필요
      for (let i = 0; i < this.turtleStates.length; i++) {
        if (this.turtleStates[i] === 'egg') {
          this.hatchTurtle(i)
          break // 한 번에 한 마리만 육성
        }
      }
    }
  }
  
  hatchTurtle(index) {
    // 거북이 이동 효과 재생
    this.turtleMoveSound.play()
    
    // 상태를 육성으로 변경
    this.turtleStates[index] = 'hatching'
    
    // 육성 효과 생성
    this.createHatchingEffect(index)
  }

  createHatchingEffect(index) {
    const eggX = this.turtleEggs[index].x
    const eggY = this.turtleEggs[index].y
    const currentEgg = this.turtleEggs[index]
    
    // 간소화 버전: 껍질이 바로 깨지면서 깨짐
    // 약간의 진동
    this.tweens.add({
      targets: currentEgg,
      x: eggX - 3,
      y: eggY - 1,
      duration: 60,
      yoyo: true,
      repeat: 3,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 바로 깨짐 상태로 전환
        currentEgg.setTexture('turtle_egg_cracking_3')
        this.time.delayedCall(300, () => {
          // 즉시 깨어나옴
          this.createHatchExplosion(index, eggX, eggY)
        })
      }
    })
    
    // 반짝임 효과
    this.tweens.add({
      targets: currentEgg,
      alpha: 0.7,
      duration: 80,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut'
    })
  }

  createHatchExplosion(index, eggX, eggY) {
    // 먼저 깨짐 순간의 이미지 표시
    this.turtleEggs[index].setTexture('turtle_egg_hatching')
    this.turtleEggs[index].x = eggX // 위치 재설정, 진동 보정 제거
    this.turtleEggs[index].y = eggY
    
    // 깨짐 순간의 반짝임 효과
    const flashOverlay = this.add.graphics()
    flashOverlay.fillStyle(0xffffff, 0.6)
    flashOverlay.fillCircle(eggX, eggY, 40)
    flashOverlay.setDepth(5)
    
    this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        flashOverlay.destroy()
      }
    })
    
    // 3D 카툰 스타일의 하트 파티클 효과 생성
    for (let i = 0; i < 6; i++) {
      const heart = this.add.text(eggX, eggY, '♥', {
        fontSize: '18px',
        fill: '#ff69b4',
        stroke: '#ffffff',
        strokeThickness: 2
      })
      heart.setDepth(4)
      
      const angle = (i / 6) * Math.PI * 2
      const distance = 60
      const targetX = eggX + Math.cos(angle) * distance
      const targetY = eggY + Math.sin(angle) * distance - 20
      
      this.tweens.add({
        targets: heart,
        x: targetX,
        y: targetY,
        scaleX: 0.3,
        scaleY: 0.3,
        alpha: 0,
        duration: 800,
        ease: 'Power2.easeOut',
        onComplete: () => {
          heart.destroy()
        }
      })
    }
    
    // 부드러운 별빛 반짝임 효과
    for (let i = 0; i < 4; i++) {
      const sparkle = this.add.text(eggX + (Math.random() - 0.5) * 60, eggY + (Math.random() - 0.5) * 40, '✨', {
        fontSize: '14px',
        fill: '#ffeb3b'
      })
      sparkle.setDepth(4)
      
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 30,
        alpha: 0,
        duration: 1000,
        ease: 'Sine.easeOut',
        onComplete: () => {
          sparkle.destroy()
        }
      })
    }
    
    // 잠시 깨짐 이미지 표시 후 숨김
    this.time.delayedCall(400, () => {
      this.turtleEggs[index].setVisible(false)
      this.sandNests[index].setVisible(false) // 동시에 모래 구덩이 숨김
      
      // 지연 후 소거북이 등장
      this.time.delayedCall(200, () => {
        this.spawnBabyTurtle(index)
      })
    })
  }

  spawnBabyTurtle(index) {
    // 소거북이 등장하고 초기 상태 설정
    this.babyTurtles[index].setVisible(true)
    this.babyTurtles[index].setScale(0)
    this.babyTurtles[index].setAlpha(0)
    
    // 즉시 올바른 방향으로 설정: 왼쪽 3마리는 왼쪽, 오른쪽 3마리는 오른쪽
    if (index < 3) {
      this.babyTurtles[index].setFlipX(true)  // 왼쪽 거북이 왼쪽
    } else {
      this.babyTurtles[index].setFlipX(false) // 오른쪽 거북이 오른쪽
    }
    
    // 소거북이 연극적으로 등장하는 애니메이션
    this.tweens.add({
      targets: this.babyTurtles[index],
      scaleX: 0.12, // 거북이 크기 증가, 더 명확하게 보이게 함
      scaleY: 0.12,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 작은 튕김 효과 추가
        this.tweens.add({
          targets: this.babyTurtles[index],
          y: this.babyTurtles[index].y - 10,
          duration: 200,
          yoyo: true,
          ease: 'Power2.easeOut',
          onComplete: () => {
            // 육성 완료 후 측면 움직임 시작
            this.startSidewaysMovement(index)
          }
        })
      }
    })
    
    // 하트 기호로 착한 표시 추가
    const heart = this.add.text(this.babyTurtles[index].x + 20, this.babyTurtles[index].y - 30, '♥', {
      fontSize: '16px',
      fill: '#ff69b4'
    })
    
    this.tweens.add({
      targets: heart,
      y: heart.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        heart.destroy()
      }
    })
    
    // 진행 바 업데이트
    this.updateProgressBar()
  }
  
  startSidewaysMovement(index) {
    const turtle = this.babyTurtles[index]
    let targetX
    
    // 상태를 측면으로 이동 중임을 변경
    this.turtleStates[index] = 'moving_to_side'
    
    // 거북이 방향: 왼쪽 3마리는 왼쪽, 오른쪽 3마리는 오른쪽
    if (index < 3) {
      // 왼쪽 거북이 왼쪽
      turtle.setFlipX(true) // X축 뒤집기, 거북이 왼쪽 방향
    } else {
      // 오른쪽 거북이 오른쪽 (기본 방향)
      turtle.setFlipX(false) // 뒤집지 않음, 거북이 오른쪽 방향 유지
    }
    
    // 움직임 애니메이션 재생
    turtle.play('turtle_crawl')
    turtle.setData('isMoving', true)
    
    // 목표 위치: 왼쪽 3마리는 화면 왼쪽 아래, 오른쪽 3마리는 화면 오른쪽 아래
    if (index < 3) {
      // 왼쪽 거북이: index 0,1,2는 화면 왼쪽 아래 각각 위치
      targetX = 50 + index * 60 // 왼쪽 가장자리 100픽셀 시작, 각각 60픽셀 간격
    } else {
      // 오른쪽 거북이: index 3,4,5는 화면 오른쪽 아래 각각 위치
      targetX = config.screenSize.width.value - 50 - (index - 3) * 60 // 오른쪽 가장자리 100픽셀 시작, 오른쪽에서 왼쪽으로 배열
    }
    
    turtle.setData('targetX', targetX)
    
    // 모래 모래 소리 재생
    this.sandShuffleSound.play()
    
    // 측면 움직임 애니메이션 재생
    this.tweens.add({
      targets: turtle,
      x: targetX,
      duration: 1500,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 측면 움직임 완료, 애니메이션 중지 및 첫 프레임으로 설정, 바다로 이동 준비
        turtle.stop()
        turtle.setTexture('baby_turtle_crawl_frame1') // 통일된 첫 프레임 사용
        turtle.setData('isMoving', false)
        this.turtleStates[index] = 'ready_for_sea'
      }
    })
  }
  
  showComboText() {
    // COMBO 텍스트 컨테이너 - 크기를 반으로 줄이고 위쪽 영역으로 이동
    const comboContainer = this.add.container(config.screenSize.width.value / 2, config.screenSize.height.value / 2 - 280)
    comboContainer.setDepth(25)
    comboContainer.setScale(0.5) // 전체를 반으로 축소
    
    // 폭발적인 반짝임 배경 생성
    const flashBg = this.add.graphics()
    flashBg.fillStyle(0xffffff, 0.8)
    flashBg.fillCircle(0, 0, 120)
    flashBg.setAlpha(0)
    
    // 다채색 원 배경 생성
    const colorRing = this.add.graphics()
    colorRing.lineStyle(12, 0x00ff88, 1)
    colorRing.strokeCircle(0, 0, 100)
    colorRing.lineStyle(8, 0xffeb3b, 0.8)
    colorRing.strokeCircle(0, 0, 85)
    colorRing.lineStyle(6, 0xff69b4, 0.6)
    colorRing.strokeCircle(0, 0, 70)
    colorRing.setScale(0)
    
    // 주 COMBO 텍스트 - 150% 확대
    const comboText = this.add.text(0, 0, 'COMBO!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px', // 80px * 1.5 = 120px
      fontStyle: 'bold',
      fill: '#ffeb3b',
      stroke: '#ff4444',
      strokeThickness: 18, // 12 * 1.5 = 18
      shadow: {
        offsetX: 9, // 6 * 1.5 = 9
        offsetY: 9, // 6 * 1.5 = 9
        color: '#000000',
        blur: 6, // 4 * 1.5 = 6
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5)
    
    // 3D 입체감 텍스트 배경
    const shadowText = this.add.text(4.5, 4.5, 'COMBO!', { // 3 * 1.5 = 4.5
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px', // 80px * 1.5 = 120px
      fontStyle: 'bold',
      fill: '#333333',
      stroke: '#000000',
      strokeThickness: 12, // 8 * 1.5 = 12
      align: 'center'
    }).setOrigin(0.5)
    
    // 발광 효과 텍스트
    const glowText = this.add.text(0, 0, 'COMBO!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px', // 80px * 1.5 = 120px
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#00ff88',
      strokeThickness: 30, // 20 * 1.5 = 30
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#00ff88',
        blur: 18, // 12 * 1.5 = 18
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.4)
    
    // 소거북이 뱃지들 - 여러 거북이가 둘러싸고, 위아래 거북이가 combo 텍스트에 더 가까움
    const turtleBadges = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      
      // 위치에 따라 반경 조정: 위아래 거북이가 combo 텍스트에 더 가까움, 좌우 거북이 최대한 멀리 떨어지게 함
      let radius = 300 // 좌우 거북이 최대한 멀리 떨어지게 함, 중복 방지
      if (i === 1 || i === 2 || i === 4 || i === 5) {
        radius = 140 // 위쪽 두 개와 아래쪽 두 개 거북이가 combo 텍스트에 더 가까움
      }
      
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      const badge = this.add.image(x, y, 'turtle_combo_badge')
      badge.setScale(0.08)
      badge.setAlpha(0)
      turtleBadges.push(badge)
    }
    
    // 하트 파티클 효과
    const hearts = []
    for (let i = 0; i < 8; i++) {
      const heart = this.add.text(0, 0, '♥', {
        fontSize: '24px',
        fill: '#ff69b4',
        stroke: '#ffffff',
        strokeThickness: 2
      }).setOrigin(0.5)
      heart.setScale(0)
      hearts.push(heart)
    }
    
    // 모든 요소를 컨테이너에 추가
    comboContainer.add([flashBg, colorRing, shadowText, glowText, comboText, ...turtleBadges, ...hearts])
    
    // 초기 상태
    comboContainer.setScale(0)
    comboContainer.setRotation(0)
    
    // 1단계: 폭발적인 반짝임
    this.tweens.add({
      targets: flashBg,
      alpha: 1,
      scaleX: 2,
      scaleY: 2,
      duration: 100,
      ease: 'Power3.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: flashBg,
          alpha: 0,
          duration: 200,
          ease: 'Power2.easeOut'
        })
      }
    })
    
    // 2단계: 주 컨테이너 탄성 등장 - 축소 값 조정으로 컨테이너 축소 조정
    this.tweens.add({
      targets: comboContainer,
      scale: 0.7, // 원래 1.4의 절반
      rotation: 0.1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 정상 크기로 탄성
        this.tweens.add({
          targets: comboContainer,
          scale: 0.5, // 원래 1.0의 절반
          rotation: 0,
          duration: 200,
          ease: 'Elastic.easeOut'
        })
      }
    })
    
    // 3단계: 다채색 원 확산
    this.tweens.add({
      targets: colorRing,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: colorRing,
          alpha: 0,
          scaleX: 2.0,
          scaleY: 2.0,
          duration: 600,
          ease: 'Power2.easeOut'
        })
      }
    })
    
    // 4단계: 거북이 뱃지들이 순차적으로 등장하고 회전
    turtleBadges.forEach((badge, index) => {
      this.time.delayedCall(100 + index * 50, () => {
        badge.setAlpha(1)
        this.tweens.add({
          targets: badge,
          scaleX: 0.12,
          scaleY: 0.12,
          rotation: Math.PI * 2,
          duration: 600,
          ease: 'Back.easeOut'
        })
      })
    })
    
    // 5단계: 하트 파티클 폭발
    hearts.forEach((heart, index) => {
      const angle = (index / hearts.length) * Math.PI * 2
      const distance = 100 + Math.random() * 50
      const targetX = Math.cos(angle) * distance
      const targetY = Math.sin(angle) * distance
      
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: heart,
          x: targetX,
          y: targetY,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 800,
          ease: 'Power2.easeOut'
        })
      })
    })
    
    // 발광 텍스트 펄스 효과
    this.tweens.add({
      targets: glowText,
      alpha: 0.8,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 4
    })
    
    // 주 텍스트 약간 흔들림
    this.tweens.add({
      targets: comboText,
      rotation: 0.05,
      duration: 150,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 6
    })
    
    // 최종 단계: 전체 서서히 사라짐
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: comboContainer,
        scale: 0.15, // 원래 0.3의 절반
        alpha: 0,
        y: comboContainer.y - 80,
        rotation: 0.2,
        duration: 500,
        ease: 'Power2.easeIn',
        onComplete: () => {
          comboContainer.destroy()
        }
      })
    })
  }
  
  moveHatchedTurtlesToSea() {
    // 모든 준비가 된 거북이가 바다로 이동하는 것을 바다로 약간 이동
    for (let i = 0; i < this.turtleStates.length; i++) {
      if (this.turtleStates[i] === 'ready_for_sea' || this.turtleStates[i] === 'moving_to_sea') {
        this.moveTurtleOneStepToSea(i)
      }
    }
  }
  
  moveTurtleOneStepToSea(index) {
    const turtle = this.babyTurtles[index]
    
    // 처음 바다로 이동할 때 상태 업데이트
    if (this.turtleStates[index] === 'ready_for_sea') {
      this.turtleStates[index] = 'moving_to_sea'
      
      // 거북이가 올바른 방향으로 이동하는지 확인: 왼쪽 3마리는 왼쪽, 오른쪽 3마리는 오른쪽
      if (index < 3) {
        turtle.setFlipX(true) // 왼쪽 거북이 왼쪽
      } else {
        turtle.setFlipX(false) // 오른쪽 거북이 오른쪽
      }
      
      // 움직임 애니메이션 재생
      turtle.play('turtle_crawl')
      turtle.setData('isMoving', true)
    }
    
    // 바다로 이동 진행 추가
    this.turtleSeaProgress[index]++
    
    // 새로운 Y 위치 계산 (바다로 이동하려면 6번 필요)
    const startY = this.gameAreaY + this.gridRows * this.cellSize + 50 // 원래 알의 위치
    const endY = 50 // 바다 위치
    const totalSteps = 6
    const stepSize = (startY - endY) / totalSteps
    const newY = startY - (this.turtleSeaProgress[index] * stepSize)
    
    // 모든 기존 움직임 중지 (하지만 완료된 측면 움직임에는 영향 없음)
    this.tweens.killTweensOf(turtle)
    
    // 모래 모래 소리 재생
    this.sandShuffleSound.play()
    
    // 바다로 약간 이동, 속도 느림
    this.tweens.add({
      targets: turtle,
      y: newY,
      duration: 1500, // 원래 3000보다 조금 느림
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 바다로 이동했는지 확인 (6번 이동했는지)
        if (this.turtleSeaProgress[index] >= 6) {
          // 바다에 도착, 거북이 구출
          this.turtleStates[index] = 'saved'
          this.savedTurtlesCount++
          // 애니메이션 중지 및 외관 일관성 보장
          turtle.stop()
          turtle.setTexture('baby_turtle_crawl_frame1') // 외관 통일
          turtle.setData('isMoving', false)
          turtle.setVisible(false)
          
          // 모든 거북이가 구출되었는지 확인
          this.checkAllTurtlesSaved()
        }
      }
    })
  }
  
  checkAllTurtlesSaved() {
    // 모든 거북이가 구출되었는지 확인
    const allSaved = this.turtleStates.every(state => state === 'saved')
    if (allSaved && this.gameState === 'playing') {
      // 모든 거북이가 구출되었으므로 즉시 승리!
      this.victory()
    }
  }

  checkAllTurtlesHatched() {
    const allHatched = this.turtleStates.every(state => state !== 'egg')
    if (allHatched) {
      // 만약 모든 거북이가 육성되었으면 승리 조건 고려 가능
      // 여기서는 일단 처리하지 않고, 시간이 끝난 후 통계 처리
    }
  }

  updateProgressBar() {
    // 육성 진행 계산
    const hatchedCount = this.turtleStates.filter(state => 
      state !== 'egg' && state !== 'hatching'
    ).length
    const progressRatio = hatchedCount / this.turtleStates.length
    const progressPercent = Math.round(progressRatio * 100)
    
    // 진행 바 채우기
    this.progressBar.clear()
    
    // 진행에 따라 다른 색상 사용
    let fillColor = 0x10b981 // 녹색 (정상)
    if (progressRatio >= 0.8) {
      fillColor = 0xfbbf24 // 황금색 (거의 완료)
    }
    if (progressRatio >= 1.0) {
      fillColor = 0x06d6a0 // 밝은 녹색 (완료)
    }
    
    this.progressBar.fillStyle(fillColor)
    this.progressBar.fillRoundedRect(-120, -8, 240 * progressRatio, 16, 8)
    
    // 진행 바 반짝임 효과
    if (progressRatio > 0) {
      this.progressBar.lineStyle(2, fillColor, 0.6)
      this.progressBar.strokeRoundedRect(-120, -8, 240 * progressRatio, 16, 8)
    }
    
    // 백분율 텍스트 업데이트
    this.progressPercentText.setText(`${progressPercent}%`)
    
    // 완료 시 축하 애니메이션
    if (progressRatio >= 1.0 && !this.progressCompleteAnimated) {
      this.progressCompleteAnimated = true
      this.tweens.add({
        targets: this.progressContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 300,
        ease: 'Back.easeOut',
        yoyo: true,
        repeat: 1
      })
    }
  }
  
  victory() {
    this.gameState = 'victory'
    this.gameTimer.remove()
    if (this.comboTimer) {
      this.comboTimer.remove()
    }
    this.backgroundMusic.stop()
    this.oceanWavesAmbient.stop()
    
    // 승리 효과 재생
    this.victorySound.play()
    
    // 승리 텍스트 표시
    const savedCount = this.savedTurtlesCount
    const totalTurtles = this.turtleStates.length
    const timeRemaining = this.timeLeft
    const isPerfect = savedCount === totalTurtles
    
    let victoryMessage = `AMAZING!\n${savedCount} out of ${totalTurtles} turtles saved!`
    
    // 모든 거북이가 구출되었으면 특별한 메시지 표시
    if (isPerfect) {
      victoryMessage = `PERFECT!\nAll ${totalTurtles} turtles saved!`
      if (timeRemaining > 0) {
        victoryMessage += `\nTime remaining: ${timeRemaining}s`
      }
    }
    
    // 승리 인터페이스 컨테이너 생성
    const victoryContainer = this.add.container(config.screenSize.width.value / 2, config.screenSize.height.value / 2)
    victoryContainer.setDepth(30)
    
    // 배경 가림
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(-config.screenSize.width.value/2, -config.screenSize.height.value/2, config.screenSize.width.value, config.screenSize.height.value)
    
    // 거북이 승리 아이콘
    const turtleVictoryIcon = this.add.image(0, -120, 'turtle_victory_icon')
    turtleVictoryIcon.setScale(isPerfect ? 0.35 : 0.3)
    
    // 승리 배경 꾸미기
    const victoryBg = this.add.graphics()
    if (isPerfect) {
      // 완벽한 승리의 황금색 원
      victoryBg.lineStyle(8, 0xffd700, 1)
      victoryBg.strokeCircle(0, 0, 200)
      victoryBg.lineStyle(4, 0xffff00, 0.8)
      victoryBg.strokeCircle(0, 0, 160)
    } else {
      // 일반적인 승리의 파란색 원
      victoryBg.lineStyle(6, 0x00ccff, 1)
      victoryBg.strokeCircle(0, 0, 180)
    }
    
    // 거북이 하트 꾸미기 원형
    const heartDecorations = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = 220
      const heartX = Math.cos(angle) * radius
      const heartY = Math.sin(angle) * radius
      const heart = this.add.image(heartX, heartY, 'turtle_heart_icon')
      heart.setScale(0.06)
      heart.setAlpha(0.7)
      heartDecorations.push(heart)
    }
    
    // 주 승리 텍스트
    const mainText = this.add.text(0, -30, victoryMessage, {
      fontFamily: 'Arial, sans-serif',
      fontSize: isPerfect ? '56px' : '52px',
      fontStyle: 'bold',
      fill: isPerfect ? '#00ff00' : '#ffff00',
      stroke: '#002200',
      strokeThickness: 7,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#001100',
        blur: 3,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5)
    
    // 발광 효과 텍스트
    const glowText = this.add.text(0, -30, victoryMessage, {
      fontFamily: 'Arial, sans-serif',
      fontSize: isPerfect ? '56px' : '52px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: isPerfect ? '#00ff00' : '#ffff00',
      strokeThickness: 12,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: isPerfect ? '#00ff00' : '#ffff00',
        blur: 8,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.4)
    
    // 계속하기 버튼
    const playAgainBtn = this.add.text(0, 120, 'Click to Play Again', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#003366',
      strokeThickness: 5,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#001122',
        blur: 2,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5).setInteractive()
    
    // 컨테이너에 추가
    victoryContainer.add([overlay, victoryBg, ...heartDecorations, turtleVictoryIcon, glowText, mainText, playAgainBtn])
    
    // 초기 상태: 투명하고 축소
    victoryContainer.setAlpha(0).setScale(0.3)
    
    // 승리 애니메이션 시퀀스
    // 1단계: 서서히 나타나면서 확대
    this.tweens.add({
      targets: victoryContainer,
      alpha: 1,
      scale: 1.1,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 2단계: 약간 탄성 후 정상 크기로 돌아옴
        this.tweens.add({
          targets: victoryContainer,
          scale: 1.0,
          duration: 200,
          ease: 'Bounce.easeOut'
        })
      }
    })
    
    // 배경 원형 회전 애니메이션
    this.tweens.add({
      targets: victoryBg,
      rotation: Math.PI * 2,
      duration: 4000,
      ease: 'Linear',
      repeat: -1
    })
    
    // 발광 텍스트 펄스 효과
    this.tweens.add({
      targets: glowText,
      alpha: 0.2,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // 거북이 승리 아이콘 애니메이션
    this.tweens.add({
      targets: turtleVictoryIcon,
      y: turtleVictoryIcon.y - 10,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // 거북이 하트 원형 회전 원형
    heartDecorations.forEach((heart, index) => {
      this.tweens.add({
        targets: heart,
        rotation: Math.PI * 2,
        duration: 3000 + (index * 200), // 각 하트는 다른 회전 속도
        ease: 'Linear',
        repeat: -1
      })
      
      // 하트 반짝임 효과
      this.tweens.add({
        targets: heart,
        alpha: 0.3,
        duration: 800 + (index * 100),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    })
    
    // 버튼 호버 효과
    playAgainBtn.on('pointerover', () => {
      this.tweens.add({
        targets: playAgainBtn,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200,
        ease: 'Power2.easeOut'
      })
    })
    
    playAgainBtn.on('pointerout', () => {
      this.tweens.add({
        targets: playAgainBtn,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Power2.easeOut'
      })
    })
    
    // 클릭하여 다시 시작
    playAgainBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: victoryContainer,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          this.scene.restart()
        }
      })
    })
    
    // 완벽한 승리의 추가적인 축하 효과
    if (isPerfect) {
      this.createCelebrationParticles()
    }
  }
  
  createCelebrationParticles() {
    // 축하 파티클 효과 생성
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics()
      particle.fillStyle(Phaser.Utils.Array.GetRandom([0xffd700, 0xffff00, 0x00ff00, 0x00ccff]), 1)
      particle.fillCircle(0, 0, Phaser.Math.Between(3, 8))
      
      const startX = Phaser.Math.Between(100, config.screenSize.width.value - 100)
      const startY = Phaser.Math.Between(100, config.screenSize.height.value - 100)
      particle.setPosition(startX, startY)
      particle.setDepth(25)
      
      // 파티클 애니메이션
      this.tweens.add({
        targets: particle,
        x: startX + Phaser.Math.Between(-200, 200),
        y: startY + Phaser.Math.Between(-150, 150),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: Phaser.Math.Between(1000, 2000),
        ease: 'Power2.easeOut',
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => {
          particle.destroy()
        }
      })
    }
  }
  
  gameOver() {
    this.gameState = 'gameover'
    this.gameTimer.remove()
    if (this.comboTimer) {
      this.comboTimer.remove()
    }
    
    // 구출된 거북이 수 계산
    const savedCount = this.savedTurtlesCount
    const totalTurtles = this.turtleStates.length
    const isAllSaved = savedCount === totalTurtles
    const saveRate = savedCount / totalTurtles
    
    // 시간 종료 효과 생성
    this.createTimeUpEffect(isAllSaved, saveRate, savedCount, totalTurtles)
  }
  
  createTimeUpEffect(isAllSaved, saveRate, savedCount, totalTurtles) {
    // 바로 효과 재생 및 배경 음악 중지
    this.gameOverSound.play()
    this.backgroundMusic.stop()
    this.oceanWavesAmbient.stop()
    
    // 주 인터페이스 표시
    this.time.delayedCall(400, () => {
      this.showGameOverInterface(isAllSaved, saveRate, savedCount, totalTurtles)
    })
    
    // TIME UP 큰 글씨 크게 등장
    this.createTimeUpText()
  }
  
  createTimeUpText() {
    const timeUpContainer = this.add.container(config.screenSize.width.value / 2, config.screenSize.height.value / 2 - 100)
    timeUpContainer.setDepth(40)
    
    // TIME UP 글씨의 3D 입체감 효과 (폭발 원 배경 제거)
    const shadowText = this.add.text(8, 8, 'TIME UP!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px',
      fontStyle: 'bold',
      fill: '#000000',
      align: 'center'
    }).setOrigin(0.5)
    
    const mainText = this.add.text(0, 0, 'TIME UP!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px',
      fontStyle: 'bold',
      fill: '#ff0000',
      stroke: '#ffff00',
      strokeThickness: 15,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ff0000',
        blur: 20,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5)
    
    const glowText = this.add.text(0, 0, 'TIME UP!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#ff0000',
      strokeThickness: 25,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ffffff',
        blur: 30,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.3)
    
    timeUpContainer.add([shadowText, glowText, mainText])
    timeUpContainer.setScale(0)
    
    // 폭발적인 등장 애니메이션 (폭발 원 애니메이션 제거)
    this.tweens.add({
      targets: timeUpContainer,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: timeUpContainer,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 200,
          ease: 'Elastic.easeOut'
        })
      }
    })
    
    // 텍스트 진동 효과
    this.tweens.add({
      targets: mainText,
      rotation: 0.05,
      duration: 100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 8
    })
    
    // 발광 효과 펄스
    this.tweens.add({
      targets: glowText,
      alpha: 0.6,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 250,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 6
    })
    
    // 1.5초 후 위로 이동하면서 사라짐
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: timeUpContainer,
        y: timeUpContainer.y - 150,
        alpha: 0,
        scale: 0.5,
        duration: 800,
        ease: 'Power2.easeIn',
        onComplete: () => {
          timeUpContainer.destroy()
        }
      })
    })
  }
  
  showGameOverInterface(isAllSaved, saveRate, savedCount, totalTurtles) {
    // 게임 종료 인터페이스 컨테이너 생성
    const gameOverContainer = this.add.container(config.screenSize.width.value / 2, config.screenSize.height.value / 2 + 50)
    gameOverContainer.setDepth(30)
    
    // 전체 화면 짙은 투명 커버 추가
    const overlay = this.add.graphics()
    overlay.fillStyle(0x333333, 0.7)  // 짙은 투명색
    overlay.fillRect(0, 0, config.screenSize.width.value, config.screenSize.height.value)  // 전체 화면 커버
    overlay.setDepth(29)  // 다른 요소 아래에 배치
    
    // 거북이 아이콘 - 더 크고 눈에 띄는 것
    let turtleIcon
    if (isAllSaved) {
      turtleIcon = this.add.image(0, -100, 'turtle_victory_icon')
      turtleIcon.setScale(0.4)
    } else if (saveRate > 0.5) {
      turtleIcon = this.add.image(0, -100, 'baby_turtle')
      turtleIcon.setScale(0.25)
      turtleIcon.setTint(0xaaaaff) // 파란색으로 일부 성공 표시
    } else {
      turtleIcon = this.add.image(0, -100, 'baby_turtle')
      turtleIcon.setScale(0.2)
      turtleIcon.setTint(0x888888) // 회색으로 실패 표시
    }
    
    // 결과 텍스트 - 더 크고 더 놀라운 것
    let resultText = ''
    let textColor = '#ffffff'
    let strokeColor = '#000000'
    
    if (isAllSaved) {
      resultText = `PERFECT RESCUE!\nAll ${totalTurtles} turtles saved!\nYou're a hero! 🌟`
      textColor = '#ffd700'
      strokeColor = '#ff4444'
    } else if (saveRate >= 0.8) {
      resultText = `EXCELLENT WORK!\n${savedCount} out of ${totalTurtles} turtles saved!\nAlmost perfect! 💪`
      textColor = '#00ff88'
      strokeColor = '#003366'
    } else if (saveRate >= 0.5) {
      resultText = `GOOD EFFORT!\n${savedCount} out of ${totalTurtles} turtles saved!\nYou can do better! 🐢`
      textColor = '#ff8800'
      strokeColor = '#003366'
    } else if (savedCount > 0) {
      resultText = `NEED MORE PRACTICE!\n${savedCount} out of ${totalTurtles} turtles saved!\nDon't give up! 💙`
      textColor = '#ff4444'
      strokeColor = '#ffffff'
    } else {
      resultText = `OH NO!\nNo turtles were saved...\nThey need your help! 😢`
      textColor = '#ff0000'
      strokeColor = '#ffffff'
    }
    
    const resultTextObj = this.add.text(0, 20, resultText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      fill: textColor,
      stroke: strokeColor,
      strokeThickness: 6,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#000000',
        blur: 3,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5)
    
    // 동적 꾸미기 요소
    const decorativeElements = []
    if (isAllSaved) {
      // 성공 시 별과 하트
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const radius = 200 + Math.random() * 50
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius - 50
        
        const element = this.add.text(x, y, i % 2 === 0 ? '⭐' : '💖', {
          fontSize: '32px'
        }).setOrigin(0.5)
        element.setScale(0)
        decorativeElements.push(element)
      }
    } else if (saveRate > 0.5) {
      // 일부 성공 시 소거북이
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const radius = 180
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius - 50
        
        const turtle = this.add.image(x, y, 'baby_turtle')
        turtle.setScale(0.08)
        turtle.setAlpha(0)
        decorativeElements.push(turtle)
      }
    }
    
    // 다시 시도 버튼 - 더 눈에 띄는 것
    const retryBtn = this.add.text(0, 140, '🔄 Try Again', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#00ccff',
      strokeThickness: 6,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000066',
        blur: 3,
        fill: true
      },
      align: 'center'
    }).setOrigin(0.5).setInteractive()
    
    // 컨테이너에 추가 (resultBg 원 애니메이션 제거)
    gameOverContainer.add([turtleIcon, resultTextObj, retryBtn, ...decorativeElements])
    
    // 별도로 커버 추가, 컨테이너 안에 넣지 않음
    this.add.existing(overlay)
    
    // 인터페이스 진입 애니메이션
    gameOverContainer.setAlpha(0).setScale(0.5)
    this.tweens.add({
      targets: gameOverContainer,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut'
    })
    
    // 거북이 아이콘 튕김 애니메이션
    this.tweens.add({
      targets: turtleIcon,
      y: turtleIcon.y - 10,
      scaleX: turtleIcon.scaleX * 1.1,
      scaleY: turtleIcon.scaleY * 1.1,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // 꾸미기 요소 애니메이션
    decorativeElements.forEach((element, index) => {
      this.time.delayedCall(200 + index * 100, () => {
        if (isAllSaved) {
          // 별과 하트 튕김 애니메이션
          this.tweens.add({
            targets: element,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
              // 지속적으로 회전
              this.tweens.add({
                targets: element,
                rotation: Math.PI * 2,
                duration: 3000 + Math.random() * 2000,
                ease: 'Linear',
                repeat: -1
              })
            }
          })
        } else if (element.texture) {
          // 소거북이 등장 애니메이션
          this.tweens.add({
            targets: element,
            alpha: 0.6,
            scaleX: 0.12,
            scaleY: 0.12,
            duration: 500,
            ease: 'Back.easeOut'
          })
        }
      })
    })
    
    // 버튼 상호작용 효과
    retryBtn.on('pointerover', () => {
      this.tweens.add({
        targets: retryBtn,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 200,
        ease: 'Back.easeOut'
      })
    })
    
    retryBtn.on('pointerout', () => {
      this.tweens.add({
        targets: retryBtn,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200
      })
    })
    
    retryBtn.on('pointerdown', () => {
      // 클릭 효과 재생
      this.uiClickSound.play()
      
      this.tweens.add({
        targets: gameOverContainer,
        alpha: 0,
        scale: 0.3,
        rotation: 0.1,
        duration: 400,
        ease: 'Power2.easeIn',
        onComplete: () => {
          this.scene.restart()
        }
      })
    })
  }



  update() {
    // 게임 주 루프 업데이트
  }
}
