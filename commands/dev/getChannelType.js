import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import path from 'path'
import { fileURLToPath } from "url";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('getchanneltype')
        .setDescription('[DEV UNIQUEMENT] Get the current channel\'s type'),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        interaction.editReply({ content: "" + interaction.channel.type })
    },
};