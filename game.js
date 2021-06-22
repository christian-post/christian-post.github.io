const windowWidth = 800;
const windowHeight = 600;

var config = {
    type: Phaser.AUTO,
    width: windowWidth,
    height: windowHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 
        'assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
	this.load.spritesheet('explosion', 
        'assets/explosion.png',
        {frameWidth: 64, frameHeight: 64}
    );
    this.load.image('particle', 'assets/particle.png');
}

var platforms;
var player;
var cursors;
var stars;
var score = 0;
var scoreText;
var maxLives = 3;
var lives = maxLives;
var livesText;
var bombs;
const starCount = 5;
const starCollectScore = 10;
var starLifespan = 10000;
var level = 0;

var particles;
var starParticles;


function create ()
{
    // -- BACKGROUND AND PLATFORMS ---------------------------------------------
    
    this.add.image(400, 300, 'sky');

    platforms = this.physics.add.staticGroup();

    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');
    
    // -- PLAYER ---------------------------------------------------------------

    player = this.physics.add.sprite(100, 450, 'dude');

    player.setCollideWorldBounds(true);

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });
    
    player.body.setGravityY(300)
    this.physics.add.collider(player, platforms);
    
    cursors = this.input.keyboard.createCursorKeys();
    
    // -- COLLECTIBLES ---------------------------------------------------------

    stars = this.physics.add.group();
	starParticles = this.add.particles('star');
    createStars();

    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // -- SCORE ---------------------------------------------------------------

    scoreText = this.add.text(16, 16, 'SCORE: 0', { fontSize: '32px', fill: '#000' });
    livesText = this.add.text(windowWidth - 160, 16, `LIVES: ${lives}`, { fontSize: '32px', fill: '#000' });

    // -- ENEMIES -------------------------------------------------------------

    bombs = this.physics.add.group();

    this.physics.add.collider(bombs, platforms);
    this.physics.add.collider(player, bombs, hitBomb, null, this);
     

    // -- EFFECTS --------------------------------------------------------------
    bombParticles = this.add.particles('particle');
    
	this.anims.create({
		key: 'bombExplosion',
		frames: this.anims.generateFrameNumbers('explosion'),
		frameRate: 30,
		hideOnComplete: true
	});

}

function update ()
{
    if (cursors.left.isDown)
    {
        player.setVelocityX(-160);

        player.anims.play('left', true);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(160);

        player.anims.play('right', true);
    }
    else
    {
        player.setVelocityX(0);

        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down)
    {
        player.setVelocityY(-500);
    }
	
	for (let star in stars.getChildren()) {
		//star.lifespan -= Phaser.Core.TimeStep.delta;
		star.lifespan --;
		console.log(star.lifespan);
		if (star.lifespan <= 0) {
			star.destroy();
		}
	}
	
	// for (let bomb in bombs.getChildren) {
		// console.log(bomb);
		// if (bomb.anims.currentAnim) {
			// if (!bomb.anims.isPlaying) {
				// bomb.destroy();
			// }
		// }
	// }
}

function collectStar (player, star)
{
	star.emitter.remove();
    star.destroy();
    
    score += starCollectScore;
    scoreText.setText(`SCORE: ${score}`);
    
    if (stars.countActive(true) === 0)
    {
        level ++;
        createStars();

        let numBombs = Math.floor(level/10 + 1);
        for (let i = 0; i < numBombs; i++) {
            var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
            var bomb = bombs.create(x, 16, 'bomb');
            bomb.setBounce(1);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
            
            //add particle emitter to bomb
            bomb.emitter = bombParticles.createEmitter({
                frequency: 60, 
                radial: true,
                lifespan: 500,
                speed: 10,
                scale: { random: true, start: 0.8, end: 1.2 },
                angle: { random: true, start: 0, end: 270 },
                //alpha: function (p) {return p.lifespan / emitter.lifespan;}
                });
            bomb.emitter.follow = bomb;
        }
    }
}

function hitBomb (player, bomb)
{
    if (lives > 1) {
		bomb.emitter.remove();
		bomb.setVelocity(0, 0);
		bomb.setGravity(0, 0);
		bomb.anims.play('bombExplosion');
		//bomb.destroy();
		lives --;
		livesText.setText(`LIVES: ${lives}`);
    } else {
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play('turn');
        gameOver = true;
        
        // show game over message
        scoreText.destroy();
        livesText.destroy();
        
        var gameOverText;
        gameOverText = this.add.text(0, 0, 'GAME OVER', {fontSize: '96px', fill: '#000',
                                                         stroke: '#fff', strokeThickness: 4});
        gameOverText.setPosition(Math.floor(windowWidth / 2 - gameOverText.width / 2), 
                                 Math.floor(windowHeight / 2 - gameOverText.height / 2));
        
        var finalScoreText;
        finalScoreText = this.add.text(0, 0, `FINAL SCORE:${score}`, {fontSize: '72px', fill: '#000',
                                                                       stroke: '#fff', strokeThickness: 3});
        finalScoreText.setPosition(Math.floor(windowWidth / 2 - finalScoreText.width / 2), 
                                   Math.floor(gameOverText.y + gameOverText.height));
    }
}

function createStars () {
    let step = Math.floor(windowWidth / (starCount + 1));
    for (let i = 0; i < starCount; i++) {
        let x = step + step * i;
        let y = Phaser.Math.Between(0, 30);
        var star = stars.create(x, y, 'star');
        star.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(20, 40));
        star.setCollideWorldBounds(true);
        star.setBounce(1);
		star.lifespan = starLifespan;
		
		// particles follow the star
		star.emitter = starParticles.createEmitter({
                frequency: 50, 
                radial: true,
				alpha: 80,
                lifespan: 100,
                speed: 0
                });
            star.emitter.follow = star;
		
    }
}