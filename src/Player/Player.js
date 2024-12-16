import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2, keyWasPressed, keyIsDown, gamepadWasPressed, gamepadStick,  isUsingGamepad,
    clamp, sign } = LittleJS;

import { roomWidthInTiles } from "../gameLevel";

class Player extends EngineObject {
    constructor(pos){
        super(pos);

        this.velocity = vec2(0, 0);
        this.moveSpeed = 0.0625;
        
        this.drawSize = vec2(2); // Tiles are 16x16 but the sprite is 32x32
        this.size = vec2(1.5, 0.75);
        this.tileInfo = LittleJS.tile(1, 32, 1);
        this.color = LittleJS.WHITE;
        this.mirror = false;
        this.setCollision(true, false);
        this.onGround = false;
        this.jumpTimer = new Timer();
        this.isJumping = false;
    }

    render(){
        let bodyPos = this.pos;
        bodyPos = bodyPos.add(vec2(0,(this.drawSize.y - this.size.y) / 2));
        LittleJS.drawTile(bodyPos, this.drawSize, this.tileInfo, this.color, 0, this.mirror);
        // Draw copies of the player on both sides off screen to make the warping effect seamless.
        LittleJS.drawTile(bodyPos.add(vec2(-roomWidthInTiles, 0)), this.drawSize, this.tileInfo, this.color, 0, this.mirror);
        LittleJS.drawTile(bodyPos.add(vec2(roomWidthInTiles, 0)), this.drawSize, this.tileInfo, this.color, 0, this.mirror);
    }

    update(){
        // Platformer controls based on the platformer example
        this.jumpPressed   = keyWasPressed("Space") || keyWasPressed("KeyZ") || keyWasPressed("KeyC") || keyWasPressed("KeyN") || gamepadWasPressed(0);
        this.actionPressed   = keyWasPressed("KeyX") || keyWasPressed("KeyV") || keyWasPressed("KeyM") || gamepadWasPressed(1);

        this.moveInput = isUsingGamepad ? gamepadStick(0) : 
            vec2(keyIsDown("ArrowRight") - keyIsDown("ArrowLeft"), 
            keyIsDown("ArrowUp") - keyIsDown("ArrowDown"));
        
        if(this.moveInput.x !== 0){
            this.mirror = (this.moveInput.x < 0);
        }

        if(this.jumpPressed){
            if(this.onGround || this.jumpTimer.active()){
                this.velocity.y = 0.4375;
                this.jumpTimer.unset();
                this.isJumping = true;
            }
        }

        // Floaty jump
        if(this.velocity.y > 0.125){
            this.gravityScale = 0.9;
        }
        else if(LittleJS.abs(this.velocity.y) <= 0.125){
            this.gravityScale = 0.5;
        }
        else{
            this.gravityScale = 0.75;
        }

        this.velocity.y = clamp(this.velocity.y, -0.165, LittleJS.objectMaxSpeed);

        // Lower map bound
        const lowerBoundY = -16;
        if(this.pos.y - (this.drawSize.y / 2) + this.velocity.y <= lowerBoundY){
            this.velocity.y = 0;
            this.pos.y = lowerBoundY + this.drawSize.y / 2;
        }

        if(this.isJumping && this.velocity.y <= 0){
            this.isJumping = false;
        }
        
        // apply movement acceleration and clamp
        const maxCharacterSpeed = 0.125;
        this.velocity.x = clamp(this.velocity.x + this.moveInput.x * this.moveSpeed, -maxCharacterSpeed, maxCharacterSpeed);

        // air control
        if (sign(this.moveInput.x) == sign(this.velocity.x)){
            this.velocity.x *= .8; // moving with velocity
        }
        else{
            this.velocity.x *= .5; // moving against velocity (stopping)
        }

        // Check if on ground
        const wasOnGround = this.onGround;
        const groundRay = vec2(0, -1);
        const raycastHit = LittleJS.tileCollisionRaycast(this.pos, this.pos.add(groundRay), this);
        const raycastHitLeft = LittleJS.tileCollisionRaycast(this.pos.add(vec2(this.size.x/2, 0)), this.pos.add(groundRay), this);
        const raycastHitRight = LittleJS.tileCollisionRaycast(this.pos.add(vec2(-this.size.x/2, 0)), this.pos.add(groundRay), this);
        if(raycastHit || raycastHitLeft || raycastHitRight){
            this.onGround = true;
        }
        else{
            this.onGround = false;
        }
        // Coyote timer
        if(!this.onGround && wasOnGround && !this.isJumping){
            this.jumpTimer.set(.2);
        }

        // Seamless room warping effect
        if(this.pos.x >= roomWidthInTiles){
            this.pos.x -= roomWidthInTiles;
        }
        if(this.pos.x < 0){
            this.pos.x += roomWidthInTiles;
        }

        super.update();
    }

    collideWithTile(data, pos){
        return true;
    }
}

export default Player;