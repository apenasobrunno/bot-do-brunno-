require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// CHECKS
if (!TOKEN) {
  console.log("❌ TOKEN não encontrado no .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.log("❌ CLIENT_ID não encontrado no .env");
  process.exit(1);
}

// CONFIG
if (!fs.existsSync("./config.json")) {
  fs.writeFileSync(
    "./config.json",
    JSON.stringify({
      nomeSala: "SALA CUSTOM",
      tempoGo: 10,
      apiKey: ""
    }, null, 2)
  );
}

function loadConfig() {
  return JSON.parse(fs.readFileSync("./config.json"));
}

function saveConfig(data) {
  fs.writeFileSync("./config.json", JSON.stringify(data, null, 2));
}

// CLIENT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Criar sala"),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurar bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("nome")
        .setDescription("Mudar nome da sala")
        .addStringOption(opt =>
          opt.setName("valor")
            .setDescription("Novo nome")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("tempo")
        .setDescription("Tempo do GO")
        .addIntegerOption(opt =>
          opt.setName("valor")
            .setDescription("Minutos")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("key")
        .setDescription("API Key")
        .addStringOption(opt =>
          opt.setName("valor")
            .setDescription("Sua key")
            .setRequired(true)
        )
    )
].map(c => c.toJSON());

// REGISTER COMMANDS
async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registrados");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
}

// READY
client.once("ready", () => {
  console.log(`✅ Online como ${client.user.tag}`);
});

// INTERACTIONS
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const config = loadConfig();

  // CONFIG
  if (interaction.commandName === "config") {
    const sub = interaction.options.getSubcommand();

    if (sub === "nome") {
      config.nomeSala = interaction.options.getString("valor");
      saveConfig(config);

      return interaction.reply({
        content: `✅ Nome atualizado: ${config.nomeSala}`,
        ephemeral: true
      });
    }

    if (sub === "tempo") {
      config.tempoGo = interaction.options.getInteger("valor");
      saveConfig(config);

      return interaction.reply({
        content: `✅ Tempo GO: ${config.tempoGo} min`,
        ephemeral: true
      });
    }

    if (sub === "key") {
      config.apiKey = interaction.options.getString("valor");
      saveConfig(config);

      return interaction.reply({
        content: `✅ API Key salva`,
        ephemeral: true
      });
    }
  }

  // CRIAR SALA
  if (interaction.commandName === "criar") {
    const codigo = Math.floor(100000 + Math.random() * 900000);
    const senha = Math.floor(1000 + Math.random() * 9000);

    await interaction.reply(
`🏆 Sala criada

📛 Nome: ${config.nomeSala}
🔑 Código: ${codigo}
🔒 Senha: ${senha}

⏰ GO em ${config.tempoGo} minutos`
    );

    setTimeout(() => {
      interaction.followUp(
        `🚀 GO LIBERADO!\n📛 ${config.nomeSala}`
      ).catch(() => {});
    }, config.tempoGo * 60000);
  }
});

// ERRORS
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// START
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
