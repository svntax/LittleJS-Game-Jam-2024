import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2, clamp, sign } = LittleJS;

import { roomWidthInTiles } from "../gameLevel";
import { player } from "../game.js";

class State {
    static get IDLE(){
        return "IDLE";
    }
    static get HELD(){
        return "HELD";
    }
    static get LOST(){
        return "LOST";
    }
}

class SmallGorilla extends EngineObject {
    constructor(pos){
        super(pos);

        this.velocity = vec2(0, 0);
        this.moveSpeed = 0.0625;
        this.maxSpeed = 0.075;
        this.moveTimer = new Timer();
        this.movingWhileLost = true;
        this.moveInput = vec2(0, 0);
        
        this.tileInfo = LittleJS.tile(0, 16, 2);
        this.currentTileInfo = this.tileInfo.frame(0);
        this.color = LittleJS.WHITE;
        this.mirror = LittleJS.randSign() === 1; // Randomize starting direction
        this.setCollision(true, false);

        this.isSmallGorilla = true;
        this.wasNeverPickedUp = true; // Used to award points when picked up for the first time
        this.enterState(State.IDLE);
    }

    render(){
        let bodyPos = this.pos;
        let spriteFrame = 0;
        if(this.state === State.IDLE){
            spriteFrame = 0;
        }
        else if(this.state === State.HELD){
            spriteFrame = 1;
        }
        else if(this.state === State.LOST){
            spriteFrame = 2;
        }
        this.currentTileInfo = this.tileInfo.frame(spriteFrame);

        if(this.state !== State.HELD){
            LittleJS.drawTile(bodyPos, this.drawSize, this.currentTileInfo, this.color, 0, this.mirror);
            // Draw copies of the sprite on both sides off screen to make the warping effect seamless.
            LittleJS.drawTile(bodyPos.add(vec2(-roomWidthInTiles, 0)), this.drawSize, this.currentTileInfo, this.color, 0, this.mirror);
            LittleJS.drawTile(bodyPos.add(vec2(roomWidthInTiles, 0)), this.drawSize, this.currentTileInfo, this.color, 0, this.mirror);
        }
    }

    canPickUp(){
        return this.state === State.IDLE || this.state === State.LOST;
    }

    enterState(nextState){
        if(this.state === State.HELD && nextState !== State.HELD){
            // This gorilla needs to be removed from the held stack.
            player.removeGorilla(this);
        }
        
        this.state = nextState;
        if(nextState === State.IDLE){
            this.moveInput.x = 0;
            this.setCollision(true, false);
        }
        else if(nextState === State.HELD){
            this.moveInput.x = 0;
            player.addGorilla(this);
            this.setCollision(true, true);
        }
        else if(nextState === State.LOST){
            // Start moving back and forth with a slightly randomized max speed and delay
            this.maxSpeed = 0.075 + LittleJS.rand(-0.015, 0.015);
            this.moveTimer.set(LittleJS.rand(0.9, 1.2));
            this.moveInput.x = LittleJS.randSign();
            this.setCollision(true, true);
        }
    }

    // Held by the player
    updateHeld(){
        this.pos.x = player.pos.x;
        //this.pos.y = player.pos.y + ((this.stackIndex)*0.25 + 0.5625);
        this.pos.y = player.pos.y + (1.25 + 0.5625);
    }

    // After being dropped by the player
    updateLost(){
        if(!this.moveTimer.active()){
            this.moveTimer.set(1);
            this.movingWhileLost = !this.movingWhileLost;
            if(this.movingWhileLost){
                // Switch directions when starting to move again.
                this.moveInput.x *= -1;
            }
        }
    }

    update(){
        if(this.state === State.IDLE){
            // Do nothing
        }
        else if(this.state === State.HELD){
            this.updateHeld();
        }
        else if(this.state === State.LOST){
            this.updateLost();
        }
        
        if(this.state === State.HELD){
            this.mirror = player.mirror;
        }
        else if(this.state === State.LOST){
            if(this.moveInput.x !== 0){
                this.mirror = (this.moveInput.x < 0);
            }
        }

        // Floaty jump
        if(this.velocity.y > 0.125){
            this.gravityScale = 0.9;
        }
        else if(LittleJS.abs(this.velocity.y) <= 0.125){
            this.gravityScale = 0.65;
        }
        else{
            this.gravityScale = 0.75;
        }
        if(this.state === State.HELD){
            this.gravityScale = 0;
        }

        this.velocity.y = clamp(this.velocity.y, -0.165, LittleJS.objectMaxSpeed);
        
        // apply movement acceleration and clamp
        this.velocity.x = clamp(this.velocity.x + this.moveInput.x * this.moveSpeed, -this.maxSpeed, this.maxSpeed);
        if(this.state === State.LOST && !this.movingWhileLost){
            this.velocity.x = 0;
        }

        // air control
        if (sign(this.moveInput.x) == sign(this.velocity.x)){
            this.velocity.x *= .8; // moving with velocity
        }
        else{
            this.velocity.x *= .5; // moving against velocity (stopping)
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

    // Called if the player dies
    dropFromPlayer(){
        if(this.state === State.HELD){
            this.enterState(State.LOST);
        }
    }

    collideWithObject(object){
        if(object.isSmallGorilla){
            return false;
        }
        if(object.isEnemy){
            // Hit by the enemy
            if(this.state === State.HELD){
                // TODO: disabled for now, need to handle if stack of gorillas can clip through tiles and reach an enemy
                //this.enterState(State.LOST);
            }
            return false;
        }
        if(object === player){
            if(this.canPickUp() && !player.isDead){
                this.enterState(State.HELD);
            }
            return false;
        }
        return true;
    }
}

export default SmallGorilla;