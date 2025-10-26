import Phaser from "phaser"
import { gameConfig, turtleConfig, audioConfig, screenSize } from '../gameConfig.json'

export default class GameScene extends Phaser.Scene {
  constructor(config = { key: 'GameScene' }) {
    super(config)
    
    // 游戏区域定位（固定值）
    this.gridRows = gameConfig.gridRows.value
    this.gridCols = gameConfig.gridCols.value
    this.cellSize = gameConfig.cellSize.value
    this.gameAreaX = (screenSize.width.value - this.gridCols * this.cellSize) / 2
    this.gameAreaY = 200 // 从顶部留出更多UI空间
    this.trashTypes = ['front_view_trash_tile_plastic_bottle', 'front_view_trash_tile_plastic_bag', 'front_view_trash_tile_soda_can', 'front_view_trash_tile_food_wrapper', 'front_view_trash_tile_cigarette_butt', 'front_view_trash_tile_paper_cup', 'front_view_trash_tile_glass_bottle', 'front_view_trash_tile_aluminum_foil']
  }
  
  init() {
    // 重置所有游戏状态变量
    this.gameState = 'playing' // 'playing', 'victory', 'gameover'
    this.timeLeft = gameConfig.gameTime.value
    this.selectedTile = null
    this.isDragging = false
    
    // 网格相关
    this.grid = []
    this.gridSprites = []
    
    // 乌龟相关
    this.turtlePosition = turtleConfig.initialPosition.value
    this.turtleTarget = turtleConfig.targetPosition.value
    this.consecutiveMatches = 0 // 连续消除计数
    this.isComboActive = false // combo状态
    this.turtleStates = [] // 每只乌龟的状态：'egg', 'hatching', 'moving_to_side', 'ready_for_sea', 'moving_to_sea', 'saved'
    this.savedTurtlesCount = 0 // 已拯救的乌龟数量
    this.totalMatches = 0 // 总消除次数（用于孵化计算）
    this.turtleEggs = []
    this.babyTurtles = []
    this.sandNests = []
    
    // Combo系统 - 基于3秒内的消除次数
    this.comboTimeWindow = 3000 // 3秒时间窗口
    this.comboMinMatches = 3 // 最少3次消除才算combo
    this.matchTimestamps = [] // 记录每次消除的时间戳
    this.isComboActive = false
    this.lastComboTime = 0 // 记录上次combo触发的时间
    this.isInChainReaction = false // 标记是否在连锁反应中
    this.chainStartTime = 0 // 连锁反应开始时间
    this.turtleSeaProgress = [] // 每只乌龟向海爬行的进度（0-6）
    
    // 清理定时器
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
    // 所有资源已在LoadingScene中统一加载，无需重复加载
  }

  create() {
    // 创建背景
    this.createBackground()
    
    // 初始化音频
    this.initAudio()
    
    // 创建动画
    this.createAnimations()
    
    // 创建游戏网格
    this.createGrid()
    
    // 创建UI
    this.createUI()
    
    // 创建乌龟
    this.createTurtle()
    
    // 设置输入
    this.setupInput()
    
    // 开始游戏计时器
    this.startGameTimer()
    
    // 开始combo状态检查定时器
    this.startComboTimer()
    
    // 播放背景音乐和海浪环境音效
    this.backgroundMusic.play()
    this.oceanWavesAmbient.play()
  }
  
  createBackground() {
    // 第一层：创建固定的浅黄色海滩背景（不会动）
    this.beachBackground = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'light_beach_background')
    
    // 计算沙滩背景缩放比例以适应屏幕
    const beachScaleX = screenSize.width.value / this.beachBackground.width
    const beachScaleY = screenSize.height.value / this.beachBackground.height
    const beachScale = Math.max(beachScaleX, beachScaleY)
    this.beachBackground.setScale(beachScale)
    
    // 第二层：创建可动的明亮海面图层（只在顶部1/5区域，带白色浪花）
    // 海面图层定位在屏幕顶部，上移以完全覆盖沙滩，左移一点点避免左边漏缝
    this.oceanLayer = this.add.image(screenSize.width.value / 2 - 5, -25, 'bright_ocean_with_waves')
    this.oceanLayer.setOrigin(0.5, 0) // 从顶部对齐
    
    // 计算海面图层缩放，让宽度适配屏幕
    const oceanScaleX = screenSize.width.value / this.oceanLayer.width
    // 高度按比例缩放，确保海面只占顶部1/5
    const targetOceanHeight = screenSize.height.value / 5 // 屏幕高度的1/5
    const oceanScaleY = targetOceanHeight / this.oceanLayer.height
    const oceanScale = Math.max(oceanScaleX, oceanScaleY)
    this.oceanLayer.setScale(oceanScale)
    
    // 保存海面图层的初始位置，用于潮汐动画
    this.oceanInitialY = this.oceanLayer.y
    
