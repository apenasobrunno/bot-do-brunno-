const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

const TOKEN = "MTUxNDM4ODA2NzYzNTU2MDYwMQ.GqSkcC.rBLwjWsZt2TI4PE2O23I0UglJDBwsFpYplNTE4";
const CLIENT_ID = "1514388067635560601";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Criar config.json automaticamente
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
    return JSON.parse(fs.readFileSync("./config.json", "utf8"));
}

function saveConfig(data) {
    fs.writeFileSync("./config.json", JSON.stringify(data, null, 2));
}

const commands = [
    new SlashCommandBuilder()
        .setName("criar")
        .setDescription("Criar sala"),

    new SlashCommandBuilder()
        .setName("config")
        .setDescription("Configurar bot")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

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
                        .setDescription("Tempo em minutos")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("key")
                .setDescription("Definir API Key")
                .addStringOption(opt =>
                    opt
                        .setName("valor")
                        .setDescription("Sua Key")
                        .setRequired(true)
                )
        )
].map(cmd => cmd.toJSON());

async function registrarComandos() {
    try {
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("✅ Comandos registrados.");
    } catch (err) {
        console.error("❌ Erro ao registrar comandos:");
        console.error(err);
    }
}

client.once("ready", () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
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
                content: `✅ Nome alterado para: ${valor}`,
                ephemeral: true
            });
        }

        if (sub === "tempo") {
            const valor = interaction.options.getInteger("valor");

            config.tempoGo = valor;
            saveConfig(config);

            return interaction.reply({
                content: `✅ Tempo GO: ${valor} minutos`,
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

        await interaction.reply({
            content: "⏳ Criando sala...",
            ephemeral: false
        });

        const codigo = Math.floor(
            100000 + Math.random() * 900000
        );

        const senha = Math.floor(
            1000 + Math.random() * 9000
        );

        await interaction.editReply(
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
            } catch (e) {
                console.error(e);
            }
        }, config.tempoGo * 60000);
    }
});

client.on("error", console.error);

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

(async () => {
    await registrarComandos();
    client.login(TOKEN);
})();
