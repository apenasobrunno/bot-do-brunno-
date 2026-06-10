const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

// CONFIGURE AQUI
const TOKEN = process.env.TOKEN || "MTUxNDM4ODA2NzYzNTU2MDYwMQ.GqSkcC.rBLwjWsZt2TI4PE2O23I0UglJDBwsFpYplNTE4";
const CLIENT_ID = process.env.CLIENT_ID || "1514388067635560601";

// Verificações
if (
  TOKEN === "MTUxNDM4ODA2NzYzNTU2MDYwMQ.GqSkcC.rBLwjWsZt2TI4PE2O23I0UglJDBwsFpYplNTE4" ||
  !TOKEN ||
  TOKEN.length < 50
) {
  console.log("❌ TOKEN inválido ou não configurado.");
  process.exit(1);
}

if (
  CLIENT_ID === "1514388067635560601" ||
  !CLIENT_ID
) {
  console.log("❌ CLIENT_ID inválido ou não configurado.");
  process.exit(1);
}

// Config
if (!fs.existsSync("./config.json")) {
  fs.writeFileSync(
    "./config.json",
    JSON.stringify(
      {
        apiKey: "",
        nomeSala: "SALA CUSTOM",
        tempoGo: 10
      },
      null,
      2
    )
  );
}

function loadConfig() {
  return JSON.parse(fs.readFileSync("./config.json"));
}

function saveConfig(data) {
  fs.writeFileSync("./config.json", JSON.stringify(data, null, 2));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Criar sala"),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurar bot")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )

    .addSubcommand(sub =>
      sub
        .setName("nome")
        .setDescription("Mudar nome da sala")
        .addStringOption(opt =>
          opt
            .setName("valor")
            .setDescription("Novo nome")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("tempo")
        .setDescription("Tempo do GO")
        .addIntegerOption(opt =>
          opt
            .setName("valor")
            .setDescription("Minutos")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("key")
        .setDescription("API KEY")
        .addStringOption(opt =>
          opt
            .setName("valor")
            .setDescription("Sua key")
            .setRequired(true)
        )
    )
].map(c => c.toJSON());

async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registrados.");
  } catch (err) {
    console.error("❌ Erro registrando comandos:");
    console.error(err);
  }
}

client.once("ready", () => {
  console.log(`✅ Online como ${client.user.tag}`);
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
        content: `✅ Nome alterado para ${valor}`,
        ephemeral: true
      });
    }

    if (sub === "tempo") {
      const valor = interaction.options.getInteger("valor");

      config.tempoGo = valor;
      saveConfig(config);

      return interaction.reply({
        content: `✅ GO em ${valor} minutos`,
        ephemeral: true
      });
    }

    if (sub === "key") {
      const valor = interaction.options.getString("valor");

      config.apiKey = valor;
      saveConfig(config);

      return interaction.reply({
        content: "✅ API Key salva.",
        ephemeral: true
      });
    }
  }

  if (interaction.commandName === "criar") {

    const codigo = Math.floor(
      100000 + Math.random() * 900000
    );

    const senha = Math.floor(
      1000 + Math.random() * 9000
    );

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

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