    // 为海面图层添加潮汐动画效果
    this.createTidalAnimation()
  }

  createTidalAnimation() {
    // 创建海面图层的潮汐动画效果 - 配合海浪音效的节奏
    // 主要的潮汐波动 - 上下浮动模拟涨潮退潮（围绕1/5界限浮动）
    this.tweens.add({
      targets: this.oceanLayer,
      y: this.oceanInitialY - 8, // 向上移动8像素（涨潮）
      duration: 6000, // 6秒一个完整涨潮周期，配合海浪音效
      ease: 'Sine.easeInOut',
      yoyo: true, // 自动反向创造退潮效果
      repeat: -1, // 无限循环模拟持续的潮汐
    })
    
    // 次要的波浪摆动 - 模拟海浪的左右轻微摇摆
    this.tweens.add({
      targets: this.oceanLayer,
      x: this.oceanLayer.x + 4, // 横向轻微摆动
      duration: 4500, // 不同的周期创造自然的复合效果
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 1500 // 延迟启动，与主波动形成复合节奏
    })
    
    // 透明度变化模拟海水深度和阳光反射
    this.tweens.add({
      targets: this.oceanLayer,
      alpha: 0.92, // 轻微的透明度变化，模拟光线折射
      duration: 8000, // 更长的周期模拟光线变化
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 2000 // 轻微延迟创造更自然的效果
    })
    
    // 轻微的垂直缩放变化模拟潮汐强度变化
    this.tweens.add({
      targets: this.oceanLayer,
      scaleY: this.oceanLayer.scaleY * 1.05, // 垂直方向轻微缩放变化
      duration: 7000, // 较长的周期模拟潮汐强度变化
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 3000
    })
  }
  
  initAudio() {
    // 初始化音效
    this.matchSound = this.sound.add('crisp_match_sound', { volume: audioConfig.soundVolume.value })
    this.swapSound = this.sound.add('swap_sound', { volume: audioConfig.soundVolume.value })
    this.turtleMoveSound = this.sound.add('turtle_move_sound', { volume: audioConfig.soundVolume.value })
    this.sandShuffleSound = this.sound.add('sand_shuffle_sound', { volume: audioConfig.soundVolume.value * 1.8 })
    this.victorySound = this.sound.add('victory_sound', { volume: audioConfig.soundVolume.value })
    this.gameOverSound = this.sound.add('game_over_sound', { volume: audioConfig.soundVolume.value })
    this.uiClickSound = this.sound.add('ui_click_sound', { volume: audioConfig.soundVolume.value })
    this.comboTriggerSound = this.sound.add('optimized_combo_sound', { volume: audioConfig.soundVolume.value * 1.2 })
    this.backgroundMusic = this.sound.add('summer_beach_vibes', { 
      volume: audioConfig.musicVolume.value * 0.4,
      loop: true 
    })
    this.oceanWavesAmbient = this.sound.add('ocean_waves_ambient', { 
      volume: audioConfig.musicVolume.value * 0.2,
      loop: true 
    })
  }
  
  createAnimations() {
    // 创建小乌龟游泳/爬动动画
    // 创建流畅的两帧爬行动画
    if (!this.anims.exists('turtle_crawl')) {
      this.anims.create({
        key: 'turtle_crawl',
        frames: [
          { key: 'baby_turtle_crawl_frame1', duration: 400 }, // 爬行动作第1帧
          { key: 'baby_turtle_crawl_frame2', duration: 400 }  // 爬行动作第2帧
        ],
        repeat: -1
      })
    }
  }
  
  // 辅助函数：设置垃圾图标的统一缩放
  setTrashSpriteScale(sprite) {
    const targetSize = this.cellSize * 0.8
    const baseScale = targetSize / Math.max(sprite.width, sprite.height)
    const scale = baseScale * 1.1 // 放大到110%
    sprite.setData('normalScale', scale) // 保存正常缩放值
    sprite.setData('hoverScale', scale * 1.25) // 保存悬停缩放值（在110%基础上再放大25%）
    sprite.setScale(scale)
  }

  createGrid() {
    // 网格数组已在init()中初始化，这里直接使用
    
    for (let row = 0; row < this.gridRows; row++) {
      this.grid[row] = []
      this.gridSprites[row] = []
      
      for (let col = 0; col < this.gridCols; col++) {
        // 随机选择垃圾类型
        const trashType = Phaser.Utils.Array.GetRandom(this.trashTypes)
        this.grid[row][col] = trashType
        
        // 创建精灵
        const x = this.gameAreaX + col * this.cellSize + this.cellSize / 2
        const y = this.gameAreaY + row * this.cellSize + this.cellSize / 2
        
        const sprite = this.add.image(x, y, trashType)
        this.setTrashSpriteScale(sprite)
        sprite.setInteractive()
        sprite.setData('row', row)
        sprite.setData('col', col)
        
        this.gridSprites[row][col] = sprite
        
        // 添加拖拽事件
        sprite.on('pointerdown', (pointer) => this.onTilePointerDown(sprite, pointer))
        sprite.on('pointermove', (pointer) => this.onTilePointerMove(sprite, pointer))
        sprite.on('pointerup', (pointer) => this.onTilePointerUp(sprite, pointer))
        
        // 添加悬停效果
        sprite.on('pointerover', () => this.onTileHover(sprite))
        sprite.on('pointerout', () => this.onTileLeave(sprite))
      }
    }
    
    // 确保初始状态没有匹配项
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
            // 随机更换为不同的垃圾类型
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
    // 创建现代化的UI面板
    this.createModernUIPanel()
    
    // 创建时间显示器
    this.createTimeDisplay()
    
    // 创建进度显示器
    this.createProgressDisplay()
    
    // 创建游戏信息面板
    this.createGameInfoPanel()
  }

  createModernUIPanel() {
    // 不创建背景面板，让UI元素直接显示在游戏场景上
    // 这样可以避免蓝色地板的问题，让UI更加清爽
  }

  createTimeDisplay() {
    // 时间显示容器 - 调整位置避免贴边缘
    const timeContainer = this.add.container(100, 50)
    
    // 时间图标背景 - 添加阴影和更好的视觉效果
    const timeShadow = this.add.graphics()
    timeShadow.fillStyle(0x000000, 0.3)
    timeShadow.fillRoundedRect(-48, -18, 100, 40, 10) // 阴影偏移
    
    const timeBg = this.add.graphics()
    timeBg.fillStyle(0x3b82f6, 0.9)
    timeBg.fillRoundedRect(-50, -20, 100, 40, 10)
    timeBg.lineStyle(2, 0x60a5fa, 1)
    timeBg.strokeRoundedRect(-50, -20, 100, 40, 10)
    
    // 时间图标 (⏰)
    const timeIcon = this.add.text(-35, 0, '⏰', {
      fontSize: '24px'
    }).setOrigin(0.5)
    
    // 时间文字
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
    
    // 添加脉冲动画
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
    // 进度显示容器 - 调整位置避免右侧贴边
    const progressContainer = this.add.container(screenSize.width.value - 200, 50)
    
    // 进度面板背景 - 添加阴影效果
    const progressShadow = this.add.graphics()
    progressShadow.fillStyle(0x000000, 0.3)
    progressShadow.fillRoundedRect(-148, -33, 300, 70, 15) // 阴影偏移
    
    const progressBg = this.add.graphics()
    progressBg.fillStyle(0x059669, 0.9)
    progressBg.fillRoundedRect(-150, -35, 300, 70, 15)
    progressBg.lineStyle(3, 0x10b981, 1)
    progressBg.strokeRoundedRect(-150, -35, 300, 70, 15)
    
    // 进度标题
    const progressTitle = this.add.text(0, -20, '🐢 Turtle Progress', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#064e3b',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5)
    
    // 进度条容器
    const progressBarContainer = this.add.container(0, 10)
    
    // 进度条背景
    this.progressBarBg = this.add.graphics()
    this.progressBarBg.fillStyle(0x064e3b, 0.8)
    this.progressBarBg.fillRoundedRect(-120, -8, 240, 16, 8)
    this.progressBarBg.lineStyle(2, 0x047857, 1)
    this.progressBarBg.strokeRoundedRect(-120, -8, 240, 16, 8)
    
    // 进度条填充
    this.progressBar = this.add.graphics()
    
    // 进度百分比文字
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
    // 中央信息面板 - 调整位置避免上方贴边
    const infoContainer = this.add.container(screenSize.width.value / 2, 50)
    
    // 信息面板背景 - 添加阴影效果
    const infoShadow = this.add.graphics()
    infoShadow.fillStyle(0x000000, 0.3)
    infoShadow.fillRoundedRect(-98, -23, 200, 50, 12) // 阴影偏移
    
    const infoBg = this.add.graphics()
    infoBg.fillStyle(0x7c3aed, 0.9)
    infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
    infoBg.lineStyle(2, 0x8b5cf6, 1)
    infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    
    // Combo状态显示
    this.comboText = this.add.text(0, -8, 'Ready!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#4c1d95',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5)
    
    // 匹配计数显示
    this.matchCountText = this.add.text(0, 8, 'Matches: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fill: '#e5e7eb',
      align: 'center'
    }).setOrigin(0.5)
    
    infoContainer.add([infoShadow, infoBg, this.comboText, this.matchCountText])
    infoContainer.setDepth(10)
    
    this.infoContainer = infoContainer
    
    // 初始化匹配计数
    this.totalMatches = 0
  }

  updateComboDisplay(text) {
    // 更新combo文本
    this.comboText.setText(text)
    
    // 添加视觉效果
    this.comboText.setFill('#ffeb3b')
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        // 恢复为正常状态
        this.time.delayedCall(1500, () => {
          this.comboText.setText('Ready!')
          this.comboText.setFill('#ffffff')
        })
      }
    })
    
    // 背景闪烁效果
    const infoBg = this.infoContainer.list[1] // 获取背景graphics (第二个元素，因为第一个是阴影)
    const originalColor = 0x7c3aed
    infoBg.clear()
    infoBg.fillStyle(0xfbbf24, 0.9) // 金色背景
    infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
    infoBg.lineStyle(2, 0xffeb3b, 1)
    infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    
    // 恢复原始背景
    this.time.delayedCall(2000, () => {
      infoBg.clear()
      infoBg.fillStyle(originalColor, 0.8)
      infoBg.fillRoundedRect(-100, -25, 200, 50, 12)
      infoBg.lineStyle(2, 0x8b5cf6, 1)
      infoBg.strokeRoundedRect(-100, -25, 200, 50, 12)
    })
  }
  
  createTurtle() {
    // 乌龟数组已在init()中初始化，这里直接使用
    
    // 在游戏区域下方创建乌龟蛋，调整位置确保完整显示
    const eggY = this.gameAreaY + this.gridRows * this.cellSize + 50
    
    for (let i = 0; i < 6; i++) {
      // 初始化乌龟状态和向海进度
      this.turtleStates.push('egg')
      this.turtleSeaProgress.push(0)
      
      const eggX = this.gameAreaX + (i + 1) * (this.gridCols * this.cellSize / 7)
      
      // 先创建沙坑（在蛋的下方）
      const sandNest = this.add.image(eggX, eggY + 5, 'turtle_egg_sand_nest')
      sandNest.setScale(0.15) // 增大沙坑尺寸，让其更明显
      sandNest.setDepth(0) // 设置为0，让沙坑可见
      this.sandNests.push(sandNest)
      
      // 然后创建乌龟蛋
      const egg = this.add.image(eggX, eggY, 'turtle_egg')
      egg.setScale(0.108) // 缩小到90%：0.12 * 0.9
      egg.setDepth(1) // 确保乌龟蛋在沙坑之上
      this.turtleEggs.push(egg)
      
      // 创建对应的小乌龟动画精灵（初始隐藏）
      const turtle = this.add.sprite(eggX, eggY, 'baby_turtle')
      turtle.setScale(0.12) // 放大乌龟尺寸，使其更清晰可见
      turtle.setVisible(false)
      turtle.setDepth(2) // 确保小乌龟在最上层
      turtle.setData('originalX', eggX) // 记录原始X位置
      turtle.setData('targetX', eggX) // 目标X位置，初始等于原始位置
      turtle.setData('isMoving', false) // 记录是否正在移动
      this.babyTurtles.push(turtle)
    }
  }
  
  setupInput() {
    // 设置全局指针事件
    this.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false
        this.selectedTile = null
      }
    })
  }
  
  startGameTimer() {
    // 创建游戏计时器
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
    
    // 时间不足时的警告效果
    if (this.timeLeft <= 30 && this.timeLeft > 0) {
      // 时间紧急时变红色并闪烁
      this.timeText.setFill(this.timeLeft <= 10 ? '#ff4444' : '#ff8800')
      
      if (this.timeLeft <= 10) {
        // 最后10秒强烈闪烁
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
    // 创建combo状态检查定时器，每0.5秒检查一次
    this.comboTimer = this.time.addEvent({
      delay: 500, // 每500毫秒检查一次
      callback: this.updateComboStatus,
      callbackScope: this,
      loop: true
    })
  }
  
  updateComboStatus() {
    if (this.gameState !== 'playing') return
    
    const currentTime = this.time.now
    this.cleanOldTimestamps(currentTime)
    
    // 检查combo状态是否应该重置
    if (this.isComboActive && currentTime - this.lastComboTime > 1000) {
      // combo动画播放完成后1秒重置状态
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
      // 确定拖拽方向
      const deltaX = pointer.x - this.dragStartX
      const deltaY = pointer.y - this.dragStartY
      
      let targetRow = this.selectedTile.getData('row')
      let targetCol = this.selectedTile.getData('col')
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平拖拽
        targetCol += deltaX > 0 ? 1 : -1
      } else {
        // 垂直拖拽
        targetRow += deltaY > 0 ? 1 : -1
      }
      
      // 检查边界
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
  
  // 鼠标悬停效果
  onTileHover(sprite) {
    if (this.gameState !== 'playing' || this.isDragging) return
    
    const hoverScale = sprite.getData('hoverScale')
    if (hoverScale) {
      // 创建平滑的放大动画
      this.tweens.add({
        targets: sprite,
        scaleX: hoverScale,
        scaleY: hoverScale,
        duration: 150,
        ease: 'Power2'
      })
      
      // 提升深度，让悬停的方片显示在其他方片之上
      sprite.setDepth(10)
    }
  }
  
  // 鼠标离开效果
  onTileLeave(sprite) {
    if (this.gameState !== 'playing') return
    
    const normalScale = sprite.getData('normalScale')
    if (normalScale) {
      // 创建平滑的缩小动画
      this.tweens.add({
        targets: sprite,
        scaleX: normalScale,
        scaleY: normalScale,
        duration: 150,
        ease: 'Power2'
      })
      
      // 恢复正常深度
      sprite.setDepth(1)
    }
  }
  
  swapTiles(tile1, tile2) {
    if (!tile1 || !tile2) return
    
    const row1 = tile1.getData('row')
    const col1 = tile1.getData('col')
    const row2 = tile2.getData('row')
    const col2 = tile2.getData('col')
    
    // 播放交换音效
    this.swapSound.play()
    
    // 交换网格数据
    const temp = this.grid[row1][col1]
    this.grid[row1][col1] = this.grid[row2][col2]
    this.grid[row2][col2] = temp
    
    // 更新精灵纹理和缩放
    tile1.setTexture(this.grid[row1][col1])
    this.setTrashSpriteScale(tile1)
    tile2.setTexture(this.grid[row2][col2])
    this.setTrashSpriteScale(tile2)
    
    // 检查匹配
    this.time.delayedCall(100, () => {
      if (this.hasMatchAt(row1, col1) || this.hasMatchAt(row2, col2) ||
          this.findAllMatches().length > 0) {
        this.processMatches()
      } else {
        // 如果没有匹配，交换回来
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
    
    // 检查水平匹配
    let horizontalCount = 1
    
    // 向左检查
    for (let c = col - 1; c >= 0 && this.grid[row][c] === type; c--) {
      horizontalCount++
    }
    
    // 向右检查
    for (let c = col + 1; c < this.gridCols && this.grid[row][c] === type; c++) {
      horizontalCount++
    }
    
    if (horizontalCount >= gameConfig.minMatchCount.value) return true
    
    // 检查垂直匹配
    let verticalCount = 1
    
    // 向上检查
    for (let r = row - 1; r >= 0 && this.grid[r][col] === type; r--) {
      verticalCount++
    }
    
    // 向下检查
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
    
    // 获取水平匹配组
    const horizontalGroup = this.getHorizontalMatchGroup(startRow, startCol, type, visited)
    // 获取垂直匹配组
    const verticalGroup = this.getVerticalMatchGroup(startRow, startCol, type, visited)
    
    // 合并两个组（去重）
    const allPositions = new Set()
    
    // 添加水平匹配
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
    
    // 添加垂直匹配
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
    
    // 从当前位置向左扫描
    let leftCol = col
    while (leftCol >= 0 && this.grid[row][leftCol] === type) {
      leftCol--
    }
    leftCol++ // 回到最后一个匹配的位置
    
    // 从最左边向右收集所有匹配的位置
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
    
    // 从当前位置向上扫描
    let topRow = row
    while (topRow >= 0 && this.grid[topRow][col] === type) {
      topRow--
    }
    topRow++ // 回到最后一个匹配的位置
    
    // 从最上边向下收集所有匹配的位置
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
      // 没有匹配时，结束连锁反应
      this.isInChainReaction = false
      return
    }
    
    // 播放匹配音效
    this.matchSound.play()
    
    const currentTime = this.time.now
    
    // 如果不在连锁反应中，开始新的连锁反应
    if (!this.isInChainReaction) {
      this.isInChainReaction = true
      this.chainStartTime = currentTime
    }
    
    // 记录当前消除的时间戳
    this.matchTimestamps.push(currentTime)
    this.totalMatches++
    
    // 更新匹配计数显示
    this.matchCountText.setText(`Matches: ${this.totalMatches}`)
    
    // 检查combo条件
    this.checkComboCondition(currentTime)
    
    // 移除匹配的瓦片
    let totalRemoved = 0
    allMatches.forEach(matchGroup => {
      matchGroup.forEach(([row, col]) => {
        this.gridSprites[row][col].setVisible(false)
        this.grid[row][col] = null
        totalRemoved++
      })
    })
    
    // 检查是否需要孵化新乌龟（每两次消除孵化一只）
    this.checkTurtleHatching()
    
    // 延迟后填充空位并检查新的匹配
    this.time.delayedCall(300, () => {
      this.dropTiles()
      this.fillEmptySpaces()
      
      this.time.delayedCall(300, () => {
        // 递归检查新的匹配
        this.processMatches()
      })
    })
  }
  
  // 检查combo条件
  checkComboCondition(currentTime) {
    // 清理过期的时间戳（但不影响已经触发的combo）
    this.cleanOldTimestamps(currentTime)
    
    // 检查是否达到combo条件
    const validMatches = this.getValidMatchesForCombo(currentTime)
    
    if (validMatches >= this.comboMinMatches && !this.isComboActive) {
      // 触发combo
      this.isComboActive = true
      this.lastComboTime = currentTime
      this.showComboText()
      this.updateComboDisplay('COMBO!')
      this.comboTriggerSound.play()
      this.moveHatchedTurtlesToSea()
      
      // combo触发后，重置时间戳数组，但保留当前消除
      this.resetComboTracking(currentTime)
    }
  }
  
  // 获取有效的combo消除次数
  getValidMatchesForCombo(currentTime) {
    // 如果刚刚触发过combo（500ms内），不计算重叠的消除
    if (this.lastComboTime > 0 && currentTime - this.lastComboTime < 500) {
      return 0
    }
    
    // 计算在时间窗口内且不与上次combo重叠的消除次数
    return this.matchTimestamps.filter(timestamp => {
      return currentTime - timestamp <= this.comboTimeWindow &&
             (this.lastComboTime === 0 || timestamp > this.lastComboTime)
    }).length
  }
  
  // 重置combo追踪
  resetComboTracking(currentTime) {
    // 只保留当前这次消除，清除其他历史记录
    this.matchTimestamps = [currentTime]
    this.isComboActive = false
  }
  
  // 清理过期的时间戳
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
            // 移动瓦片
            this.grid[writePos][col] = this.grid[row][col]
            this.grid[row][col] = null
            
            // 更新精灵位置和纹理
            const sprite = this.gridSprites[writePos][col]
            const oldSprite = this.gridSprites[row][col]
            
            sprite.setTexture(this.grid[writePos][col])
            this.setTrashSpriteScale(sprite)
            sprite.setVisible(true)
            sprite.setData('row', writePos)
            sprite.setData('col', col)
            
            oldSprite.setVisible(false)
            
            // 动画效果
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
          // 生成新的垃圾类型，避免立即形成匹配
          const newType = this.getSafeNewType(row, col)
          this.grid[row][col] = newType
          
          const sprite = this.gridSprites[row][col]
          sprite.setTexture(newType)
          this.setTrashSpriteScale(sprite)
          sprite.setVisible(true)
          sprite.setData('row', row)
          sprite.setData('col', col)
          
          // 确保新方片也有悬停效果（重新绑定事件）
          sprite.removeAllListeners() // 清除旧的事件监听器
          sprite.on('pointerdown', (pointer) => this.onTilePointerDown(sprite, pointer))
          sprite.on('pointermove', (pointer) => this.onTilePointerMove(sprite, pointer))
          sprite.on('pointerup', (pointer) => this.onTilePointerUp(sprite, pointer))
          sprite.on('pointerover', () => this.onTileHover(sprite))
          sprite.on('pointerout', () => this.onTileLeave(sprite))
          
          // 从上方落下的动画
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
      
      // 临时设置这个类型来测试是否会造成匹配
      this.grid[row][col] = candidateType
      
      // 检查是否会立即形成匹配
      if (!this.hasMatchAt(row, col)) {
        // 安全的类型，不会立即匹配
        return candidateType
      }
      
      attempts++
    }
    
    // 如果尝试多次都会匹配，就返回随机类型（允许连锁反应）
    // 这种情况下的连锁反应是合理的游戏机制
    return Phaser.Utils.Array.GetRandom(this.trashTypes)
  }
  
  checkTurtleHatching() {
    // 每两次消除孵化一只乌龟
    const shouldHatch = Math.floor(this.totalMatches / 2)
    const currentHatched = this.turtleStates.filter(state => state !== 'egg').length
    
    if (shouldHatch > currentHatched) {
      // 需要孵化新乌龟
      for (let i = 0; i < this.turtleStates.length; i++) {
        if (this.turtleStates[i] === 'egg') {
          this.hatchTurtle(i)
          break // 一次只孵化一只
        }
      }
    }
  }
  
  hatchTurtle(index) {
    // 播放乌龟移动音效
    this.turtleMoveSound.play()
    
    // 更改状态为孵化中
    this.turtleStates[index] = 'hatching'
    
    // 创建孵化特效
    this.createHatchingEffect(index)
  }

  createHatchingEffect(index) {
    const eggX = this.turtleEggs[index].x
    const eggY = this.turtleEggs[index].y
    const currentEgg = this.turtleEggs[index]
    
    // 简化版：蛋壳直接出现碎裂然后破开
    // 轻微震动
    this.tweens.add({
      targets: currentEgg,
      x: eggX - 3,
      y: eggY - 1,
      duration: 60,
      yoyo: true,
      repeat: 3,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 直接切换到碎裂状态
        currentEgg.setTexture('turtle_egg_cracking_3')
        this.time.delayedCall(300, () => {
          // 立即破壳而出
          this.createHatchExplosion(index, eggX, eggY)
        })
      }
    })
    
    // 闪光效果
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
    // 先显示破壳瞬间的图像
    this.turtleEggs[index].setTexture('turtle_egg_hatching')
    this.turtleEggs[index].x = eggX // 重置位置，消除震动偏移
    this.turtleEggs[index].y = eggY
    
    // 破壳瞬间的闪光效果
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
    
    // 创建3D卡通风格的爱心粒子效果
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
    
    // 创建温和的星光闪烁
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
    
    // 短暂显示破壳图像后隐藏
    this.time.delayedCall(400, () => {
      this.turtleEggs[index].setVisible(false)
      this.sandNests[index].setVisible(false) // 同时隐藏沙坑
      
      // 延迟后小乌龟登场
      this.time.delayedCall(200, () => {
        this.spawnBabyTurtle(index)
      })
    })
  }

  spawnBabyTurtle(index) {
    // 显示小乌龟并设置初始状态
    this.babyTurtles[index].setVisible(true)
    this.babyTurtles[index].setScale(0)
    this.babyTurtles[index].setAlpha(0)
    
    // 立即设置正确的朝向：左侧三只朝左，右侧三只朝右
    if (index < 3) {
      this.babyTurtles[index].setFlipX(true)  // 左侧乌龟朝左
    } else {
      this.babyTurtles[index].setFlipX(false) // 右侧乌龟朝右
    }
    
    // 小乌龟戏剧性登场动画
    this.tweens.add({
      targets: this.babyTurtles[index],
      scaleX: 0.12, // 放大乌龟尺寸，使其更清晰可见
      scaleY: 0.12,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 添加一个小弹跳效果
        this.tweens.add({
          targets: this.babyTurtles[index],
          y: this.babyTurtles[index].y - 10,
          duration: 200,
          yoyo: true,
          ease: 'Power2.easeOut',
          onComplete: () => {
            // 孵化完成后开始侧向爬行
            this.startSidewaysMovement(index)
          }
        })
      }
    })
    
    // 创建心形符号表示可爱
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
    
    // 更新进度条
    this.updateProgressBar()
  }
  
  startSidewaysMovement(index) {
    const turtle = this.babyTurtles[index]
    let targetX
    
    // 更改状态为正在爬向边缘
    this.turtleStates[index] = 'moving_to_side'
    
    // 设置乌龟朝向：左边3只朝左，右边3只朝右
    if (index < 3) {
      // 左边的乌龟朝左
      turtle.setFlipX(true) // 翻转X轴，让乌龟朝左
    } else {
      // 右边的乌龟朝右（默认朝向）
      turtle.setFlipX(false) // 不翻转，保持朝右
    }
    
    // 开始播放爬动动画
    turtle.play('turtle_crawl')
    turtle.setData('isMoving', true)
    
    // 计算目标位置：左边3个爬到画面左下方，右边3个爬到画面右下方
    if (index < 3) {
      // 左边的乌龟：index 0,1,2 分别爬到画面左下角
      targetX = 50 + index * 60 // 距离左边缘50像素开始，每只间隔60像素
    } else {
      // 右边的乌龟：index 3,4,5 分别爬到画面右下角
      targetX = screenSize.width.value - 50 - (index - 3) * 60 // 距离右边缘50像素开始，从右往左排列
    }
    
    turtle.setData('targetX', targetX)
    
    // 播放沙子沙沙音效
    this.sandShuffleSound.play()
    
    // 开始侧向移动动画
    this.tweens.add({
      targets: turtle,
      x: targetX,
      duration: 1500,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 侧向爬行完成，停止动画并设置为第一帧，准备向海爬行
        turtle.stop()
        turtle.setTexture('baby_turtle_crawl_frame1') // 确保使用统一的第一帧
        turtle.setData('isMoving', false)
        this.turtleStates[index] = 'ready_for_sea'
      }
    })
  }
  
  showComboText() {
    // 创建COMBO文字容器 - 缩小到二分之一并移到上方区域
    const comboContainer = this.add.container(screenSize.width.value / 2, screenSize.height.value / 2 - 280)
    comboContainer.setDepth(25)
    comboContainer.setScale(0.5) // 整体缩放到二分之一
    
    // 创建爆炸式闪光背景
    const flashBg = this.add.graphics()
    flashBg.fillStyle(0xffffff, 0.8)
    flashBg.fillCircle(0, 0, 120)
    flashBg.setAlpha(0)
    
    // 创建彩色光环背景
    const colorRing = this.add.graphics()
    colorRing.lineStyle(12, 0x00ff88, 1)
    colorRing.strokeCircle(0, 0, 100)
    colorRing.lineStyle(8, 0xffeb3b, 0.8)
    colorRing.strokeCircle(0, 0, 85)
    colorRing.lineStyle(6, 0xff69b4, 0.6)
    colorRing.strokeCircle(0, 0, 70)
    colorRing.setScale(0)
    
    // 主COMBO文字 - 放大到150%
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
    
    // 3D立体效果文字背景
    const shadowText = this.add.text(4.5, 4.5, 'COMBO!', { // 3 * 1.5 = 4.5
      fontFamily: 'Arial, sans-serif',
      fontSize: '120px', // 80px * 1.5 = 120px
      fontStyle: 'bold',
      fill: '#333333',
      stroke: '#000000',
      strokeThickness: 12, // 8 * 1.5 = 12
      align: 'center'
    }).setOrigin(0.5)
    
    // 发光效果文字
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
    
    // 小乌龟徽章们 - 多个乌龟围绕，上下乌龟更靠近combo文字
    const turtleBadges = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      
      // 根据位置调整半径：上下乌龟靠近，左右乌龟最大化远离避免遮挡
      let radius = 300 // 左右乌龟最大化远离，确保与放大combo文字零冲突
      if (i === 1 || i === 2 || i === 4 || i === 5) {
        radius = 140 // 上面两个和下面两个乌龟更靠近combo文字
      }
      
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      const badge = this.add.image(x, y, 'turtle_combo_badge')
      badge.setScale(0.08)
      badge.setAlpha(0)
      turtleBadges.push(badge)
    }
    
    // 粒子爱心效果
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
    
    // 添加所有元素到容器
    comboContainer.add([flashBg, colorRing, shadowText, glowText, comboText, ...turtleBadges, ...hearts])
    
    // 初始状态
    comboContainer.setScale(0)
    comboContainer.setRotation(0)
    
    // 第1阶段：爆炸式闪现
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
    
    // 第2阶段：主容器弹性出现 - 调整缩放值适应容器缩小
    this.tweens.add({
      targets: comboContainer,
      scale: 0.7, // 原来1.4的一半
      rotation: 0.1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 回弹到正常大小
        this.tweens.add({
          targets: comboContainer,
          scale: 0.5, // 原来1.0的一半
          rotation: 0,
          duration: 200,
          ease: 'Elastic.easeOut'
        })
      }
    })
    
    // 第3阶段：彩色光环扩散
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
    
    // 第4阶段：乌龟徽章依次出现并旋转
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
    
    // 第5阶段：爱心粒子爆发
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
    
    // 发光文字脉冲效果
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
    
    // 主文字轻微摆动
    this.tweens.add({
      targets: comboText,
      rotation: 0.05,
      duration: 150,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 6
    })
    
    // 最终阶段：整体淡出消失
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: comboContainer,
        scale: 0.15, // 原来0.3的一半
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
    // 让所有已准备好向海爬行的乌龟向海边爬一小段
    for (let i = 0; i < this.turtleStates.length; i++) {
      if (this.turtleStates[i] === 'ready_for_sea' || this.turtleStates[i] === 'moving_to_sea') {
        this.moveTurtleOneStepToSea(i)
      }
    }
  }
  
  moveTurtleOneStepToSea(index) {
    const turtle = this.babyTurtles[index]
    
    // 第一次开始向海爬行时更新状态
    if (this.turtleStates[index] === 'ready_for_sea') {
      this.turtleStates[index] = 'moving_to_sea'
      
      // 确保乌龟朝向正确：左边3只朝左，右边3只朝右
      if (index < 3) {
        turtle.setFlipX(true) // 左边的乌龟朝左
      } else {
        turtle.setFlipX(false) // 右边的乌龟朝右
      }
      
      // 开始播放爬动动画
      turtle.play('turtle_crawl')
      turtle.setData('isMoving', true)
    }
    
    // 增加向海进度
    this.turtleSeaProgress[index]++
    
    // 计算新的Y位置（需要爬6次才能到达海边）
    const startY = this.gameAreaY + this.gridRows * this.cellSize + 50 // 原始蛋的位置
    const endY = 50 // 海边位置
    const totalSteps = 6
    const stepSize = (startY - endY) / totalSteps
    const newY = startY - (this.turtleSeaProgress[index] * stepSize)
    
    // 停止任何现有的移动（但不要影响已完成的侧向移动）
    this.tweens.killTweensOf(turtle)
    
    // 播放沙子沙沙音效
    this.sandShuffleSound.play()
    
    // 向海边爬一小段，速度较慢
    this.tweens.add({
      targets: turtle,
      y: newY,
      duration: 1500, // 比原来的3000慢一些
      ease: 'Power2.easeInOut',
      onComplete: () => {
        // 检查是否到达海边（爬了6次）
        if (this.turtleSeaProgress[index] >= 6) {
          // 到达海边，乌龟被拯救
          this.turtleStates[index] = 'saved'
          this.savedTurtlesCount++
          // 停止动画并确保外观一致
          turtle.stop()
          turtle.setTexture('baby_turtle_crawl_frame1') // 统一外观
          turtle.setData('isMoving', false)
          turtle.setVisible(false)
          
          // 检查是否所有乌龟都已被拯救
          this.checkAllTurtlesSaved()
        }
      }
    })
  }
  
  checkAllTurtlesSaved() {
    // 检查是否所有乌龟都已被拯救
    const allSaved = this.turtleStates.every(state => state === 'saved')
    if (allSaved && this.gameState === 'playing') {
      // 所有乌龟都被拯救，立即胜利！
      this.victory()
    }
  }

  checkAllTurtlesHatched() {
    const allHatched = this.turtleStates.every(state => state !== 'egg')
    if (allHatched) {
      // 如果所有乌龟都已孵化，可以考虑胜利条件
      // 这里暂时不做处理，等时间结束再统计
    }
  }

  updateProgressBar() {
    // 计算孵化进度
    const hatchedCount = this.turtleStates.filter(state => 
      state !== 'egg' && state !== 'hatching'
    ).length
    const progressRatio = hatchedCount / this.turtleStates.length
    const progressPercent = Math.round(progressRatio * 100)
    
    // 更新进度条填充
    this.progressBar.clear()
    
    // 根据进度使用不同颜色
    let fillColor = 0x10b981 // 绿色 (正常)
    if (progressRatio >= 0.8) {
      fillColor = 0xfbbf24 // 金色 (接近完成)
    }
    if (progressRatio >= 1.0) {
      fillColor = 0x06d6a0 // 亮绿色 (完成)
    }
    
    this.progressBar.fillStyle(fillColor)
    this.progressBar.fillRoundedRect(-120, -8, 240 * progressRatio, 16, 8)
    
    // 添加进度条光晕效果
    if (progressRatio > 0) {
      this.progressBar.lineStyle(2, fillColor, 0.6)
      this.progressBar.strokeRoundedRect(-120, -8, 240 * progressRatio, 16, 8)
    }
    
    // 更新百分比文字
    this.progressPercentText.setText(`${progressPercent}%`)
    
    // 完成时的庆祝动画
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
    
    // 播放胜利音效
    this.victorySound.play()
    
    // 显示胜利文字
    const savedCount = this.savedTurtlesCount
    const totalTurtles = this.turtleStates.length
    const timeRemaining = this.timeLeft
    const isPerfect = savedCount === totalTurtles
    
    let victoryMessage = `AMAZING!\n${savedCount} out of ${totalTurtles} turtles saved!`
    
    // 如果所有乌龟都被拯救，显示特殊消息
    if (isPerfect) {
      victoryMessage = `PERFECT!\nAll ${totalTurtles} turtles saved!`
      if (timeRemaining > 0) {
        victoryMessage += `\nTime remaining: ${timeRemaining}s`
      }
    }
    
    // 创建胜利界面容器
    const victoryContainer = this.add.container(screenSize.width.value / 2, screenSize.height.value / 2)
    victoryContainer.setDepth(30)
    
    // 背景遮罩
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(-screenSize.width.value/2, -screenSize.height.value/2, screenSize.width.value, screenSize.height.value)
    
    // 乌龟胜利图标
    const turtleVictoryIcon = this.add.image(0, -120, 'turtle_victory_icon')
    turtleVictoryIcon.setScale(isPerfect ? 0.35 : 0.3)
    
    // 胜利背景装饰
    const victoryBg = this.add.graphics()
    if (isPerfect) {
      // 完美胜利的金色光环
      victoryBg.lineStyle(8, 0xffd700, 1)
      victoryBg.strokeCircle(0, 0, 200)
      victoryBg.lineStyle(4, 0xffff00, 0.8)
      victoryBg.strokeCircle(0, 0, 160)
    } else {
      // 普通胜利的蓝色光环
      victoryBg.lineStyle(6, 0x00ccff, 1)
      victoryBg.strokeCircle(0, 0, 180)
    }
    
    // 乌龟爱心装饰环绕
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
    
    // 主胜利文字
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
    
    // 发光效果文字
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
    
    // 继续游戏按钮
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
    
    // 添加到容器
    victoryContainer.add([overlay, victoryBg, ...heartDecorations, turtleVictoryIcon, glowText, mainText, playAgainBtn])
    
    // 初始状态：透明且缩小
    victoryContainer.setAlpha(0).setScale(0.3)
    
    // 胜利动画序列
    // 第1阶段：淡入并放大
    this.tweens.add({
      targets: victoryContainer,
      alpha: 1,
      scale: 1.1,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 第2阶段：轻微回弹到正常大小
        this.tweens.add({
          targets: victoryContainer,
          scale: 1.0,
          duration: 200,
          ease: 'Bounce.easeOut'
        })
      }
    })
    
    // 背景光环旋转动画
    this.tweens.add({
      targets: victoryBg,
      rotation: Math.PI * 2,
      duration: 4000,
      ease: 'Linear',
      repeat: -1
    })
    
    // 发光文字脉冲效果
    this.tweens.add({
      targets: glowText,
      alpha: 0.2,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // 乌龟胜利图标动画
    this.tweens.add({
      targets: turtleVictoryIcon,
      y: turtleVictoryIcon.y - 10,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // 乌龟爱心环绕旋转
    heartDecorations.forEach((heart, index) => {
      this.tweens.add({
        targets: heart,
        rotation: Math.PI * 2,
        duration: 3000 + (index * 200), // 每个爱心有不同的旋转速度
        ease: 'Linear',
        repeat: -1
      })
      
      // 爱心闪烁效果
      this.tweens.add({
        targets: heart,
        alpha: 0.3,
        duration: 800 + (index * 100),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    })
    
    // 按钮悬停效果
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
    
    // 点击重新开始
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
    
    // 完美胜利的额外庆祝效果
    if (isPerfect) {
      this.createCelebrationParticles()
    }
  }
  
  createCelebrationParticles() {
    // 创建庆祝粒子效果
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics()
      particle.fillStyle(Phaser.Utils.Array.GetRandom([0xffd700, 0xffff00, 0x00ff00, 0x00ccff]), 1)
      particle.fillCircle(0, 0, Phaser.Math.Between(3, 8))
      
      const startX = Phaser.Math.Between(100, screenSize.width.value - 100)
      const startY = Phaser.Math.Between(100, screenSize.height.value - 100)
      particle.setPosition(startX, startY)
      particle.setDepth(25)
      
      // 粒子动画
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
    
    // 计算拯救的乌龟数量
    const savedCount = this.savedTurtlesCount
    const totalTurtles = this.turtleStates.length
    const isAllSaved = savedCount === totalTurtles
    const saveRate = savedCount / totalTurtles
    
    // 创建时间结束动效
    this.createTimeUpEffect(isAllSaved, saveRate, savedCount, totalTurtles)
  }
  
  createTimeUpEffect(isAllSaved, saveRate, savedCount, totalTurtles) {
    // 直接播放音效和停止背景音乐
    this.gameOverSound.play()
    this.backgroundMusic.stop()
    this.oceanWavesAmbient.stop()
    
    // 显示主要界面
    this.time.delayedCall(400, () => {
      this.showGameOverInterface(isAllSaved, saveRate, savedCount, totalTurtles)
    })
    
    // 创建TIME UP巨大文字震撼登场
    this.createTimeUpText()
  }
  
  createTimeUpText() {
    const timeUpContainer = this.add.container(screenSize.width.value / 2, screenSize.height.value / 2 - 100)
    timeUpContainer.setDepth(40)
    
    // 创建TIME UP文字的3D立体效果（去掉爆炸圆圈背景）
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
    
    // 爆炸式登场动画（去掉圆圈动画）
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
    
    // 文字震动效果
    this.tweens.add({
      targets: mainText,
      rotation: 0.05,
      duration: 100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 8
    })
    
    // 发光效果脉冲
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
    
    // 1.5秒后开始上移并淡出
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
    // 创建游戏结束界面容器
    const gameOverContainer = this.add.container(screenSize.width.value / 2, screenSize.height.value / 2 + 50)
    gameOverContainer.setDepth(30)
    
    // 创建全屏深灰透明覆盖层
    const overlay = this.add.graphics()
    overlay.fillStyle(0x333333, 0.7)  // 深灰透明色
    overlay.fillRect(0, 0, screenSize.width.value, screenSize.height.value)  // 覆盖整个屏幕
    overlay.setDepth(29)  // 确保在其他元素下方
    
    // 乌龟图标 - 更大更显眼
    let turtleIcon
    if (isAllSaved) {
      turtleIcon = this.add.image(0, -100, 'turtle_victory_icon')
      turtleIcon.setScale(0.4)
    } else if (saveRate > 0.5) {
      turtleIcon = this.add.image(0, -100, 'baby_turtle')
      turtleIcon.setScale(0.25)
      turtleIcon.setTint(0xaaaaff) // 蓝色调表示部分成功
    } else {
      turtleIcon = this.add.image(0, -100, 'baby_turtle')
      turtleIcon.setScale(0.2)
      turtleIcon.setTint(0x888888) // 灰色调表示失败
    }
    
    // 结果文字 - 更大更震撼
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
    
    // 动态装饰元素
    const decorativeElements = []
    if (isAllSaved) {
      // 成功时的星星和爱心
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
      // 部分成功时的小海龟
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
    
    // 重试按钮 - 更醒目
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
    
    // 添加到容器（去掉resultBg圆圈装饰）
    gameOverContainer.add([turtleIcon, resultTextObj, retryBtn, ...decorativeElements])
    
    // 单独添加覆盖层，不放在容器中
    this.add.existing(overlay)
    
    // 界面入场动画
    gameOverContainer.setAlpha(0).setScale(0.5)
    this.tweens.add({
      targets: gameOverContainer,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut'
    })
    
    // 乌龟图标弹跳动画
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
    
    // 装饰元素动画
    decorativeElements.forEach((element, index) => {
      this.time.delayedCall(200 + index * 100, () => {
        if (isAllSaved) {
          // 星星和爱心的弹出动画
          this.tweens.add({
            targets: element,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
              // 持续旋转
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
          // 小海龟的出现动画
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
    
    // 按钮交互效果
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
      // 播放点击音效
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
    // 游戏主循环更新
  }
}
