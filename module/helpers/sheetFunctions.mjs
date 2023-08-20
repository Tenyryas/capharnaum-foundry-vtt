/**
 * Handles heroism recalculation
 * @private
 */
async function _onHeroClick() {

        // Use a safe clone of the actor data for further operations.
        const user = game.user;
        const actorData = this.actor.data.toObject(false);
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

async function _onRollAttribute(event) {

        // Use a safe clone of the actor data for further operations.
        const actorData = this.actor.data.toObject(false);

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


//Skill roll window call
async function _onRollSkill(event) {

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

function rollSkill(attr, figure, skill) {

        const actorData = this.actor.data.toObject(false);
        const attrValue = actorData.data.attributes[attr].value;
        const skillValue = actorData.data.skills[figure][skill].value;

        const dice = attrValue + skillValue;
        const dragon = actorData.data.dragon_dice;
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

function formulaConcat(total, dragon) {

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