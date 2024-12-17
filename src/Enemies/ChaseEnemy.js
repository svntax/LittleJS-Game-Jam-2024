import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2, clamp, sign } = LittleJS;

import { roomWidthInTiles } from "../gameLevel";
import { player, enemyDied } from "../game.js";

class EnemyState {
    static get CHASE(){
        return "CHASE";
    }
    static get JUMP(){
        return "JUMP";
    }
    static get DEAD(){
        return "DEAD";
    }
    static get SPAWNING(){
        return "SPAWNING";
    }
}

class ChaseEnemy extends EngineObject {
    constructor(pos){
        super(pos);
        this.isEnemy = true;

        this.velocity = vec2(0, 0);
        this.moveSpeed = 0.0625;
        this.moveInput = vec2(1, 0);
        this.chaseMaxSpeed = 0.09;
        this.jumpMaxSpeed = 0.26;
        this.highJumpPower = 0.4375;
        this.lowJumpPower = 0.225;
        this.maxSpeed = this.chaseMaxSpeed;
        
        this.drawSize = vec2(2); // Tiles are 16x16 but the sprite is 32x32
        this.size = vec2(1.5, 0.75);
        this.tileInfo = LittleJS.tile(1, 32, 1);
        this.color = LittleJS.WHITE;
        this.mirror = false;
        this.setCollision(false, false);

        this.onGround = false;
        this.isJumping = false;
        this.jumpTimer = new Timer();

        this.spawningTimer = new Timer();
        this.deathTimer = new Timer();
        this.deathSpinTimer = new Timer();

        this.enterState(EnemyState.SPAWNING);
    }

    render(){
        let bodyPos = this.pos;
        bodyPos = bodyPos.add(vec2(0,(this.drawSize.y - this.size.y) / 2));
        LittleJS.drawTile(bodyPos, this.drawSize, this.tileInfo, this.color, this.angle, this.mirror);
        // Draw copies of the sprite on both sides off screen to make the warping effect seamless.
        LittleJS.drawTile(bodyPos.add(vec2(-roomWidthInTiles, 0)), this.drawSize, this.tileInfo, this.color, this.angle, this.mirror);
        LittleJS.drawTile(bodyPos.add(vec2(roomWidthInTiles, 0)), this.drawSize, this.tileInfo, this.color, this.angle, this.mirror);
    }

    calculateMoveDirection(){
        // Calculate distance considering that the room wraps
        const directDistance = player.pos.x - this.pos.x;
        let wrappedDistance;
        if (player.pos.x < this.pos.x) {
            wrappedDistance = (player.pos.x + roomWidthInTiles) - this.pos.x;
        }
        else{
            wrappedDistance = player.pos.x - (this.pos.x + roomWidthInTiles);
        }

        let moveDirection;
        if (Math.abs(directDistance) <= Math.abs(wrappedDistance)) {
            // Move directly towards the player
            moveDirection = Math.sign(directDistance);
        } else {
            // Move through the room warp
            moveDirection = Math.sign(wrappedDistance);
        }
        return moveDirection;
    }

    updateChase(){
        if(!player){
            console.log("Player doesn't exist!");
            return;
        }

        const frontRay = vec2(1.25 * sign(this.moveInput.x), 0);
        const raycastFront = LittleJS.tileCollisionRaycast(this.pos, this.pos.add(frontRay), this);
        if(raycastFront && !this.isJumping && this.onGround){
            this.enterState(EnemyState.JUMP);
        }
        const groundRay = vec2(0, -1);
        const groundRayStart = this.pos.add(vec2(0.25 * sign(this.moveInput.x), 0));
        const raycastFrontGround = LittleJS.tileCollisionRaycast(groundRayStart, groundRayStart.add(groundRay), this);
        if(!raycastFrontGround){
            // There's a gap in front
            if(!this.isJumping && this.onGround){
                this.enterState(EnemyState.JUMP);
            }
        }
    }

    enterState(nextState){
        this.state = nextState;
        if(nextState === EnemyState.CHASE){
            this.maxSpeed = this.chaseMaxSpeed;
        }
        else if(nextState === EnemyState.JUMP){
            this.jumpTimer.set(1);
            this.maxSpeed = this.jumpMaxSpeed;
        }
        else if(nextState === EnemyState.DEAD){
            this.jumpTimer.unset();
            this.spawningTimer.unset();
            this.maxSpeed = 0.25;
            this.moveInput.x = -this.calculateMoveDirection();
            this.velocity.x = this.moveInput.x * this.maxSpeed;
            this.deathTimer.set(2.5);
            this.setCollision(false, false, true);
        }
        else if(nextState === EnemyState.SPAWNING){
            this.spawningTimer.set(2);
        }
    }

