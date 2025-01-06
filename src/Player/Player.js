import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2, keyWasPressed, keyIsDown, gamepadWasPressed, gamepadStick,  isUsingGamepad,
    clamp, sign } = LittleJS;

import TextPopup from "../TextPopup.js";
import { roomWidthInTiles } from "../gameLevel";
import { addScore, playerDied, respawnPlayer, isLevelComplete, pickupSound, collectedSound } from "../game";

// Points awarded when saving a small gorilla. Higher points if more are saved at a time.
const gorillaSavedPoints = [100, 200, 300, 400, 500, 1000, 2000, 5000];

class Player extends EngineObject {
    constructor(pos){
        super(pos);

        this.velocity = vec2(0, 0);
        this.moveSpeed = 0.0625;
        this.maxSpeed = 0.125;
        
        this.drawSize = vec2(2); // Tiles are 16x16 but the sprite is 32x32
        this.size = vec2(1.5, 0.75);
        this.tileInfo = LittleJS.tile(0, 32, 1);
        this.color = LittleJS.WHITE;
        this.mirror = false;
        this.setCollision(true, false);
        this.onGround = false;
        this.isSolid = true;
        this.jumpTimer = new Timer();
        this.isJumping = false;

        this.currentTileInfo = this.tileInfo.frame(1);
        this.animationFrame = 0;
        this.walkFrames = [0, 1, 2, 1];
        this.animationTimer = new Timer();
        this.walkAnimationSpeed = 0.15;
        this.animationTimer.set(this.walkAnimationSpeed);

        this.isDead = false;
        this.deathAnimationTimer = new Timer();
        this.deathSpinTimer = new Timer();
        this.angle = 0;
        this.isPlayingDeathAnimation = false;
        this.isRespawning = false;
        this.finishedLevel = false;

        this.heldGorillas = 0;
        this.heldGorillasList = [];
        this.savedGorillaIndex = 0;
        this.savingGorillas = false;
        this.renderOrder = 5;
        this.smallGorillaTileInfo = LittleJS.tile(1, 16, 2); // Held frame
        this.saveGorillaTimer = new Timer();
        this.savePopupDelay = 0.1;
    }

    render(){
        let spriteFrame = 1;
        if(this.isDead){
            spriteFrame = 1;
        }
        else if(!this.onGround){
            spriteFrame = 0;
        }
        else if(this.moveInput.x === 0){
            spriteFrame = 1;
        }
        else if(this.savingGorillas){
            spriteFrame = 1;
        }
        else{
            spriteFrame = this.walkFrames[this.animationFrame];
        }
        this.currentTileInfo = this.tileInfo.frame(spriteFrame);

        let bodyPos = this.pos;
        bodyPos = bodyPos.add(vec2(0,(this.drawSize.y - this.size.y) / 2));
        if(this.shouldBeVisible()){
            LittleJS.drawTile(bodyPos, this.drawSize, this.currentTileInfo, this.color, this.angle, this.mirror);
            // Draw copies of the player on both sides off screen to make the warping effect seamless.
            LittleJS.drawTile(bodyPos.add(vec2(-roomWidthInTiles, 0)), this.drawSize, this.currentTileInfo, this.color, this.angle, this.mirror);
            LittleJS.drawTile(bodyPos.add(vec2(roomWidthInTiles, 0)), this.drawSize, this.currentTileInfo, this.color, this.angle, this.mirror);
        }

        const smallGorillaDrawSize = vec2(1);
        const walkAnimOffsetY = (spriteFrame === 1 ? 0 : -0.0625);
        for(let i = 0; i < this.heldGorillas; i++){
            const stackPos = this.pos.add(vec2(0, i*0.25 + 0.5625 + walkAnimOffsetY));
            // Draw the stack of held gorillas
            LittleJS.drawTile(stackPos, smallGorillaDrawSize, this.smallGorillaTileInfo, this.color, 0, this.mirror);
            // Draw copies of the sprite on both sides off screen to make the warping effect seamless.
            LittleJS.drawTile(stackPos.add(vec2(-roomWidthInTiles, 0)), smallGorillaDrawSize, this.smallGorillaTileInfo, this.color, 0, this.mirror);
            LittleJS.drawTile(stackPos.add(vec2(roomWidthInTiles, 0)), smallGorillaDrawSize, this.smallGorillaTileInfo, this.color, 0, this.mirror);
        }
    }

    shouldBeVisible(){
        if(this.isDead){
            return this.isPlayingDeathAnimation;
        }

        return !this.finishedLevel;
    }

    canMove(){
        return !this.isDead && !this.finishedLevel;
    }

    deadUpdate(){
        this.velocity.x = 0
        if(!this.deathSpinTimer.active()){
            this.deathSpinTimer.set(0.075);
            const spinAmount = 90 * (LittleJS.PI / 180);
            this.angle += spinAmount * (this.mirror ? -1 : 1);
        }
        if(!this.deathAnimationTimer.active()){
            if(this.isPlayingDeathAnimation){
                // First phase - finished animation
                this.isPlayingDeathAnimation = false;
                this.deathAnimationTimer.set(1.25);
            }
            else{
                // Second phase - signal to the game to restart the player
                if(!this.isRespawning){
                    this.isRespawning = true;
                    respawnPlayer();
                }
            }
        }
    }

