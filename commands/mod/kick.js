import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulse un utilisateur pour la raison donnée")
        .addUserOption(option => option
            .setName("utilisateur")
            .setDescription("L'utilisateur qu'il faut expulser")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("raison")
            .setDescription("La raison pourquoi l'expulser.")
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // On check si c'est bien quelqu'un qui peut kick
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.editReply({ content: '# Mais tu te crois pour qui?\n\nTu n\'a pas la permission pour utiliser cette commande!' });
        }

        const utilisateurAExpulser = interaction.options.getUser("utilisateur");
        const confirmerEmbed = new EmbedBuilder()
            .setColor("#ffa500") // orange pour différencier du ban qui est rouge
            .setTitle("Expulser " + utilisateurAExpulser.username)
            .addFields(
                { name: 'Confirmer l\'expulsion de ' + utilisateurAExpulser.username,
                    value: 'Êtes-vous sûr de vouloir expulser ' + utilisateurAExpulser.username }
            )
        
        const confirmer = new ButtonBuilder()
            .setCustomId("confirmerKick")
            .setLabel("Oui, je veux l'expulser")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
        
        const refuser = new ButtonBuilder()
            .setCustomId("refuserKick")
            .setLabel("Non, je change d'idée")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
        
        const ligne = new ActionRowBuilder()
            .addComponents(confirmer, refuser)
        
        const reponse = await interaction.editReply({ 
            embeds: [confirmerEmbed],
            components: [ligne]
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await reponse.awaitMessageComponent({ 
                filter: collectorFilter, 
                time: 120_000 
            });

            if (confirmation.customId === "confirmerKick") {
                await interaction.guild.members.kick(utilisateurAExpulser);
                await confirmation.update({ 
                    content: `${utilisateurAExpulser.username} expulsé.`, 
                    components: [], 
                    embeds: [] 
                });
            } else if (confirmation.customId === "refuserKick") {
                await confirmation.update({ 
                    content: 'Action annulée.', 
                    components: [], 
                    embeds: [] 
                });
            }
        } catch (e) {
            await interaction.editReply({ content: 'Aucune confirmation reçue!', components: [], embeds: [] });
        }
    }
}