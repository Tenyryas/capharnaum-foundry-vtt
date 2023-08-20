// Import document classes.
import { CapharnaumActor } from "./documents/actor.mjs";
import { CapharnaumItem } from "./documents/item.mjs";
import { CapharnaumCombat } from "./documents/caphCombat.mjs";
// Import sheet classes.
import { CapharnaumActorSheet } from "./sheets/actor-sheet.mjs";
import { CapharnaumNpcSheet } from "./sheets/actor-npc-sheet.mjs";
import { CapharnaumItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { CAPHARNAUM } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  console.log(`Capharnaüm | Initializing the Capharnaüm Game System\n${CAPHARNAUM.ASCII}`);

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.capharnaum = {
    CapharnaumActor,
    CapharnaumItem,
    rollItemMacro,
    CapharnaumCombat
  };

  // Add custom constants for configuration.
  CONFIG.CAPHARNAUM = CAPHARNAUM;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = CapharnaumActor;
  CONFIG.Item.documentClass = CapharnaumItem;
  CONFIG.Combat.documentClass = CapharnaumCombat;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  Actors.registerSheet("capharnaum", CapharnaumActorSheet, { 
    types: ["Dragon-marked"],
    makeDefault: true,
    label: "CAPHARNAUM.DragonMarkedSheet" 
  });
  Actors.registerSheet("capharnaum", CapharnaumNpcSheet, { 
    types: ["npc"],
    makeDefault: true,
    label: "CAPHARNAUM.NpcSheet"  
  });

  Items.registerSheet("capharnaum", CapharnaumItemSheet, { 
    makeDefault: true 
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.system;

  // Create the macro command
  const command = `game.capharnaum.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "capharnaum.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}