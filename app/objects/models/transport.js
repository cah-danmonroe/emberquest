import { v4 } from "ember-uuid";

export class Transport {
  constructor(x, y, spawnerId, objectConfig) {
    let uuid = v4();
    this.id = `${spawnerId}-${uuid}`;
    this.spawnerId = spawnerId;
    this.x = x;
    this.y = y;
    this.objectConfig = objectConfig;
  }
}