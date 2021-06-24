class TitleScreen extends Phaser.Scene {
  preload () {
    
  }
  
  create() {
    let text = this.add.text(400, 300, 'Reach For The Stars');
    text.setOrigin(0.5, 0.5);
  }
}