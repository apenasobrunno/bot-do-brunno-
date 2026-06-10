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

if (!TOKEN) {
    console.log("❌ TOKEN não encontrado no .env");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.log("❌ CLIENT_ID não encontrado no .env");
    process.exit(1);
}

function loadConfig() {
    return JSON.parse(fs.readFileSync("./config.json", "utf8"));
}

function saveConfig(data) {
    fs.writeFileSync(
        "./config.json",
        JSON.stringify(data, null, 2)
    );
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
                .setDescription("Alterar nome da sala")
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
                .setDescription("Alterar tempo do GO")
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
                .setDescription("Salvar API KEY")
                .addStringOption(opt =>
                    opt
                        .setName("valor")
                        .setDescription("Sua API KEY")
                        .setRequired(true)
                )
        )
].map(cmd => cmd.toJSON());

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        {
            body: commands
        }
    );

    console.log("✅ Comandos registrados");
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

            const valor =
                interaction.options.getString("valor");

            config.nomeSala = valor;
            saveConfig(config);

            return interaction.reply({
                content: `✅ Nome alterado para ${valor}`,
                ephemeral: true
            });
        }

        if (sub === "tempo") {

            const valor =
                interaction.options.getInteger("valor");

            config.tempoGo = valor;
            saveConfig(config);

            return interaction.reply({
                content: `✅ GO definido para ${valor} minutos`,
                ephemeral: true
            });
        }

        if (sub === "key") {

            const valor =
                interaction.options.getString("valor");

            config.apiKey = valor;
            saveConfig(config);

            return interaction.reply({
                content: "✅ API KEY salva.",
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

        setTimeout(async () => {

            try {

                await interaction.followUp(
                    `🚀 GO LIBERADO!\n📛 ${config.nomeSala}`
                );

            } catch {}
        }, config.tempoGo * 60000);
    }
});

(async () => {

    try {

        await registerCommands();

        await client.login(TOKEN);

    } catch (err) {

        console.error("❌ Erro:");
        console.error(err);
    }

})();
