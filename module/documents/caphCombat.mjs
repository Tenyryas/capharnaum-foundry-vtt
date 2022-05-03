

export class CapharnaumCombat extends Combat {
        /**
         * @override
         * Roll initiative for one or multiple Combatants within the Combat entity
         * @param ids A Combatant id or Array of ids for which to roll
         * @returns A promise which resolves to the updated Combat entity once updates are complete.
         */
        async rollInitiative(ids) {

                let initiative;
                let combatantUpdates = [];
                let initRoll;
                for (const id of ids) {
                        // Get Combatant data
                        const c = this.combatants.get(id, { strict: true });
                        const maxInit = c.actor.data.data.init;
                        

                        //Do not roll for defeated combatants
                        if (c.data.defeated) continue;

                        // Draw initiative

                        if(maxInit > 6){
                                initRoll = new Roll("2d6");
                        } else {
                                initRoll = new Roll("1d6");
                        }

                        initRoll.evaluate({async: true});

                        if (initRoll.result > maxInit) {
                                initiative = maxInit;
                        } else {
                                initiative = initRoll.result;
                        }

                        combatantUpdates.push({
                                _id: c.id,
                                initiative: initiative
                        });
                }

                // Update multiple combatants
                await this.updateEmbeddedDocuments('Combatant', combatantUpdates);

                // Return the updated Combat
                return this;

        }
}