import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import 'dotenv/config'
import { deployCommands } from './deploy.js';
import express from 'express'
import cors from 'cors'
import chokidar from 'chokidar'
import ws from 'ws';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await deployCommands(client);

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

let serveur; // On le définit ici pour y avoir accès partout dans le code

function démarrerServeur(port) {
	serveur = express()

	serveur.use(cors())

	serveur.use(express.static("panel"))

	const wss = new ws.Server({ port: 8080 })

	const watcher = chokidar.watch('panel/', {
		ignored: /(^|[\/\\])\../, // ignore dotfiles
		persistent: true
	});
	
	// Broadcast to all connected clients
	function broadcast(message) {
		wss.clients.forEach(client => {
			if (client.readyState === ws.OPEN) {
				client.send(message);
			}
		});
	}
	
	// Watch for file changes
	watcher.on('change', path => {
		broadcast('refresh');
	});

	serveur.listen(port, () => {
		console.log("Serveur prêt")
	});
}

démarrerServeur(7560)