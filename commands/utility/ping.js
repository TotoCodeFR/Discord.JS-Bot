import { SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Retourne la latence du bot.'),

    async execute(interaction) {
        await interaction.deferReply()
        await interaction.editReply({ content: `Pong 🏓!\nLatence: ${Date.now() - interaction.createdAt}ms` })
    },
};

