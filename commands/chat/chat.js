import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_TOKEN });

// Define maximum message length for Discord
const MAX_DISCORD_LENGTH = 2000;

// Store active chat sessions
const activeSessions = new Map();

// Add this function near the top of the file, after the activeSessions declaration
function createResponseButtons() {
    const reply = new ButtonBuilder()
        .setCustomId('Reply')
        .setLabel('Répondre')
        .setStyle(ButtonStyle.Primary);

    const newChat = new ButtonBuilder()
        .setCustomId('NewChat')
        .setLabel('Démarrer un nouveau chat')
        .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder().addComponents(reply, newChat);
}

async function handleButtonInteraction(buttonInteraction, userId, chat) {
    if (buttonInteraction.user.id !== userId) {
        await buttonInteraction.reply({ 
            content: "# Oups! \nTu ne peux pas intéragir avec la session de quelqu'un d'autre!", 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    if (buttonInteraction.customId === 'NewChat') {
        // Start a new chat session
        chat = model.startChat({});
        activeSessions.set(userId, chat);
        await buttonInteraction.reply({
            content: "Nouvelle session démaréé! Tape /chat pour la commencer.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (buttonInteraction.customId === 'Reply') {
        try {

            const modal = new ModalBuilder()
                .setCustomId('replyModal')
                .setTitle('Répondre');

            const newReply = new TextInputBuilder()
                .setCustomId('newReplyInput')
                .setLabel('Ta réponse')
                .setPlaceholder('Ecris ta réponse ici...')
                .setMinLength(1)
                .setMaxLength(MAX_DISCORD_LENGTH)
                .setStyle(TextInputStyle.Paragraph);

            const modalActionRow = new ActionRowBuilder().addComponents(newReply);
            modal.addComponents(modalActionRow);

            await buttonInteraction.showModal(modal);

            let modalSubmitInteraction;
            try {
                modalSubmitInteraction = await buttonInteraction.awaitModalSubmit({
                    filter: (i) => i.customId === 'replyModal' && i.user.id === userId,
                    time: 300000 // 5 minutes
                });
            } catch (err) {
                if (err.code === 'INTERACTION_COLLECTOR_ERROR') {
                    // Modal wasn't submitted in time
                    return buttonInteraction.followUp({
                        content: "Le formulaire a expiré. Veuillez réessayer.",
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    console.error("Modal await error:", err);
                    return;
                }
            }


			await modalSubmitInteraction.deferReply()

            const newPrompt = modalSubmitInteraction.fields.getTextInputValue('newReplyInput');
            const result = await chat.sendMessage({ message: newPrompt });
            const response = result.text;

            const finalResponse = response.length > MAX_DISCORD_LENGTH
                ? response.substring(0, MAX_DISCORD_LENGTH - 3) + '...'
                : response;

			const actionRow = createResponseButtons();

			const res = await modalSubmitInteraction.editReply({
				content: finalResponse,
				components: [actionRow]
			});

			const collector = res.createMessageComponentCollector({ time: 3600000 }); // 1 hour timeout

			collector.on('collect', async (buttonInteraction) => {
				await handleButtonInteraction(buttonInteraction, userId, chat);
			});

            collector.on('end', () => {
                if (!activeSessions.has(userId)) {
                    replyMessage.edit({ components: [] }).catch(console.error);
                }
            });
        } catch (error) {
            console.error('Modal interaction error:', error);
            try {
                const errorMessage = {
                    content: 'Erreur, appelez Toto!',
                    flags: MessageFlags.Ephemeral
                };
                
                if (!buttonInteraction.replied) {
                    await buttonInteraction.reply(errorMessage);
                } else if (buttonInteraction.deferred) {
                    await buttonInteraction.editReply(errorMessage);
                } else {
                    await buttonInteraction.followUp(errorMessage);
                }
            } catch (followUpError) {
                console.error('Error sending modal error message:', followUpError);
            }
        }
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Parle à une IA')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Le premier message')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;
            const prompt = interaction.options.getString('prompt');

            // Create or get existing chat session
            let chat;
            if (activeSessions.has(userId)) {
                chat = activeSessions.get(userId);
                console.log("active session found")
            } else {
                chat = ai.chats.create({
                    model: 'gemini-2.0-flash',
                    config: {
                        systemInstruction: (await readFile("sys_instructions.txt", { encoding: "utf-8" }))
                    }
                });
            }

            // Send message and get response
            const result = await chat.sendMessage({ message: prompt });
            const response = result.text;

            // Check response length and truncate if necessary
            const finalResponse = response.length > MAX_DISCORD_LENGTH
                ? response.substring(0, MAX_DISCORD_LENGTH - 3) + '...'
                : response;

            const actionRow = createResponseButtons();

            const res = await interaction.editReply({
                content: finalResponse,
                components: [actionRow]
            });

            const collector = res.createMessageComponentCollector({ time: 3600000 }); // 1 hour timeout

            collector.on('collect', async (buttonInteraction) => {
                await handleButtonInteraction(buttonInteraction, userId, chat);
            });

            collector.on('end', () => {
                // Clean up the session after timeout
                activeSessions.delete(userId);
            });

        } catch (error) {
            console.error('Error:', error);
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: 'Sorry, there was an error processing your request.',
                        components: []
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({
                        content: 'Sorry, there was an error processing your request.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (followUpError) {
                console.error('Error sending error message:', followUpError);
            }
        }
    },
};

