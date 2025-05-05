import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("nom")
        .setDescription("description"),
    async execute(interaction) { // L'intéraction est ce qui permet à notre bot de répondre à la commande, où bien de savoir qui l'a exécuté
        // code
    }
}