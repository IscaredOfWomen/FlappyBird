const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;  // Disable smoothing for pixel art

let frames = 0;
const DEGREE = Math.PI / 180;

// Shake effect variables
let shakeTime = 0;          // How long to shake (in frames)
const shakeDuration = 18;   // ~300ms at 60fps
const shakeMagnitude = 5;   // Max shake offset in pixels

// Load bird images (3 frames for flapping)
const birdImages = [
  new Image(),
  new Image(),
  new Image()
];
birdImages[0].src = "images/bird1.png";
birdImages[1].src = "images/bird2.png";
birdImages[2].src = "images/bird3.png";

// Load other images
const sprite = {
  bg: new Image(),
  pipe: new Image()
};
sprite.bg.src = "images/bg.png";
sprite.pipe.src = "images/pipe.png";

// Load digit images for score (0-9)
const digitImages = [];
for (let i = 0; i <= 9; i++) {
  const img = new Image();
  img.src = `images/font/${i}.png`;
  digitImages.push(img);
}

// Game state
const state = {
  current: 0,
  getReady: 0,
  game: 1,
  over: 2
};

// Bird object
const bird = {
  x: 50,
  y: 150,
  w: 34,
  h: 26,
  frame: 0,
  gravity: 0.25,
  jump: 4.6,
  speed: 0,
  rotation: 0,

  draw() {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rotation);
    ctx.drawImage(
      birdImages[this.frame],
      -this.w / 2,
      -this.h / 2,
      this.w,
      this.h
    );
    ctx.restore();
  },

  flap() {
    this.speed = -this.jump;
  },

  update() {
    // Animate flapping (keep animating bird wings for getReady and game)
    const flapPeriod = state.current === state.getReady ? 10 : 5;
    if (frames % flapPeriod === 0) {
      this.frame = (this.frame + 1) % birdImages.length;
    }

    if (state.current === state.game) {
      this.speed += this.gravity;
      this.y += this.speed;

      // Smooth rotation between -25deg (up) and +90deg (down)
      const maxDown = 90 * DEGREE;
      const maxUp = -25 * DEGREE;
      this.rotation = Math.min(Math.max((this.speed / 10) * maxDown, maxUp), maxDown);

      // Collision with ground
      if (this.y + this.h >= canvas.height) {
        this.y = canvas.height - this.h;
        state.current = state.over;
        this.speed = 0;  // stop vertical speed immediately
        shakeTime = shakeDuration;  // start shake effect
      }
    } else if (state.current === state.over) {
      // On game over: freeze bird, do NOT update position or speed
      this.speed = 0;
      // Keep rotation and position as they are (no change)
    } else {
      // getReady state - reset position and rotation
      this.rotation = 0;
      this.y = 150;
      this.speed = 0;
    }
  },

  reset() {
    this.speed = 0;
    this.y = 150;
    this.rotation = 0;
    this.frame = 0;
  }
};

// Pipes
const pipes = {
  position: [],
  width: 52,
  height: 320,
  gap: 100,
  dx: 2,

  draw() {
    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];

      // Draw top pipe (flipped)
      ctx.save();
      ctx.translate(p.x + this.width / 2, p.y + this.height / 2);
      ctx.scale(1, -1);
      ctx.drawImage(sprite.pipe, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();

      // Draw bottom pipe
      ctx.drawImage(sprite.pipe, p.x, p.y + this.height + this.gap, this.width, this.height);
    }
  },

  update() {
    if (state.current !== state.game) return;  // stop moving pipes when not playing

    if (frames % 100 === 0) {
      this.position.push({
        x: canvas.width,
        y: -Math.floor(Math.random() * 150)
      });
    }

    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      p.x -= this.dx;

      // Collision detection
      const birdHitbox = {
  x: bird.x + 5,          // 5px padding inside from left
  y: bird.y + 5,          // 5px padding inside from top
  w: bird.w - 10,         // reduce width by 10px total (5px both sides)
  h: bird.h - 10          // reduce height by 10px total (5px top & bottom)
};

if (
  birdHitbox.x + birdHitbox.w > p.x &&
  birdHitbox.x < p.x + this.width &&
  (birdHitbox.y < p.y + this.height || birdHitbox.y + birdHitbox.h > p.y + this.height + this.gap)
) {
  state.current = state.over;
  shakeTime = shakeDuration;  // start shake effect on pipe hit too
}


      // Scoring: bird passes pipe
      if (p.x + this.width === bird.x) {
        score.value++;
        if (score.value > score.best) {
          score.best = score.value;
          localStorage.setItem("bestScore", score.best);
        }
      }

      // Remove pipes out of screen
      if (p.x + this.width < 0) {
        this.position.shift();
      }
    }
  },

  reset() {
    this.position = [];
  }
};

