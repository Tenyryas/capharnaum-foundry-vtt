/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/capharnaum/templates/actor/parts/actor-items.html",
    "systems/capharnaum/templates/actor/parts/actor-spells.html",
    "systems/capharnaum/templates/actor/parts/actor-effects.html",
    "systems/capharnaum/templates/actor/parts/actor-skills.html",
    "systems/capharnaum/templates/actor/parts/actor-sidebar.html",
    "systems/capharnaum/templates/actor/parts/actor-path-abilities.html",
    "systems/capharnaum/templates/actor/parts/npc-skills.html",
  ]);
};
