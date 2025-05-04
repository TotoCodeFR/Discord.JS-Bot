import { SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

export default {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Vas-tu être chanceux? 👀'),

    async execute(interaction) {
        await interaction.deferReply()
        const random = Math.round(Math.random())
        if (random === 1) {
            interaction.editReply({ content: 'Tu es tombé sur pile! 🪙' })
        } else {
            interaction.editReply({ content: 'Tu es tombé sur face! 😀' })
        }
    },
};