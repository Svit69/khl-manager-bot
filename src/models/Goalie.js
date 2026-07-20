import { Player } from "./Player.js";

export class Goalie extends Player {
  getEfficiency() {
    return super.getEfficiency() * 1.02;
  }
}
