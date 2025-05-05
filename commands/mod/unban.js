import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Débannir un utilisateur du serveur")
        .addStringOption(option => option
            .setName("utilisateur")
            .setDescription("L'ID ou le nom d'utilisateur à débannir")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("raison")
            .setDescription("La raison du débannissement")
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.editReply({ 
                content: '# Mais tu te crois pour qui?\n\nTu n\'a pas la permission pour utiliser cette commande!' 
            });
        }

        const userInput = interaction.options.getString('utilisateur');
        const raison = interaction.options.getString('raison') ?? 'Aucune raison fournie';

        try {
            const bans = await interaction.guild.bans.fetch();
            let banInfo;

            // Check if input is an ID
            if (/^\d+$/.test(userInput)) {
                banInfo = bans.find(ban => ban.user.id === userInput);
            } else {
                // Check if input is a username
                banInfo = bans.find(ban => 
                    ban.user.username.toLowerCase() === userInput.toLowerCase() ||
                    `${ban.user.username}#${ban.user.discriminator}`.toLowerCase() === userInput.toLowerCase()
                );
            }

            if (!banInfo) {
                return interaction.editReply({
                    content: "# Erreur ❌\n\nCet utilisateur n'est pas banni ou n'a pas été trouvé!"
                });
            }

            const userId = banInfo.user.id;
            const username = banInfo.user.username;

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm-unban')
                .setLabel('Confirmer')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel-unban')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Confirmation de débannissement')
                .setDescription(`Êtes-vous sûr de vouloir débannir ${username} ?`)
                .addFields(
                    { name: 'Utilisateur', value: username, inline: true },
                    { name: 'ID', value: userId, inline: true },
                    { name: 'Raison', value: raison }
                )
                .setTimestamp();

            const response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                if (confirmation.customId === 'confirm-unban') {
                    await interaction.guild.members.unban(userId, raison);
                    await confirmation.update({
                        content: `# Débannissement réussi ✅\n\nL'utilisateur ${username} a été débanni.\nRaison: ${raison}`,
                        embeds: [],
                        components: []
                    });
                } else {
                    await confirmation.update({
                        content: '# Action annulée ⚠️\n\nLe débannissement a été annulé.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: '# Temps écoulé ⏰\n\nLa confirmation a expiré. Veuillez réessayer.',
                    embeds: [],
                    components: []
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: "# Erreur ❌\n\nUne erreur est survenue lors de la recherche de l'utilisateur."
            });
        }
    }
};