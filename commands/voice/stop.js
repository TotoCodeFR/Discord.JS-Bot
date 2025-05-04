import { getVoiceConnections } from "@discordjs/voice";
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import path from 'path'
import { fileURLToPath } from "url";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Déconnecte le bot de son salon vocal.'),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        const connections = getVoiceConnections()

        for (const [, connection] of connections) {
            connection.destroy()
        }

        interaction.editReply({ content: '# Bot déconnecté\n\nLe bot a été déconnecté de toutes ses sessions.' })
    },
};