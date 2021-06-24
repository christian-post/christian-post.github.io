class Game extends Phaser.Scene {
  preload () {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 
      'assets/dude.png',
      { frameWidth: 32, frameHeight: 48}
    );
    this.load.spritesheet('explosion', 
      'assets/explosion.png',
      {frameWidth: 64, frameHeight: 64}
    );
    this.load.image('particle', 'assets/particle.png');
    this.load.image('heart', 'assets/hudHeart_full.png');
  }

  create (data) {
    this.windowWidth = data['windowWidth'];
    this.windowHeight = data['windowHeight'];
    this.gameOver = false;
    
    // -- BACKGROUND AND PLATFORMS --
    this.add.image(400, 300, 'sky');

    this.platforms = this.physics.add.staticGroup();

    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    this.platforms.create(600, 400, 'ground');
    this.platforms.create(50, 250, 'ground');
    this.platforms.create(750, 220, 'ground');
    
    // -- PLAYER --
    this.player = this.physics.add.sprite(100, 450, 'dude');
    this.player.setCollideWorldBounds(true);
    this.playerIframes = 0;
    this.playerIframesDuration = 1000;
    this.playerBlinkingSpeed = 100;
    this.playerBlinkingTimer = 0;

    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'turn',
      frames: [ { key: 'dude', frame: 4 } ],
      frameRate: 20,
    });

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });

    this.player.body.setGravityY(300)
    this.physics.add.collider(this.player, this.platforms);

    this.cursors = this.input.keyboard.createCursorKeys();

    // -- COLLECTIBLES --
    this.maxStarCount = 5;
    this.starLifespan = 6000;
    this.starSpawnMinInterval = 6000;
    this.starSpawnTimer = this.starSpawnMinInterval;

    this.stars = this.physics.add.group();
    this.starParticles = this.add.particles('star');
    
    this.hearts = this.physics.add.group();
    this.heartParticles = this.add.particles('heart');

    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    
    this.physics.add.collider(this.hearts, this.platforms);
    this.physics.add.overlap(this.player, this.hearts, this.collectHeart, null, this);

    // -- SCORE AND LIVES --
    this.score = 0;
    this.maxLives = 5;
    this.lives = this.maxLives;
    this.starCollectScore = 10;

    this.scoreText = 
        this.add.text(16, 16, 'SCORE: 0', {fontSize: '32px', fill: '#000'});
    this.livesText = 
        this.add.text(windowWidth - 160, 16, `LIVES: ${this.lives}`,
                        {fontSize: '32px', fill: '#000'}
                     );

    // -- ENEMIES --
    this.bombLifespan = 5000;
    this.bombSpawnTimer = 0;
    this.bombSpawnMinInterval = 4000;

    this.bombs = this.physics.add.group();
    this.physics.add.collider(this.bombs, this.platforms);
    this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);

    // -- EFFECTS --
    this.bombParticles = this.add.particles('particle');

    this.anims.create({
      key: 'bombExplosion',
      frames: this.anims.generateFrameNumbers('explosion'),
      frameRate: 20,
      hideOnComplete: true
    });
    this.effects = this.physics.add.staticGroup();
  }

  update (time, delta) {
    if (this.gameOver) return;
    
    // steer the player
    if (this.cursors.left.isDown)
    {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    }
    else if (this.cursors.right.isDown)
    {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    }
    else
    {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }

    if (this.cursors.up.isDown && this.player.body.touching.down)
    {
      // jump
      this.player.setVelocityY(-500);
    }

    // destroy stars and bombs after their lifespan reaches 0
    for (let star of this.stars.getChildren()) {
      star.lifespan -= delta;
      if (star.lifespan <= 0) {
        this.destroyStar(star);
      }
    }

    for (let bomb of this.bombs.getChildren()) {
      bomb.lifespan -= delta;
      if (bomb.lifespan <= 0) {
        this.bombExlode(bomb);
      }
    }
    
    for (let heart of this.hearts.getChildren()) {
      heart.lifespan -= delta;
      if (heart.lifespan <= 0) {
        heart.emitter.remove();
        heart.destroy();
      }
    }

    // spawn stars after a certain time
    this.starSpawnTimer += delta;
    if (this.starSpawnTimer >= this.starSpawnMinInterval) {
      let starCount = Phaser.Math.FloatBetween(1, this.maxStarCount);
      let step = Math.floor(windowWidth / (starCount + 1));
      for (let i = 0; i < starCount; i++) {
        let x = step + step * i;
        let y = Phaser.Math.Between(0, 30);
        this.spawnStar(x, y);
      this.starSpawnTimer = 0;
      }
    }

    // spawn bombs
    this.bombSpawnTimer += delta;
    if (this.bombSpawnTimer >= this.bombSpawnMinInterval & this.score > 50) {
      let numBombs = Math.floor(this.score / 200) + 1;
      for (let i = 0; i < numBombs; i++) {
        // TODO line wrapping style? 
        let x = 
            (this.player.x < 400) ? Phaser.Math.Between(400, 800) : 
                Phaser.Math.Between(0, 400);
        let bomb = this.bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.lifespan = this.bombLifespan * Phaser.Math.FloatBetween(0.8, 1.2);

        //add particle emitter to bomb
        bomb.emitter = this.bombParticles.createEmitter({
          frequency: 60, 
          radial: true,
          lifespan: 500,
          speed: 10,
          scale: {random: true, start: 0.8, end: 1.2},
          angle: {random: true, start: 0, end: 270},
          alpha: {start: 0.8, end: 0},
        });
        bomb.emitter.follow = bomb;
      }
      this.bombSpawnTimer = 0;
      
      // spawn a heart from time to time
      if (Phaser.Math.FloatBetween(0, 1) < 0.1 & 
          this.score > 200 &
          this.lives < this.maxLives) {
        let heart = 
            this.hearts.create(Phaser.Math.Between(20, 780), 0, 'heart');
        heart.setBounce(1);
        heart.setCollideWorldBounds(true);
        heart.setVelocity(Phaser.Math.Between(-200, 200), 20);
        heart.lifespan = this.starLifespan * 2;
        
        heart.emitter = this.heartParticles.createEmitter({
          frequency: 60, 
          radial: true,
          lifespan: 300,
          speed: 10,
          scale: {random: true, start: 0.75, end: 1.0},
          angle: {random: true, start: 0, end: 270},
          alpha: {start: 0.7, end: 0},
        });
        heart.emitter.follow = heart;
      }
    }
    // decrement the player's invincibility frames
    if (this.playerIframes > 0) {
      this.playerIframes -= delta;
      
      // blinking
      this.playerBlinkingTimer += delta;
      if (this.playerBlinkingTimer > this.playerBlinkingSpeed) {
        // alternate the alpha value
        this.player.setAlpha(this.player.alpha == 1 ? 0.25 : 1);
        this.playerBlinkingTimer = 0;
      }
    } else {
      this.player.setAlpha(1);
    }
  }

  spawnStar(x, y) {
    let star = this.stars.create(x, y, 'star');
    let emitterConfig;
    if (Phaser.Math.FloatBetween(0, 1) > 0.95 & this.score > 100) {
        // it's that super rare red star!
        star.setTint(0xff0000);
        star.points = this.starCollectScore * 10;
        emitterConfig = {
          frequency: 50, 
          radial: true,
          alpha: {start: 0.5, end: 0},
          lifespan: 200,
          speed: 0,
          tint: 0xff0000,
        };
    } else {
        star.points = this.starCollectScore; // normal star
        emitterConfig = {
          frequency: 50, 
          radial: true,
          alpha: { start: 0.5, end: 0},
          lifespan: 150,
          speed: 0
        };
    }
    star.setVelocity(Phaser.Math.Between(-200, 200), 
                     Phaser.Math.Between(20, 40));
    star.setCollideWorldBounds(true);
    star.setBounce(1);
    star.lifespan = Math.floor(this.starLifespan * 
                               Phaser.Math.FloatBetween(0.8, 1.2));

    // particles follow the star
    star.emitter = this.starParticles.createEmitter(emitterConfig);
    star.emitter.follow = star;
    star.name = 'bob';  // for debugging
  }

  collectStar(player, star) {
    this.destroyStar(star);
    this.score += star.points;
    this.scoreText.setText(`SCORE: ${this.score}`);
  }
  
  collectHeart(player, heart) {
    this.changeLives(1);
    heart.emitter.remove();
    
    let heartEmitter = this.heartParticles.createEmitter({
          frequency: -1,
          radial: true,
          alpha: {start: 1, end: 0},
          lifespan: 500,
          speed: 100,
          scale: {random: true, start: 0.5, end: 0.1}
      });
      heartEmitter.follow = heart;
      heartEmitter.explode(8, heart.x, heart.y);
      heart.destroy();
  }

  destroyStar(star) {
      // wrapper that adds some particle effects
      star.emitter.remove();

      let starEmitter = this.starParticles.createEmitter({
          frequency: -1,
          radial: true,
          alpha: {start: 1, end: 0},
          lifespan: 500,
          speed: 100,
          scale: {random: true, start: 0.3, end: 0.05},
          tint: star.tintTopLeft,
      });
      starEmitter.follow = star;
      starEmitter.explode(16, star.x, star.y);
      star.destroy();
  }

  bombExlode (bomb) {
    bomb.emitter.remove();
    bomb.setVelocity(0, 0);
    bomb.setGravity(0, 0);
    bomb.destroy();

    // create an explosion sprite
    let explosion = this.effects.create(bomb.x, bomb.y, 'explosion');
    explosion.anims.play('bombExplosion');
    explosion.once('animationcomplete', function () {explosion.destroy()});
  }

  changeLives(amount) {
    this.lives += amount;
    this.livesText.setText(`LIVES: ${this.lives}`);
  }

  hitBomb (player, bomb) {
    // check if player is invincible (iframes)
    if (this.playerIframes > 0) return;
    
    this.bombExlode(bomb);
    if (this.lives > 1) {
      this.changeLives(-1);
      this.playerIframes = this.playerIframesDuration;
    } else {
      this.physics.pause();
      this.player.setTint(0xff0000);
      this.player.anims.play('turn');
      this.gameOver = true;
      
      // show game over message
      this.scoreText.destroy();
      this.livesText.destroy();
      
      let gameOverText;
      gameOverText = this.add.text(this.windowWidth / 2, 
                                   this.windowHeight / 2,
                                   'GAME OVER', 
                                   {fontSize: '96px', fill: '#000',
                                    stroke: '#fff', strokeThickness: 4});
      gameOverText.setOrigin(0.5, 0.5);
      let finalScoreText;
      finalScoreText = this.add.text(0, 0, `FINAL SCORE:${this.score}`, 
                                     {fontSize: '72px', fill: '#000',
                                      stroke: '#fff', strokeThickness: 3});
      finalScoreText.setOrigin(0.5, 0.5);
      finalScoreText.setPosition(this.windowWidth / 2, 
                                 Math.floor(gameOverText.y 
                                     + gameOverText.height));
    }
  }
}