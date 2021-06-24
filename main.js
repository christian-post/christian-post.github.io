/*
item ideas
- magnet
- protective shield
- extra lives
- super speed

enemies
- homing missiles
*/

const windowWidth = 800;
const windowHeight = 600;

const config = {
  type: Phaser.AUTO,
  width: windowWidth,
  height: windowHeight,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    }
  }
};

var game = new Phaser.Game(config);

game.scene.add('titlescreen', TitleScreen);
game.scene.add('game', Game, false);

//game.scene.start('titlescreen');
game.scene.start('game', {'windowWidth': windowWidth, 'windowHeight': windowHeight});



