import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { handlebarsHelpers } from "../helpers/handlebarsHelpers.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CapharnaumNpcSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["capharnaum", "sheet", "actor"],
      template: "systems/capharnaum/templates/actor/actor-npc-sheet.html",
      width: 700,
      height: 835,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return "systems/capharnaum/templates/actor/actor-npc-sheet.html";
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.data.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.flags = actorData.flags;

    // Prepare NPC data and items.
    this._prepareCharacterData(context);
    this._prepareItems(context);

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
    for (let [k, v] of Object.entries(context.data.attributes)) {
      v.label = game.i18n.localize(CONFIG.CAPHARNAUM.attributes[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.data.skills)) {

      for (let [a, b] of Object.entries(context.data.skills[k])) {
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
    }

    // Assign and return
    context.gear = gear;
    context.weapon = weapon;
    context.armor = armor;
    context.magic_word = magic_word;
    context.path_ability = path_ability;
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
    html.find('.rollable').click(this._onRoll.bind(this));

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

  rollAttribute(attribute) {
    const actorData = this.data;

    const label = actorData.data[attribute].label;
    const dice = actorData.data[attribute].value + actorData.data.virtues.heroism.max;
    const dragon = actorData.data.dragon_dice;
    let total = dice - dragon;
    let roll;

    if (total <= 0) {
      roll = new Roll("(@dragon)d6x", { dragon: dragon });
    }
    else {
      roll = new Roll("(@total)d6 + (@dragon)d6x", { total: total, dragon: dragon });
    }

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode'),
    });
    return roll;
  }

}