// Score object
const score = {
  value: 0,
  best: parseInt(localStorage.getItem("bestScore")) || 0,

  draw() {
    const digitW = 24, digitH = 36;

    if (state.current === state.game) {
      // Draw current score centered top
      const scoreStr = String(this.value);
      const totalWidth = scoreStr.length * digitW;
      const startX = Math.floor((canvas.width - totalWidth) / 2);

      for (let i = 0; i < scoreStr.length; i++) {
        const digit = parseInt(scoreStr[i]);
        ctx.drawImage(digitImages[digit], startX + i * digitW, 50, digitW, digitH);
      }
    }

    if (state.current === state.over) {
      const y = 300;

      // Draw labels
      ctx.font = "20px Arial";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("SCORE", canvas.width / 4, y);
      ctx.fillText("BEST", (canvas.width * 3) / 4, y);

      // Draw score values
      const currStr = String(this.value);
      const bestStr = String(this.best);

      const drawScoreDigits = (str, centerX) => {
        const totalW = str.length * digitW;
        const startX = Math.floor(centerX - totalW / 2);
        for (let i = 0; i < str.length; i++) {
          const digit = parseInt(str[i]);
          ctx.drawImage(digitImages[digit], startX + i * digitW, y + 25, digitW, digitH);
        }
      };

      drawScoreDigits(currStr, canvas.width / 4);
      drawScoreDigits(bestStr, (canvas.width * 3) / 4);
    }
  },

  reset() {
    this.value = 0;
  }
};

// Main draw function with shake effect
function draw() {
  if (shakeTime > 0) {
    const shakeX = (Math.random() - 0.5) * 2 * shakeMagnitude;
    const shakeY = (Math.random() - 0.5) * 2 * shakeMagnitude;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  ctx.drawImage(sprite.bg, 0, 0, canvas.width, canvas.height);
  pipes.draw();
  bird.draw();
  score.draw();

  if (shakeTime > 0) {
    ctx.restore();
  }
}

// Update game logic
function update() {
  bird.update();
  pipes.update();

  if (shakeTime > 0) {
    shakeTime--;
  }
}

// Main game loop
function loop() {
  update();
  draw();
  frames++;
  requestAnimationFrame(loop);
}

// Handle clicks for controls and state changes
canvas.addEventListener("click", function () {
  switch (state.current) {
    case state.getReady:
      state.current = state.game;
      break;

    case state.game:
      bird.flap();
      break;

    case state.over:
      // Reset everything for new game
      bird.reset();
      pipes.reset();
      score.reset();
      state.current = state.getReady;
      break;
  }
});

// Add touch controls
canvas.addEventListener("touchstart", function (e) {
  e.preventDefault();
  switch (state.current) {
    case state.getReady:
      state.current = state.game;
      break;

    case state.game:
      bird.flap();
      break;

    case state.over:
      bird.reset();
      pipes.reset();
      score.reset();
      state.current = state.getReady;
      break;
  }
});

// Start with getReady state
state.current = state.getReady;
loop();