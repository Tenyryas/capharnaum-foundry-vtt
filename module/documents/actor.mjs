/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class CapharnaumActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as attribute modifiers rather than attribute scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.capharnaum || {};
    const statCon = actorData.data.attributes.con.value;
    const statDex = actorData.data.attributes.dex.value;
    const statInt = actorData.data.attributes.int.value;
    const skillAth = actorData.data.skills.adventurer.athletics.value;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);

    // Max HP
    if( actorData.type =="Dragon-marked" || actorData.type =="Valiant Captain") {
      actorData.data.health.max = statCon * 10;
    }
    else {
      actorData.data.health.max = 6;
    }

    // Soak
    // actorData.data.soak.value = (statCon + actorData.data.virtues.heroism.max + actorData.data.soak.armor);

    // Init
    actorData.data.init = 1 + Math.floor((statCon + statDex + statInt) / 3);

    // Passive defence
    actorData.data.defence = 6 + statDex + skillAth;


  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'Dragon-marked') return;

    // Make modifications to data here. For example:
    const data = actorData.data;

    // Loop through attribute scores, and add their modifiers to our sheet output.
    // for (let [key, attribute] of Object.entries(data.attributes)) {
    //   // Calculate the modifier using d20 rules.
    //   attribute.mod = Math.floor((attribute.value - 10) / 2);
    // }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const data = actorData.data;
    data.xp = (data.cr * data.cr) * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.data.type !== 'Dragon-marked') return;

    // Copy the attribute scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.data.type !== 'npc') return;

    // Process additional NPC data here.
  }

}