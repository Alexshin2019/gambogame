import Phaser from 'phaser'
import { screenSize, audioConfig, loadingConfig } from '../gameConfig.json'

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' })
    this.loadingProgress = 0
    this.turtleIcons = []
    this.blackScreenDuration = loadingConfig.blackScreenDuration.value // 黑屏等待时间（毫秒）
    this.enableBlackScreen = loadingConfig.enableBlackScreen.value // 是否启用黑屏等待阶段
  }

  preload() {
    // 在 preload 阶段首先加载加载界面所需的基本素材
    this.load.image('loading_screen_background', 'https://cdn-game-mcp.gambo.ai/68695e6c-a5b6-4e9d-a9dc-a6cf1fe21719/images/loading_screen_background.png')
    this.load.image('loading_turtle_icon', 'https://cdn-game-mcp.gambo.ai/edfceaf7-96d4-48f9-bf2b-204ca09edfe2/images/loading_turtle_icon.png')
    
    // 等待基本素材加载完成后再创建加载界面
    this.load.once('complete', () => {
      this.createLoadingUI()
      // 延迟开始加载游戏资源，实现黑屏等待效果
      this.startDelayedGameLoading()
    })
  }

  startDelayedGameLoading() {
    if (this.enableBlackScreen) {
      // 如果启用黑屏等待，延迟指定时间后开始加载游戏资源
      this.time.delayedCall(this.blackScreenDuration, () => {
        this.loadGameAssets()
      })
    } else {
      // 否则立即开始加载游戏资源
      this.loadGameAssets()
    }
  }

  createLoadingUI() {
    // 创建加载界面背景
    this.createBackground()
    
    // 创建加载动画和进度显示
    this.createLoadingAnimation()
    
    // 创建进度条
    this.createProgressBar()
    
    // 创建加载文字
    this.createLoadingText()
    
    // 如果启用黑屏等待，显示等待状态
    if (this.enableBlackScreen) {
      this.setWaitingState()
    }
  }

  setWaitingState() {
    // 在等待期间，更新加载状态文字为等待状态
    this.loadingStatus.setText('Preparing game...')
    
    // 创建等待点动画
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
    // 创建加载界面背景
    this.background = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'loading_screen_background')
    
    // 计算缩放比例以适应屏幕
    const bgScaleX = screenSize.width.value / 1536
    const bgScaleY = screenSize.height.value / 1024
    const bgScale = Math.max(bgScaleX, bgScaleY)
    this.background.setScale(bgScale)
  }

  createLoadingAnimation() {
    // 创建小乌龟图标用于加载动画
    const centerX = screenSize.width.value / 2
    const centerY = screenSize.height.value / 2
    
    // 主要的乌龟图标
    this.mainTurtle = this.add.image(centerX, centerY - 50, 'loading_turtle_icon')
    
    // 计算乌龟图标的缩放
    const turtleScale = 0.2 // 适中大小
    this.mainTurtle.setScale(turtleScale)
    
    // 创建旋转动画让乌龟慢慢转动
    this.tweens.add({
      targets: this.mainTurtle,
      rotation: Math.PI * 2,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    })
    
    // 创建上下浮动动画
    this.tweens.add({
      targets: this.mainTurtle,
      y: centerY - 30,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // 创建围绕主乌龟的小乌龟们
    this.createOrbitalTurtles(centerX, centerY - 50)
  }

  createOrbitalTurtles(centerX, centerY) {
    const numTurtles = 5
    const radius = 100
    
    for (let i = 0; i < numTurtles; i++) {
      const angle = (i / numTurtles) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      const turtle = this.add.image(x, y, 'loading_turtle_icon')
      turtle.setScale(0.08) // 更小的尺寸
      turtle.setAlpha(0.6) // 半透明效果
      
      this.turtleIcons.push(turtle)
      
      // 每个小乌龟绕着中心旋转，但速度不同
      this.tweens.add({
        targets: turtle,
        rotation: Math.PI * 2,
        duration: 4000 + i * 500, // 不同速度
        repeat: -1,
        ease: 'Linear'
      })
      
      // 轨道运动
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
    
    // 进度条位置
    const barY = centerY + 120
    const barWidth = 400
    const barHeight = 20
    
    // 进度条背景
    this.progressBg = this.add.rectangle(centerX, barY, barWidth, barHeight, 0x2c3e50)
    this.progressBg.setStrokeStyle(3, 0x34495e)
    
    // 进度条填充
    this.progressBar = this.add.rectangle(centerX - barWidth/2, barY, 0, barHeight - 4, 0x3498db)
    this.progressBar.setOrigin(0, 0.5)
    
    // 进度条光泽效果
    this.progressGlow = this.add.rectangle(centerX - barWidth/2, barY, 0, barHeight - 4, 0x5dade2)
    this.progressGlow.setOrigin(0, 0.5)
    this.progressGlow.setAlpha(0.7)
    
    // 进度百分比文字
    this.progressText = this.add.text(centerX, barY + 40, '0%', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      fill: '#2c3e50',
      align: 'center'
    }).setOrigin(0.5)
    
    // 添加文字阴影
    this.progressText.setStroke('#ffffff', 4)
    this.progressText.setShadow(2, 2, '#000000', 0.3)
  }

  createLoadingText() {
    const centerX = screenSize.width.value / 2
    const centerY = screenSize.height.value / 2
    
    // 主加载文字
    this.loadingTitle = this.add.text(centerX, centerY - 150, 'Beach Turtle Rescue', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      fill: '#2c3e50',
      align: 'center'
    }).setOrigin(0.5)
    
    this.loadingTitle.setStroke('#ffffff', 6)
    this.loadingTitle.setShadow(3, 3, '#000000', 0.5)
    
    // 加载状态文字
    this.loadingStatus = this.add.text(centerX, centerY + 200, 'Loading game assets...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fill: '#7f8c8d',
      align: 'center'
    }).setOrigin(0.5)
    
    // 创建加载点动画
    this.createLoadingDots()
  }

  createLoadingDots() {
    // 在状态文字后添加动态的点点点效果
    this.loadingDots = 0
    this.loadingTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.loadingDots = (this.loadingDots + 1) % 4
        const dots = '.'.repeat(this.loadingDots)
        // 只有在不是等待状态时才更新为"Loading game assets"
        if (!this.enableBlackScreen || this.load.isLoading()) {
          this.loadingStatus.setText(`Loading game assets${dots}`)
        }
      },
      loop: true
    })
  }

  loadGameAssets() {
    // 清理等待阶段的点动画
    if (this.waitingDotTimer) {
      this.waitingDotTimer.destroy()
    }
    
    // 更新状态文字为正在加载
    this.loadingStatus.setText('Loading game assets...')
    
    // 创建一个新的加载器来加载游戏资源
    const gameLoader = this.load
    
    // 监听加载进度
    gameLoader.on('progress', (progress) => {
      this.updateProgress(progress * 100)
    })
    
    gameLoader.on('complete', () => {
      this.onLoadComplete()
    })
    
    // 加载所有游戏需要的素材
    this.loadAllGameAssets(gameLoader)
    
    // 开始加载
    gameLoader.start()
  }

  loadAllGameAssets(loader) {
    // Load asset pack by type
    this.load.pack('assetPack', 'assets/asset-pack.json')
  }

  updateProgress(progress) {
    this.loadingProgress = Math.min(progress, 100)
    
    // 更新进度条
    const barWidth = 400
    const fillWidth = (this.loadingProgress / 100) * barWidth
    
    this.progressBar.width = fillWidth
    this.progressGlow.width = fillWidth
    
    // 更新百分比文字
    this.progressText.setText(`${Math.floor(this.loadingProgress)}%`)
    
    // 添加进度条填充动画
    if (fillWidth > 0) {
      this.tweens.add({
        targets: this.progressGlow,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      })
    }
    
    // 根据进度更新加载状态文字
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
    // 停止加载点动画
    if (this.loadingTimer) {
      this.loadingTimer.destroy()
    }
    
    // 更新最终状态
    this.updateProgress(100)
    this.loadingStatus.setText('Loading complete!')
    
    // 添加完成动画
    this.tweens.add({
      targets: [this.mainTurtle, ...this.turtleIcons],
      scale: { from: this.mainTurtle.scale, to: this.mainTurtle.scale * 1.2 },
      duration: 500,
      yoyo: true,
      ease: 'Back.easeOut'
    })
    
    // 短暂延迟后进入主菜单
    this.time.delayedCall(1500, () => {
      this.scene.start('MainMenuScene')
    })
  }
}