    savingGorillasUpdate(){
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.gravityScale = 0;
        if(!this.saveGorillaTimer.active()){
            if(this.heldGorillas > 0){
                this.saveGorillaTimer.set(this.savePopupDelay);
                const nextGorilla = this.heldGorillasList[this.savedGorillaIndex];
                nextGorilla.collectAndSave(); // This function leads to heldGorillas decreasing already, so no need to decrease it here.
                const nextScore = gorillaSavedPoints[this.savedGorillaIndex];
                addScore(nextScore);
                collectedSound.play();
                // Score popup effect
                const scorePopup = new TextPopup(this.pos);
                scorePopup.text = nextScore;
                scorePopup.offset = vec2(0, 0.25 + 0.5 * this.savedGorillaIndex);
                scorePopup.color = new LittleJS.Color(232 / 255, 234 / 255, 74 / 255);
                scorePopup.lifeTimer.set(0.75);
                this.savedGorillaIndex++;
            }
            else{
                // Finished saving all held gorillas
                this.savedGorillaIndex = 0;
                this.heldGorillasList = [];
                if(isLevelComplete()){
                    this.finishedLevel = true;
                }
                this.savingGorillas = false;
            }
        }
    }

    update(){
        // Platformer controls based on the platformer example
        this.jumpPressed   = keyWasPressed("Space") || keyWasPressed("KeyZ") || keyWasPressed("KeyC") || keyWasPressed("KeyN") || gamepadWasPressed(0);
        this.actionPressed   = keyWasPressed("KeyX") || keyWasPressed("KeyV") || keyWasPressed("KeyM") || gamepadWasPressed(1);

        if(this.canMove()){
            this.moveInput = isUsingGamepad ? gamepadStick(0) : 
                vec2(keyIsDown("ArrowRight") - keyIsDown("ArrowLeft"), 
                keyIsDown("ArrowUp") - keyIsDown("ArrowDown"));
        }
        
        if(this.moveInput.x !== 0){
            this.mirror = (this.moveInput.x < 0);
        }

        if(this.canMove() && this.jumpPressed){
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
        this.velocity.x = clamp(this.velocity.x + this.moveInput.x * this.moveSpeed, -this.maxSpeed, this.maxSpeed);

        // air control
        if(sign(this.moveInput.x) == sign(this.velocity.x)){
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

        // Update walk animation
        if(!this.animationTimer.active()){
            this.animationTimer.set(this.walkAnimationSpeed);
            this.animationFrame++;
            this.animationFrame %= this.walkFrames.length;
        }

        // Death state interrupts movement logic here
        if(this.isDead){
            this.deadUpdate();
        }

        // Saving state interrupts movement logic here
        if(this.savingGorillas){
            this.savingGorillasUpdate();
        }
        if(this.finishedLevel){
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.gravityScale = 0;
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

    addGorilla(smallGorilla){
        if(smallGorilla.wasNeverPickedUp){
            smallGorilla.wasNeverPickedUp = false;
            addScore(10);
        }
        this.heldGorillas++;
        pickupSound.play();
    }

    removeGorilla(smallGorilla){
        this.heldGorillas--;
    }

    saveHeldGorillas(){
        if(this.savingGorillas || this.heldGorillas <= 0){
            return;
        }
        this.savingGorillas = true;
        const enemiesList = []; // List of enemies in order to pause them while the save cutscene is running.
        for(let i = 0; i < LittleJS.engineObjects.length; i++){
            const object = LittleJS.engineObjects[i];
            if(object.isSmallGorilla && object.isHeldByPlayer()){
                this.heldGorillasList.push(object);
            }
            else if(object.isEnemy){
                enemiesList.push(object);
            }
        }
        if(this.heldGorillasList.length !== this.heldGorillas){
            console.error("Number of held gorillas doesn't match heldGorillas value! This shouldn't happen!");
        }
        for(let i = 0; i < enemiesList.length; i++){
            enemiesList[i].pause(this.heldGorillas * this.savePopupDelay);
        }
        this.savedGorillaIndex = 0;
        this.saveGorillaTimer.set(this.savePopupDelay);
    }

    damage(){
        if(this.isDead){
            return;
        }

        this.isDead = true;
        for(let i = 0; i < LittleJS.engineObjects.length; i++){
            const object = LittleJS.engineObjects[i];
            if(object.isSmallGorilla && object.isHeldByPlayer()){
                object.dropFromPlayer();
            }
        }
        this.heldGorillas = 0;
        playerDied();

        this.velocity.y = 0;
        this.isPlayingDeathAnimation = true;
        this.deathAnimationTimer.set(1.5);
    }

    collideWithTile(data, pos){
        return true;
    }
}

export default Player;