import WeaverMemory from "./weaver-memory.js";

export default class WeftIntegration extends WeaverMemory {
  weftToObsidian(node, notePath) {
    return this.weaverToObsidian(node, notePath);
  }

  obsidianToWeft(notePath) {
    return this.obsidianToWeaver(notePath);
  }
}
