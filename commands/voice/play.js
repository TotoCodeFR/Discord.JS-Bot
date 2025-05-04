import { ChannelType, MessageFlags, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import ytdl from 'ytdl-core';
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';

const activeSkips = new Map(); // Pour éviter les votes multiples de saut à la fois
const queue = new Map(); // La file d'attente des musiques par guildId

// Fonction de gestion du saut
async function skip(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return interaction.editReply({
            content: "Vous devez être dans un canal vocal pour utiliser cette commande.",
            flags: MessageFlags.Ephemeral
        });
    }

    const memberCount = voiceChannel.members.filter(m => !m.user.bot).size;
    const requiredVotes = memberCount > 1 ? Math.ceil(memberCount / 2) : 1;

    const embed = new EmbedBuilder()
        .setTitle("Vote de saut de musique 🎵")
        .setDescription(`Une demande de saut a été initiée par <@${interaction.user.id}>.`)
        .addFields(
            { name: "Votes nécessaires", value: `1 / ${requiredVotes}`, inline: true },
        )
        .setColor("Orange")
        .setFooter({ text: "Expire dans 2 minutes." });

    const skipButton = new ButtonBuilder()
        .setCustomId("vote_skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(skipButton);

    interaction.editReply({ embeds: [embed], components: [row] });

    const message = await interaction.fetchReply();

    const voters = new Set();
    voters.add(interaction.user.id); // L'utilisateur qui a lancé le vote compte aussi

    let currentVotes = 1;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 2 * 60 * 1000, // 2 minutes
    });

    // Enregistrer le vote de saut actif pour cette guilde
    activeSkips.set(interaction.guildId, {
        collector,
        message
    });

    collector.on("collect", async i => {
        if (!i.member.voice.channel || i.member.voice.channel.id !== voiceChannel.id) {
            return i.reply({ content: "Tu dois être dans le même salon vocal pour voter.", flags: MessageFlags.Ephemeral });
        }

        if (voters.has(i.user.id)) {
            return i.reply({ content: "Tu as déjà voté !", flags: MessageFlags.Ephemeral });
        }

        voters.add(i.user.id);
        currentVotes++;

        // Mise à jour de l'embed
        embed.data.fields[0].value = `${currentVotes} / ${requiredVotes}`;
        await i.update({ embeds: [embed] });

        if (currentVotes >= requiredVotes) {
            collector.stop("skipped");
        }
    });

    collector.on("end", async (_, reason) => {
        activeSkips.delete(interaction.guildId);

        if (reason === "skipped") {
            embed.setDescription("⏭️ La musique a été passée avec succès !");
            embed.setColor("Green");
            message.edit({ embeds: [embed], components: [] });

            const connection = getVoiceConnection(interaction.guildId);

            if (!connection) return;

            // Arrêter la musique
            const player = connection.state.subscription?.player;
            if (player) {
                player.stop();
            }
        } else {
            embed.setDescription("❌ Le vote a expiré. La musique continue.");
            embed.setColor("Red");
            message.edit({ embeds: [embed], components: [] });
        }
    });

    if (requiredVotes === 1) {
        collector.stop("skipped");
    }
}

// Fonction d'ajout de musique à la playlist
async function add(interaction) {
    if (interaction.channel.type !== ChannelType.GuildVoice) {
        interaction.editReply({ content: '# Tu es sûr que tu es au bon endroit?\n\nRe-exécute cette commande dans le chat d\'un salon vocal.', flags: MessageFlags.Ephemeral });
        return;
    }

    const videoURL = interaction.options.getString("lien");

    const member = interaction.guild.members.cache.get(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.followUp("Vous devez être dans un canal vocal pour ajouter une musique.");
    }

    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
        // Joindre le canal vocal
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
    }

    // Si il n'y a pas de player existant, créer un nouveau player
    let player = connection.state.subscription?.player;
    if (!player) {
        player = createAudioPlayer();
        connection.subscribe(player);
    }

    // Récupérer l'URL du flux audio
    let stream;
    try {
        stream = ytdl(videoURL, { filter: 'audioonly', quality: 'highestaudio' });
    } catch (error) {
        return interaction.followUp("Une erreur s'est produite lors de l'extraction du flux audio.");
    }

    // Créer une ressource audio
    const resource = createAudioResource(stream);

    // Ajouter à la file d'attente
    if (!queue.has(interaction.guildId)) {
        queue.set(interaction.guildId, []);
    }

    const serverQueue = queue.get(interaction.guildId);
    serverQueue.push(resource);

    // Si le player est inactif, commencer à jouer la musique
    if (player.state.status === AudioPlayerStatus.Idle) {
        playNextInQueue(interaction.guildId);
    }

    // Confirmation
    return interaction.followUp(`La musique de ${videoURL} a été ajoutée à la playlist.`);
}

// Fonction pour jouer la prochaine musique de la file d'attente
function playNextInQueue(guildId) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || serverQueue.length === 0) return;

    const connection = getVoiceConnection(guildId);
    const player = connection?.state.subscription?.player;
    if (!player) return;

    const nextTrack = serverQueue.shift();
    player.play(nextTrack); // ✅ pas besoin de refaire un createAudioResource()

    player.once(AudioPlayerStatus.Idle, () => {
        playNextInQueue(guildId);
    });
}

// Commandes Slash
export default {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Ajouter une musique à une playlist')
        .addSubcommand(subCommand => subCommand
            .setName("add")
            .setDescription("Ajoute une musique à une playlist")
            .addStringOption(option =>
                option
                    .setName("lien")
                    .setDescription("Le lien YouTube de la musique")
                    .setRequired(true)
            )
        )
        .addSubcommand(subCommand => subCommand
            .setName("skip")
            .setDescription("Créer un vote de passe de musique.")
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            await add(interaction);
        } else if (sub === 'skip') {
            await skip(interaction);
        }
    },
};
