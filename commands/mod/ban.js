import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bannis un utilisateur pour la raison donnée et le temps donné (si un)")
        .addUserOption(option => option
            .setName("utilisateur")
            .setDescription("L'utilisateur qu'il faut bannir")
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("raison")
            .setDescription("La raison pourquoi le bannir.")
        ),
    async execute(interaction) { // L'intéraction est ce qui permet à notre bot de répondre à la commande, où bien de savoir qui l'a exécuté
        // Un truc cool avec VS Code est que si tu écris quelque chose qui n'a pas été importé, ça te le rajoute
        // à tes imports.
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // En faisant ça, ça va marquer "Le bot réfléchit" jusqu'à ce
        // qu'on utilise la fonction interaction.editReply()
        // MessageFlags.Ephemeral va juste permettre à l'admin de "Rejeter le message" (et il sera aussi visible qu'à lui)

        // On check si c'est bien quelqu'un qui peut ban
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            interaction.editReply({ content: '# Mais tu te crois pour qui?\n\nTu n\'a pas la permission pour utiliser cette commande!' })
        }

        const utilisateurABannir = interaction.options.getUser("utilisateur");
        const confirmerEmbed = new EmbedBuilder()
            .setColor("#ff6e6e") // un rouge clair // allez sur google colors
            .setTitle("Bannir " + utilisateurABannir.username) // titre + pseudo de la personne à bannir
            .addFields(
                { name: 'Confirmer le ban de ' + utilisateurABannir.username,
                    value: 'Êtes-vous sûr de vouloir bannir ' + utilisateurABannir.username }
            )
        
        // Bouton confirmer
        const confirmer = new ButtonBuilder()
            .setCustomId("confirmerBan") // IMPORTANT - Permet de de déterminer le quel bouton est le quel (on ne peut pas utiliser les variables)
            .setLabel("Oui, je veux le bannir") // Le texte sur le bouton
            .setEmoji("✅") // L'emoji sur le bouton
            .setStyle(ButtonStyle.Success) // Sa couleur de fond (
        
        const refuser = new ButtonBuilder()
            .setCustomId("refuserBan")
            .setLabel("Non, je change d'idée")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
        
        // Pour créer des boutons, il faut une ligne puis les boutons
        const ligne = new ActionRowBuilder()
            .addComponents(confirmer, refuser) // On rajoute les boutons à la ligne
        
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

            if (confirmation.customId === "confirmerBan") {
                await interaction.guild.members.ban(utilisateurABannir);
                await confirmation.update({ 
                    content: `${utilisateurABannir.username} banni.`, 
                    components: [], 
                    embeds: [] 
                });
            } else if (confirmation.customId === "refuserBan") {
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