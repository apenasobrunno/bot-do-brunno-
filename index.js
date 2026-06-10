const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const axios = require("axios");

const TOKEN = "SEU_TOKEN_BOT";
const CLIENT_ID = "ID_DO_BOT";

// SUA API KEY
const API_KEY = "SUA_KEY_AQUI";

// CONFIG PADRÃO
let config = {
  tempoGo: 10,
  nomeSala: "SALA PREMIADA"
};

if (fs.existsSync("./config.json")) {
  config = JSON.parse(fs.readFileSync("./config.json"));
}

function salvarConfig() {
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Criar sala Free Fire"),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurar sala")
    .addStringOption(option =>
      option
        .setName("tipo")
        .setDescription("tempo ou nome")
        .setRequired(true)
        .addChoices(
          { name: "tempo", value: "tempo" },
          { name: "nome", value: "nome" }
        )
    )
    .addStringOption(option =>
      option
        .setName("valor")
        .setDescription("Novo valor")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

(async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("Slash commands carregados.");
})();

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "config") {
    const tipo = interaction.options.getString("tipo");
    const valor = interaction.options.getString("valor");

    if (tipo === "tempo") {
      config.tempoGo = parseInt(valor);
      salvarConfig();

      return interaction.reply(
        `✅ Tempo GO definido para ${valor} minutos`
      );
    }

    if (tipo === "nome") {
      config.nomeSala = valor;
      salvarConfig();

      return interaction.reply(
        `✅ Nome da sala alterado para: ${valor}`
      );
    }
  }

  if (interaction.commandName === "criar") {
    await interaction.reply("⏳ Criando sala...");

    try {

      // TROCAR PELO ENDPOINT CORRETO DA API
      const response = await axios.post(
        "https://api.exemplo.com/criar-sala",
        {
          nome: config.nomeSala
        },
        {
          headers: {
            Authorization: API_KEY
          }
        }
      );

      const sala = response.data;

      await interaction.editReply(`
🏆 Sala criada!

📛 Nome: ${config.nomeSala}
🔑 Código: ${sala.codigo}
🔒 Senha: ${sala.senha}

⏰ GO em ${config.tempoGo} minutos
      `);

      setTimeout(async () => {
        interaction.followUp(
          `🚀 GO LIBERADO!\nSala: ${config.nomeSala}`
        );
      }, config.tempoGo * 60 * 1000);

    } catch (err) {
      console.log(err);

      await interaction.editReply(
        "❌ Erro ao criar sala."
      );
    }
  }
});

client.login(TOKEN);
