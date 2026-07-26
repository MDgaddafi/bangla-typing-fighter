/**
 * Bangla Typing Fighter - Multi-Frame 2D Fighting Animation Engine
 * Renders full frame-by-frame limb movements for Idle, Punch, Kick, Katana Slash, Hit, and Victory states.
 */

class Fighter {
  constructor(isPlayer, name, color, startX, startY) {
    this.isPlayer = isPlayer;
    this.name = name;
    this.color = color;
    
    // Physics & Position
    this.x = startX;
    this.y = startY;
    this.baseX = startX;
    this.groundY = startY;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.85;
    this.isGrounded = true;

    // Health & Combat State
    this.maxHp = 100;
    this.hp = 100;
    
    // Action States: 'idle', 'punch', 'kick', 'slash', 'jump_kick', 'victory', 'hit', 'ko'
    this.state = 'idle';
    this.animTimer = 0;
    this.facing = isPlayer ? 1 : -1;
    this.shakeAmount = 0;

    // Multi-Frame Animation Controllers
    this.frameTick = 0;
    this.currentFrame = 0;
    
    this.moveSpeed = 3.8;
    this.slashColor = isPlayer ? '#00f5d4' : '#ff0055';
    this.isBeingThrown = false;
    this.spinAngle = 0;
  }

  reset(x, y) {
    this.hp = this.maxHp;
    this.state = 'idle';
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.groundY = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.animTimer = 0;
    this.frameTick = 0;
    this.currentFrame = 0;
    this.isBeingThrown = false;
    this.spinAngle = 0;
  }

  jump() {
    if (this.isGrounded && this.state !== 'ko') {
      this.vy = -14;
      this.isGrounded = false;
      this.state = 'jump';
    }
  }

  triggerAction(actionType) {
    if (this.state === 'ko' || this.state === 'victory') return;
    this.state = actionType;
    this.animTimer = 18;
    this.frameTick = 0;
    this.currentFrame = 0;

    if (actionType === 'jump_kick') {
      this.jump();
      this.animTimer = 24;
    }
  }

  takeDamage(amount) {
    if (this.state === 'victory') return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.state = 'ko';
    } else {
      this.state = 'hit';
      this.animTimer = 14;
      this.frameTick = 0;
    }
  }

  update() {
    // Frame Tick Controller for 60 FPS multi-frame animation
    this.frameTick++;
    this.currentFrame = Math.floor(this.frameTick / 4);

    if (this.isBeingThrown) {
      this.spinAngle += 0.28;
    }

    // Physics Update
    if (!this.isGrounded) {
      this.vy += this.gravity;
      this.y += this.vy;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isGrounded = true;

        if (this.isBeingThrown) {
          this.isBeingThrown = false;
          this.spinAngle = 0;
          if (window.gameEngine) {
            window.gameEngine.triggerGroundSlam(this);
          }
        }

        if (this.state === 'jump' || this.state === 'jump_kick') {
          this.state = 'idle';
        }
      }
    }

    this.x += this.vx;

    // Reset action state to idle when animation finishes
    if (this.animTimer > 0) {
      this.animTimer--;
      if (this.animTimer === 0 && this.state !== 'ko' && this.state !== 'victory' && this.isGrounded) {
        this.state = 'idle';
      }
    }

    if (this.shakeAmount > 0) {
      this.shakeAmount *= 0.85;
      if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    }
  }

  draw(ctx, stageTheme) {
    ctx.save();

    const offsetX = (Math.random() - 0.5) * this.shakeAmount;
    const offsetY = (Math.random() - 0.5) * this.shakeAmount;

    let drawX = this.x + offsetX;
    let drawY = this.y + offsetY;

    // 1. Dynamic Ground Shadow
    const heightAboveGround = this.groundY - this.y;
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 160);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(drawX, this.groundY + 85, 45 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Render Animated 2D Fighter Body
    ctx.save();
    ctx.translate(drawX, drawY);

    if (this.facing === 1) {
      ctx.scale(-1, 1);
    }

    let animState = this.state;
    if (this.state === 'idle' && Math.abs(this.vx) > 0.1) {
      animState = 'walk';
    }

    if (!this.isPlayer) {
      // Apply color filter to make the enemy look like a dark purple/red ninja
      ctx.filter = "hue-rotate(130deg) saturate(1.3) brightness(0.9)";
    }

    // Crouch scaling (bose theke mara)
    if (animState === 'crouch_punch' || animState === 'crouch_kick') {
      ctx.translate(0, 85);
      ctx.scale(1, 0.6);
      ctx.translate(0, -85);
    }

    // Apply rotation for spinning jump-kick or being thrown mid-air
    if (animState === 'jump_kick') {
      const centerY = 85 - 40; // Center height of sprite
      ctx.translate(0, centerY);
      ctx.rotate(this.frameTick * 0.35 * this.facing);
      ctx.translate(0, -centerY);
    } else if (this.isBeingThrown) {
      const centerY = 85 - 45;
      ctx.translate(0, centerY);
      ctx.rotate(this.spinAngle * this.facing);
      ctx.translate(0, -centerY);
    }

    this.drawSprite(ctx, animState);

    ctx.restore();
    ctx.restore();
  }

  drawSprite(ctx, animState) {
    if (!Fighter.spritesheet) {
      // Fallback placeholder
      ctx.fillStyle = this.color;
      ctx.fillRect(-15, -20, 30, 100);
      return;
    }

    let spriteState = animState;
    if (animState === 'crouch_punch') spriteState = 'punch';
    if (animState === 'crouch_kick') spriteState = 'kick';

    const frames = Fighter.SPRITES_MAP[spriteState] || Fighter.SPRITES_MAP['idle'];
    const frameIndex = this.currentFrame % frames.length;
    const frame = frames[frameIndex];

    const scale = 2.0;
    const destW = frame.w * scale;
    const destH = frame.h * scale;

    // Align feet of the sprite (bottom edge) with y = 85 (ground offset)
    const destX = -destW / 2;
    const destY = 85 - destH;

    ctx.drawImage(
      Fighter.spritesheet,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      destX,
      destY,
      destW,
      destH
    );
  }
}

