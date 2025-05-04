import { createAudioPlayer, joinVoiceChannel } from "@discordjs/voice";
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import path from 'path'
import { fileURLToPath } from "url";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('rejoindre')
        .setDescription('Rejoins le salon vocal de l\'utilisateur qui a exécuté la commande.'),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        if (!interaction.member.voice.channel || !(interaction.member.voice.channel.members.find(user => user.id === interaction.member.id && !user.bot))) {
            interaction.editReply({ content: '# Toc toc, y\'a quelqu\'un?\n\nTu n\'est pas dans un salon vocal, rejoins en un puis réessaye!', flags: MessageFlags.Ephemeral })
            return
        }

        interaction.editReply({ content: '# Attends un petit peu!\n\nJe rejoins le salon!' })

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        })

        let audioPlayer

        audioPlayer = createAudioPlayer()

        interaction.editReply({ content: '# Connexion prête!\n\n_je ne sais pas quoi mettre pour l\'instant_' })
        connection.subscribe(audioPlayer)

        console.log(connection)
    },
};