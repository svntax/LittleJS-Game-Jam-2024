import * as LittleJS from "littlejsengine";
const { EngineObject, vec2, keyWasPressed, keyIsDown, gamepadWasPressed, gamepadIsDown, gamepadStick,  isUsingGamepad,
    clamp, sign } = LittleJS;

class Player extends EngineObject {
    constructor(pos){
        super(pos);

        this.velocity = vec2(0, 0);
        this.moveSpeed = 0.0625;
        
        this.drawSize = vec2(2); // Tiles are 16x16 but the sprite is 32x32
        this.tileInfo = LittleJS.tile(1, 32, 1);
        this.color = LittleJS.WHITE;
        this.mirror = false;
        this.setCollision(true, false);
        this.onGround = false;
    }

    render(){
        let bodyPos = this.pos;
        bodyPos = bodyPos.add(vec2(0,(this.drawSize.y - this.size.y) / 2));
        LittleJS.drawTile(bodyPos, this.drawSize, this.tileInfo, this.color, 0, this.mirror);
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

        if(this.jumpPressed && this.onGround){
            this.velocity.y = 0.4375;
        }

        // Floaty jump
        if(this.velocity.y > 0.125){
            this.gravityScale = 0.9;
        }
        else if(LittleJS.abs(this.velocity.y) <= 0.125){
            this.gravityScale = 0.4;
        }
        else{
            this.gravityScale = 1;
        }

        this.velocity.y = clamp(this.velocity.y, -0.125, LittleJS.objectMaxSpeed);

        // Lower map bound
        const lowerBoundY = -16;
        if(this.pos.y - (this.drawSize.y / 2) + this.velocity.y <= lowerBoundY){
            this.velocity.y = 0;
            this.pos.y = lowerBoundY + this.drawSize.y / 2;
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

        const raycastHit = LittleJS.tileCollisionRaycast(this.pos, this.pos.add(vec2(0, -1)), this);
        if(raycastHit){
            this.onGround = true;
        }
        else{
            this.onGround = false;
        }

        super.update();
    }

    collideWithTile(data, pos){
        return true;
    }
}

export default Player;