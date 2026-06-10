const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");

const TOKEN = "MTUxNDM4ODA2NzYzNTU2MDYwMQ.GqSkcC.rBLwjWsZt2TI4PE2O23I0UglJDBwsFpYplNTE4";
const CLIENT_ID = "1514388067635560601";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function loadConfig() {
  return JSON.parse(fs.readFileSync("./config.json"));
}

function saveConfig(data) {
  fs.writeFileSync("./config.json", JSON.stringify(data, null, 2));
}

const commands = [
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Criar uma sala"),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurações do bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("nome")
        .setDescription("Alterar nome da sala")
        .addStringOption(opt =>
          opt.setName("valor")
            .setDescription("Novo nome")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("tempo")
        .setDescription("Alterar tempo do GO")
        .addIntegerOption(opt =>
          opt.setName("valor")
            .setDescription("Tempo em minutos")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("key")
        .setDescription("Definir API KEY")
        .addStringOption(opt =>
          opt.setName("valor")
            .setDescription("Sua API Key")
            .setRequired(true)
        )
    )
].map(cmd => cmd.toJSON());

(async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("Comandos registrados.");
})();

client.once("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const config = loadConfig();

  if (interaction.commandName === "config") {

    const sub = interaction.options.getSubcommand();

    if (sub === "nome") {
      const valor = interaction.options.getString("valor");

      config.nomeSala = valor;
      saveConfig(config);

      return interaction.reply({
        content: `✅ Nome da sala alterado para: ${valor}`,
        ephemeral: true
      });
    }

    if (sub === "tempo") {
      const valor = interaction.options.getInteger("valor");

      config.tempoGo = valor;
      saveConfig(config);

      return interaction.reply({
        content: `✅ Tempo GO definido para ${valor} minutos`,
        ephemeral: true
      });
    }

    if (sub === "key") {
      const valor = interaction.options.getString("valor");

      config.apiKey = valor;
      saveConfig(config);

      return interaction.reply({
        content: `✅ API KEY salva.`,
        ephemeral: true
      });
    }
  }

  if (interaction.commandName === "criar") {

    await interaction.reply("⏳ Criando sala...");

    try {

      /*
      COLOQUE AQUI A API REAL

      Exemplo:

      const sala = await axios.post(
        "URL_DA_API",
        {
          nome: config.nomeSala
        },
        {
          headers: {
            Authorization: config.apiKey
          }
        }
      );
      */

      const salaFake = {
        codigo: "123456",
        senha: "7890"
      };

      await interaction.editReply(
`🏆 Sala criada

📛 Nome: ${config.nomeSala}
🔑 Código: ${salaFake.codigo}
🔒 Senha: ${salaFake.senha}

⏰ GO em ${config.tempoGo} minutos`
      );

      setTimeout(async () => {
        await interaction.followUp(
          `🚀 GO LIBERADO!\n📛 ${config.nomeSala}`
        );
      }, config.tempoGo * 60 * 1000);

    } catch (err) {

      console.error(err);

      interaction.editReply(
        "❌ Erro ao criar sala."
      );
    }
  }
});

client.login(TOKEN);
