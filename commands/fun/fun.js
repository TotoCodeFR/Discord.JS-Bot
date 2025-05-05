import { SlashCommandBuilder } from "discord.js";

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  }  

export default {
    data: new SlashCommandBuilder()
        .setName("dé")
        .setDescription("Lance le dé"),
    async execute(interaction) { // L'intéraction est ce qui permet à notre bot de répondre à la commande, où bien de savoir qui l'a exécuté
        await interaction.deferReply(); // On dit à l'utilisateur que "le bot réfléchit" 
        
        const nombre = getRandomInt(1, 6) // 1 = minimum, 6 = maximum // Math.round() arrondit le nombre
        // car on peut pas l'avoir en entier, pour une certaine raison...

        await interaction.editReply({ content: `Tu es tombé sur ${nombre}` }) // On envoie notre nombre à l'utilisateur
        // toString() le met en texte, car DiscordJS n'aime pas
    }
}