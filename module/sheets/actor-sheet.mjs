import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { handlebarsHelpers } from "../helpers/handlebarsHelpers.mjs";
import "../helpers/sheetFunctions.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CapharnaumActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["capharnaum", "sheet", "actor"],
      template: "systems/capharnaum/templates/actor/actor-dragon-marked-sheet.html",
      width: 700,
      height: 835,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/capharnaum/templates/actor/actor-dragon-marked-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    context.enrichments = {
      "biography": await TextEditor.enrichHTML(context.system.biography, {async: true}),
      "spellList": await TextEditor.enrichHTML(context.system.magic.spellList, {async: true})
    };

    // Prepare character data and items.
    if (actorData.type == 'Dragon-marked') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // register Handlebars helpers
    handlebarsHelpers();

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle attribute scores.
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.CAPHARNAUM.attributes[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.skills)) {

      for (let [a, b] of Object.entries(context.system.skills[k])) {
        b.label = game.i18n.localize(CONFIG.CAPHARNAUM.skills[a]) ?? a;
      }

      v.label = game.i18n.localize(CONFIG.CAPHARNAUM.figures[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const weapon = [];
    const armor = [];
    const path_ability = [];
    const magic_word = [];
    const spells = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'gear') {
        gear.push(i);
      }
      // Append to weapon.
      if (i.type === 'weapon') {
        weapon.push(i);
      }
      // Append to armor.
      if (i.type === 'armor') {
        armor.push(i);
      }
      // Append to Sacred Word list.
      if (i.type === 'magic_word') {
        magic_word.push(i);
      }
      // Append to features.
      if (i.type === 'path_ability') {
        path_ability.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.weapon = weapon;
    context.armor = armor;
    context.magic_word = magic_word;
    context.path_ability = path_ability;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable attributes.
    html.find('.rollableAttribute').click(this._onRollAttribute.bind(this));
    html.find('.rollableSkill').click(this._onRollSkill.bind(this));

    html.find('.resetHeroism').click(this._onHeroClick.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[attribute] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }


  /**
   * Handles heroism recalculation
   * @private
   */
  async _onHeroClick() {

    // Use a safe clone of the actor data for further operations.
    const user = game.user;
    const actorData = this.actor.toObject(false);
    const virtues = actorData.data.virtues;


    virtues.heroism.max = Math.floor((virtues.bravery.value + virtues.faith.value + virtues.loyalty.value) / 3);

    virtues.heroism.value = virtues.heroism.max;

    // Update the values on the sheet
    this.document.update(
      {
        "data.virtues.heroism.value": virtues.heroism.value,
        "data.virtues.heroism.max": virtues.heroism.max,
      }
    );

    const message = await renderTemplate(
      "systems/capharnaum/templates/chat/heroism-reset.html",
      { target: actorData, speaker: user }
    );


    const chatData = {
      content: message,
    };
    ChatMessage.create(chatData);


  }

  async _onRollAttribute(event) {

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const attribute = dataset.label;


    const dice = actorData.data.attributes[attribute].value + actorData.data.virtues.heroism.max;
    const dragon = actorData.data.dragon_dice;
    let total = dice - dragon;
    let roll;

    let formula = this.formulaConcat(total, dragon);


    roll = new Roll(formula);

    // Prepare message

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${game.i18n.localize(CONFIG.CAPHARNAUM.attributes[attribute])} | ${game.i18n.localize("CAPHARNAUM.AttributeRoll")}`,
      rollMode: game.settings.get('core', 'rollMode'),
    });

    // Sort dice by result

    roll.dice[0].results.sort(function (a, b) { return a.result - b.result });

    return roll;
  }

  async _onRollSkill(event) {

    const element = event.currentTarget;
    const dataset = element.dataset;
    const figure = dataset.figure;
    const skill = dataset.skill;
    let attribute;
    const rendered_dialog = await renderTemplate("systems/capharnaum/templates/dialogs/rollDialog.html");

    let d = new Dialog({
      title: `${game.i18n.localize("CAPHARNAUM.SkillRoll")} - ${game.i18n.localize(CONFIG.CAPHARNAUM.skills[skill])}`,
      content: rendered_dialog,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice"></i>',
          label: game.i18n.localize("CAPHARNAUM.DialogButtonRoll"),
          callback: html => {
            attribute = html.find('.attrSelect').val();
            this.rollSkill(attribute, figure, skill);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("CAPHARNAUM.DialogButtonCancel"),
        }
      },
      default: "cancel"
    });
    d.render(true);

  }

  rollSkill(attr, figure, skill) {

    const actorData = this.actor.toObject(false);
    const attrValue = actorData.system.attributes[attr].value;
    const skillValue = actorData.system.skills[figure][skill].value;

    const dice = attrValue + skillValue;
    const dragon = actorData.system.dragon_dice;
    let flavorText = "";

    let total = dice - dragon;
    let roll;

    let formula = this.formulaConcat(total, dragon);


    roll = new Roll(formula);

    // Prepare message
    // if the character has rolled skill at zero, it's an unskilled test.
    if (skillValue === 0) {
      flavorText = `${game.i18n.localize(CONFIG.CAPHARNAUM.attributes[attr])} + ${game.i18n.localize(CONFIG.CAPHARNAUM.skills[skill])} | ${game.i18n.localize("CAPHARNAUM.UnskilledRoll")}`;
    } else {
      flavorText = `${game.i18n.localize(CONFIG.CAPHARNAUM.attributes[attr])} + ${game.i18n.localize(CONFIG.CAPHARNAUM.skills[skill])} | ${game.i18n.localize("CAPHARNAUM.SkillRoll")}`;
    }

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      rollMode: game.settings.get('core', 'rollMode'),
    });

    roll.dice[0].results.sort(function (a, b) { return a.result - b.result });

    return roll;

  }

  formulaConcat(total, dragon) {

    let formula;

    // Check if total of dice is less or equal to 0.
    // If it is, roll as much dragon dice as possible (const dice)
    // If not, roll as normal
    if (total <= 0) {

      formula = "";

      for (let i = 0; i < dice; i++) {

        let dragonDieString;

        if (dragon === 1) {
          dragonDieString = `1d6x[${game.i18n.localize("CAPHARNAUM.DragonDie")}]`;
        }
        else {
          dragonDieString = `1d6x[${game.i18n.localize("CAPHARNAUM.DragonDie")} ${i + 1}]`;
        }
        formula = formula.concat(" + ", dragonDieString);

      }

    } else {

      formula = total + "d6";

      for (let i = 0; i < dragon; i++) {

        let dragonDieString;

        if (dragon === 1) {
          dragonDieString = `1d6x[${game.i18n.localize("CAPHARNAUM.DragonDie")}]`;
        }
        else {
          dragonDieString = `1d6x[${game.i18n.localize("CAPHARNAUM.DragonDie")} ${i + 1}]`;
        }
        formula = formula.concat(" + ", dragonDieString);

      }
    }

    return formula;
  }

}