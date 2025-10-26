import Phaser from 'phaser'
import { screenSize, audioConfig } from '../gameConfig.json'

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  preload() {
    // 所有资源已在LoadingScene中加载完成，这里无需重复加载
  }

  create() {
    // 创建背景
    this.createBackground()
    
    // 初始化音频
    this.initAudio()
    
    // 创建UI
    this.createUI()
    
    // 播放背景音乐
    this.backgroundMusic.play()
  }
  
  update() {
    // 不需要键盘检测，所有交互通过按钮完成
  }
  
  startGame() {
    this.uiClickSound.play()
    this.scene.start('Level1Scene')
  }

  createBackground() {
    // 新的启动页背景图片（无文字版本）
    this.titleBackground = this.add.image(screenSize.width.value / 2, screenSize.height.value / 2, 'beach_turtle_rescue_title_background_no_text')
    
    // 计算缩放比例以适应屏幕（保持图片比例）
    const bgScaleX = screenSize.width.value / 1536 // 图片原始宽度是1536
    const bgScaleY = screenSize.height.value / 1024 // 图片原始高度是1024
    const bgScale = Math.max(bgScaleX, bgScaleY) // 使用较大的缩放比例确保完全覆盖屏幕
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
    // 背景图片已经包含了游戏标题，现在创建两个明显的按钮
    this.createMainButtons()
  }

  createMainButtons() {
    // 创建两个美观的主要按钮，放在屏幕中下方位置
    const centerX = screenSize.width.value / 2
    const buttonY = screenSize.height.value * 0.72
    const buttonSpacing = 220

    // 创建 Start 按钮
    const startButton = this.createBeautifulButton(centerX - buttonSpacing/2, buttonY, 'START GAME', '#00d4aa', '#ffffff', () => {
      this.startGame()
    })

    // 创建 How to Play 按钮  
    const howToPlayButton = this.createBeautifulButton(centerX + buttonSpacing/2, buttonY, 'HOW TO PLAY', '#4a90e2', '#ffffff', () => {
      this.showHowToPlay()
    })
  }

  createBeautifulButton(x, y, text, bgColor, textColor, onClick) {
    // 创建按钮容器
    const buttonContainer = this.add.container(x, y)
    
    // 按钮尺寸
    const buttonWidth = 180
    const buttonHeight = 60
    const cornerRadius = 15
    
    // 创建按钮背景图形
    const buttonBg = this.add.graphics()
    
    // 主要背景色（渐变效果用多层实现）
    buttonBg.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color)
    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
    
    // 添加高光效果（顶部浅色边框）
    const highlight = this.add.graphics()
    highlight.lineStyle(3, 0xffffff, 0.4)
    highlight.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
    
    // 添加阴影效果（底部深色边框）
    const shadow = this.add.graphics()
    shadow.lineStyle(2, 0x000000, 0.3)
    shadow.strokeRoundedRect(-buttonWidth/2 + 1, -buttonHeight/2 + 1, buttonWidth, buttonHeight, cornerRadius)
    
    // 创建按钮文字
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: text === 'START GAME' ? '20px' : '18px',
      fontStyle: 'bold',
      fill: textColor,
      align: 'center'
    }).setOrigin(0.5)
    
    // 文字阴影效果
    buttonText.setStroke('#000000', 4)
    buttonText.setShadow(2, 2, '#000000', 0.5)
    
    // 将所有元素添加到容器
    buttonContainer.add([shadow, buttonBg, highlight, buttonText])
    buttonContainer.setSize(buttonWidth, buttonHeight)
    buttonContainer.setInteractive()
    
    // 存储原始颜色用于恢复
    const originalColor = Phaser.Display.Color.HexStringToColor(bgColor).color
    const hoverColor = Phaser.Display.Color.HexStringToColor(bgColor).lighten(20).color
    const pressColor = Phaser.Display.Color.HexStringToColor(bgColor).darken(20).color
    
    // 添加交互效果
    buttonContainer.on('pointerover', () => {
      // 悬停效果：按钮变亮，轻微放大，添加脉冲效果
      buttonBg.clear()
      buttonBg.fillStyle(hoverColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(1.05)
      buttonText.setTint(0xffff99)
      
      // 添加发光脉冲效果
      this.tweens.add({
        targets: highlight,
        alpha: 0.8,
        duration: 300,
        yoyo: true,
        repeat: -1
      })
    })

    buttonContainer.on('pointerout', () => {
      // 恢复原始状态
      buttonBg.clear()
      buttonBg.fillStyle(originalColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(1.0)
      buttonText.clearTint()
      
      // 停止脉冲效果
      this.tweens.killTweensOf(highlight)
      highlight.setAlpha(1)
    })

    buttonContainer.on('pointerdown', () => {
      // 按下效果：按钮变暗，缩小
      buttonBg.clear()
      buttonBg.fillStyle(pressColor)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
      
      buttonContainer.setScale(0.95)
      
      // 播放音效
      if (this.uiClickSound) {
        this.uiClickSound.play()
      }
      
      // 执行点击回调
      onClick()
      
      // 恢复按钮状态
      this.time.delayedCall(150, () => {
        buttonBg.clear()
        buttonBg.fillStyle(originalColor)
        buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, cornerRadius)
        buttonContainer.setScale(1.0)
      })
    })

    // 添加进入动画
    buttonContainer.setAlpha(0)
    buttonContainer.setScale(0.5)
    this.tweens.add({
      targets: buttonContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
      delay: text === 'START GAME' ? 200 : 400 // 按钮依次出现
    })

    return buttonContainer
  }

  showHowToPlay() {
    // 创建说明界面
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