    updateJump(){
        if(this.jumpTimer.active()){
            this.moveInput.x = 0;
        }
        else{
            this.moveInput.x = (this.mirror ? -1 : 1);
            if(!this.isJumping && this.onGround){
                if(player.pos.y > this.pos.y){
                    // Player is above
                    this.jump(this.highJumpPower);
                }
                else if(player.pos.y < this.pos.y){
                    // Player is below
                    this.jump(this.lowJumpPower);
                }
                else{
                    const frontRay = vec2(1.25 * sign(this.calculateMoveDirection()), 0);
                    const raycastFront = LittleJS.tileCollisionRaycast(this.pos, this.pos.add(frontRay), this);
                    if(raycastFront){
                        // There's something in front of the enemy
                        this.jump(this.highJumpPower);
                    }
                    else{
                        const newDirection = this.calculateMoveDirection();
                        if((newDirection < 0 && this.mirror) || (newDirection > 0 && !this.mirror)){
                            // Player is in front of this enemy
                            this.jump(this.highJumpPower);
                        }
                        else{
                            this.moveInput.x = this.calculateMoveDirection();
                            // Go back to CHASE state because the player is simply behind this enemy.
                            this.enterState(EnemyState.CHASE);
                        }
                    }
                }
            }
        }
    }

    jump(jumpPower = 0.4375){
        this.velocity.y = jumpPower;
        this.isJumping = true;
    }

    updateDead(){
        if(!this.deathSpinTimer.active()){
            this.deathSpinTimer.set(0.15 * (1 - this.maxSpeed / 0.35));
            const spinAmount = 90 * (LittleJS.PI / 180);
            this.angle += spinAmount * (this.mirror ? -1 : 1);
        }
        if(!this.deathTimer.active()){
            enemyDied({"spawnId": this.spawnId});
            this.destroy();
        }
    }

    updateSpawning(){
        this.moveInput.x = 0;
        this.velocity.x = 0;
        if(!this.spawningTimer.active()){
            this.moveInput.x = this.calculateMoveDirection();
            this.setCollision(true, false);
            this.enterState(EnemyState.CHASE);
        }
    }

    canTakeDamage(){
        return this.state !== EnemyState.SPAWNING && this.state !== EnemyState.DEAD;
    }

    update(){
        if(this.state === EnemyState.CHASE){
            this.updateChase();
        }
        else if(this.state === EnemyState.JUMP){
            this.updateJump();
        }
        else if(this.state === EnemyState.DEAD){
            this.updateDead();
        }
        else if(this.state === EnemyState.SPAWNING){
            this.updateSpawning();
        }
        
        if(this.moveInput.x !== 0){
            this.mirror = (this.moveInput.x < 0);
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
        if(this.state === EnemyState.DEAD){
            this.maxSpeed *= .965;
        }
        else{
            if (sign(this.moveInput.x) == sign(this.velocity.x)){
                this.velocity.x *= .8; // moving with velocity
            }
            else{
                this.velocity.x *= .5; // moving against velocity (stopping)
            }
        }

        // Check if on ground
        const groundRay = vec2(0, -1);
        const raycastHit = LittleJS.tileCollisionRaycast(this.pos, this.pos.add(groundRay), this);
        const raycastHitLeft = LittleJS.tileCollisionRaycast(this.pos.add(vec2(this.size.x/2, 0)), this.pos.add(groundRay), this);
        const raycastHitRight = LittleJS.tileCollisionRaycast(this.pos.add(vec2(-this.size.x/2, 0)), this.pos.add(groundRay), this);
        if(raycastHit || raycastHitLeft || raycastHitRight){
            this.onGround = true;
            if(!this.isJumping && !this.jumpTimer.active() && this.state === EnemyState.JUMP){
                this.enterState(EnemyState.CHASE);
            }
        }
        else{
            this.onGround = false;
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

    collideWithObject(object){
        if(object.isEnemy){
            // Enemies shouldn't collide with each other.
            return false;
        }
        if(object === player && this.canTakeDamage()){
            // TODO: testing DEAD state, change to trigger from attacks only
            this.enterState(EnemyState.DEAD);
            return false;
        }
        return true;
    }
}

export default ChaseEnemy;