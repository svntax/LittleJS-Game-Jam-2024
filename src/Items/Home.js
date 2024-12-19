import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2, clamp, sign } = LittleJS;

import { roomWidthInTiles } from "../gameLevel";
import { player } from "../game.js";

class Home extends EngineObject {
    constructor(pos){
        super(pos);
        
        this.tileInfo = LittleJS.tile(9, vec2(32, 16), 0);
        this.currentColorIndex = 0;
        this.flashColors = [LittleJS.WHITE, new LittleJS.Color(88 / 255, 245 / 255, 177 / 255)]
        this.colorFlashTimer = new Timer();
        this.drawSize = vec2(2, 1);
        this.size = vec2(1, 1);

        this.setCollision(true, false, true);
        this.gravityScale = 0;
    }

    render(){
        let bodyPos = this.pos.add(vec2(0, 1)); // The sprite itself is offset upwards a bit
        const currentColor = this.flashColors[this.currentColorIndex];
        for(let i = 0; i < 2; i++){

        }
        LittleJS.drawTile(bodyPos, this.drawSize, this.tileInfo, currentColor);
        // Draw copies of the sprite on both sides off screen to make the warping effect seamless.
        LittleJS.drawTile(bodyPos.add(vec2(-roomWidthInTiles, 0)), this.drawSize, this.tileInfo, currentColor);
        LittleJS.drawTile(bodyPos.add(vec2(roomWidthInTiles, 0)), this.drawSize, this.tileInfo, currentColor);
    }

    update(){
        this.velocity.x = 0;
        this.velocity.y = 0;
        if(!this.colorFlashTimer.active()){
            this.colorFlashTimer.set(0.5);
            if(this.currentColor === this.color1){
                this.currentColorIndex++;
                this.currentColorIndex %= this.flashColors.length;
            }
        }

        super.update();
    }

    collideWithObject(object){
        if(object === player){
            if(!player.isDead && !player.savingGorillas){
                player.saveHeldGorillas();
            }
        }
        return false;
    }
}

export default Home;