// Spark Particle Class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 0.5) * 20;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.03 + Math.random() * 0.05;
    this.size = 4 + Math.random() * 7;
    this.rot = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.vRot;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size * 0.7, 0);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

Fighter.spritesheet = null;
Fighter.SPRITES_MAP = {
  idle: [
    { x: 7, y: 16, w: 44, h: 80 },
    { x: 63, y: 14, w: 42, h: 82 },
    { x: 111, y: 14, w: 41, h: 82 }
  ],
  walk: [
    { x: 8, y: 108, w: 29, h: 84 },
    { x: 48, y: 110, w: 31, h: 82 },
    { x: 88, y: 110, w: 55, h: 82 },
    { x: 152, y: 108, w: 29, h: 84 },
    { x: 192, y: 109, w: 33, h: 83 },
    { x: 231, y: 111, w: 55, h: 81 }
  ],
  punch: [
    { x: 128, y: 208, w: 41, h: 80 },
    { x: 176, y: 216, w: 51, h: 72 },
    { x: 352, y: 312, w: 58, h: 80 },
    { x: 423, y: 305, w: 57, h: 87 }
  ],
  kick: [
    { x: 55, y: 420, w: 56, h: 84 },
    { x: 120, y: 417, w: 78, h: 87 },
    { x: 208, y: 415, w: 87, h: 89 },
    { x: 519, y: 424, w: 86, h: 80 }
  ],
  slash: [
    { x: 267, y: 515, w: 50, h: 77 },
    { x: 325, y: 529, w: 95, h: 63 },
    { x: 96, y: 613, w: 95, h: 91 },
    { x: 200, y: 611, w: 95, h: 93 }
  ],
  jump: [
    { x: 216, y: 12, w: 53, h: 84 },
    { x: 279, y: 34, w: 49, h: 62 }
  ],
  jump_kick: [
    { x: 336, y: 39, w: 84, h: 57 }
  ],
  hit: [
    { x: 8, y: 725, w: 67, h: 75 },
    { x: 8, y: 809, w: 88, h: 104 }
  ],
  ko: [
    { x: 456, y: 888, w: 96, h: 25 }
  ],
  victory: [
    { x: 7, y: 920, w: 44, h: 81 }
  ]
};

window.Fighter = Fighter;
window.Particle = Particle;
