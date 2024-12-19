import * as LittleJS from "littlejsengine";
const { EngineObject, Timer, vec2 } = LittleJS;

import { roomWidthInTiles } from "./gameLevel";

class TextPopup extends EngineObject {
    constructor(pos){
        super(pos);

        this.velocity = vec2(0, 0);
        this.offset = vec2();
        this.lifeTimer = new Timer();
        this.duration = 1.25;
        this.lifeTimer.set(this.duration);
        this.gravityScale = 0;
        this.color = LittleJS.WHITE;
        this.setCollision(false, false, false, false);
    }

    render(){
        const textPos = this.pos.add(this.offset);
        LittleJS.drawText(this.text, textPos, 0.5, this.color, 0, LittleJS.WHITE, "center", "PressStart2P");
        LittleJS.drawText(this.text, textPos.add(vec2(-roomWidthInTiles, 0)), 0.5, this.color, 0, LittleJS.WHITE, "center", "PressStart2P");
        LittleJS.drawText(this.text, textPos.add(vec2(roomWidthInTiles, 0)), 0.5, this.color, 0, LittleJS.WHITE, "center", "PressStart2P");
    }

    update(){
        super.update();
        if(!this.lifeTimer.active()){
            this.destroy();
        }
    }
}

export default TextPopup;