require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder,
  REST, Routes
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// Configurações
const API_BASE = process.env.API_BASE;
const API_KEY = process.env.API_KEY; // Usa a sua chave
const DB_PATH = './database.json';
const MODOS = {
  1: "Padrão / Sem carregamento",
  2: "Com equipamento",
  3: "Gel infinito",
  4: "Full capa",
  5: "Capa nível 3 sem carregamento"
};

// Carregar banco
function carregarDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({
    salas_criadas: {},
    config_global: { senha_fixa: "1234", timer_padrao: 3 }
  }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH));
}
function salvarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Inicializar bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Registrar comandos
const comandos = [
  new SlashCommandBuilder().setName('perfil').setDescription('Ver informações da chave da API'),
  new SlashCommandBuilder().setName('config').setDescription('Configurar senha e timer padrão')
    .addStringOption(o => o.setName('senha').setDescription('Senha numérica para salas'))
    .addIntegerOption(o => o.setName('timer').setDescription('Início automático (1 a 8 min)').setMinValue(1).setMaxValue(8)),
  new SlashCommandBuilder().setName('cs1').setDescription('Criar sala: Padrão'),
  new SlashCommandBuilder().setName('cs2').setDescription('Criar sala: Com equipamento'),
  new SlashCommandBuilder().setName('cs3').setDescription('Criar sala: Gel infinito'),
  new SlashCommandBuilder().setName('cs4').setDescription('Criar sala: Full capa'),
  new SlashCommandBuilder().setName('cs5').setDescription('Criar sala: Capa nível 3'),
  new SlashCommandBuilder().setName('info').setDescription('Ver detalhes de uma sala')
    .addStringOption(o => o.setName('sshash').setDescription('Hash da sala').setRequired(true)),
  new SlashCommandBuilder().setName('expulsar').setDescription('Expulsar jogador da sala')
    .addStringOption(o => o.setName('sshash').setDescription('Hash da sala').setRequired(true))
    .addIntegerOption(o => o.setName('id_jogador').setDescription('ID da conta do jogador').setRequired(true))
];

// Evento: Bot pronto
client.once('ready', async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: comandos.map(c => c.toJSON()) });
  console.log('✅ Comandos registrados');
});

// Função para criar sala
async function criarSala(usuarioId, modo, interaction) {
  const db = carregarDB();
  try {
    const cfg = db.config_global;
    const resposta = await axios.post(
      `${API_BASE}/api/v1/create:room`,
      {
        modo: modo,
        senha: cfg.senha_fixa,
        nome: `Sala_${usuarioId}`,
        auto_start: cfg.timer_padrao
      },
      {
        headers: {
          Authorization: API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const { roomId, sshash, senha, nome, modoCriado } = resposta.data;
    db.salas_criadas[sshash] = { usuarioId, roomId, sshash, senha, nome, modo, criada_em: Date.now() };
    salvarDB(db);

    // Botões de ação
    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`iniciar:${sshash}`).setLabel('Iniciar Partida').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`atualizar:${sshash}`).setLabel('Atualizar Status').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`copiar:${roomId}:${senha}`).setLabel('Copiar ID/Senha').setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎮 Sala Criada com Sucesso!')
      .setColor(0x2ECC71)
      .addFields(
        { name: '🏷️ Nome', value: nome, inline: true },
        { name: '⚙️ Modo', value: modoCriado, inline: true },
        { name: '🆔 ID da Sala', value: roomId, inline: true },
        { name: '🔑 Senha', value: senha, inline: true },
        { name: '🔗 Hash', value: sshash, inline: true }
      );

    await interaction.reply({ embeds: [embed], components: [botoes] });
  } catch (erro) {
    const mensagem = erro.response?.data?.msg || 'Erro ao criar sala. Tente novamente.';
    await interaction.reply({ content: `❌ ${mensagem}`, ephemeral: true });
  }
}

// Processar comandos e botões
client.on('interactionCreate', async interaction => {
  const db = carregarDB();

  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'perfil') {
      try {
        const res = await axios.get(`${API_BASE}/api/verificar-key?oauth_key=${API_KEY}`);
        const { nome, ativa, usos_totais, usos_restantes, limite_usos } = res.data;
        const embed = new EmbedBuilder()
          .setTitle('📊 Dados da Chave')
          .setColor(0x3498DB)
          .addFields(
            { name: '📛 Nome', value: nome, inline: true },
            { name: '✅ Status', value: ativa ? 'Ativa' : 'Inativa', inline: true },
            { name: '🔄 Usos', value: `${usos_totais} / ${limite_usos}`, inline: true },
            { name: '💸 Saldo Restante', value: `${usos_restantes} usos`, inline: true }
          );
        return interaction.reply({ embeds: [embed] });
      } catch (e) {
        return interaction.reply('❌ Erro ao consultar dados da chave.');
      }
    }

    if (commandName === 'config') {
      const senha = interaction.options.getString('senha');
      const timer = interaction.options.getInteger('timer');
      if (senha) db.config_global.senha_fixa = senha;
      if (timer) db.config_global.timer_padrao = timer;
      salvarDB(db);
      return interaction.reply(`⚙️ Configuração salva!\nSenha padrão: ${db.config_global.senha_fixa}\nTempo início automático: ${db.config_global.timer_padrao} min`);
    }

    if (commandName === 'cs1') return criarSala(interaction.user.id, 1, interaction);
    if (commandName === 'cs2') return criarSala(interaction.user.id, 2, interaction);
    if (commandName === 'cs3') return criarSala(interaction.user.id, 3, interaction);
    if (commandName === 'cs4') return criarSala(interaction.user.id, 4, interaction);
    if (commandName === 'cs5') return criarSala(interaction.user.id, 5, interaction);

    if (commandName === 'info') {
      const sshash = interaction.options.getString('sshash');
      try {
        const res = await axios.post(
          `${API_BASE}/api/v2/info:room`,
          { sshash },
          { headers: { Authorization: API_KEY } }
        );
        const { room, infoGroups } = res.data;
        let listaTimes = '';
        infoGroups.forEach(time => {
          listaTimes += `\n**${time.teamLabel}**\n`;
          if (time.players.length === 0) {
            listaTimes += `→ Nenhum jogador\n`;
          } else {
            time.players.forEach(jogador => {
              listaTimes += `• ${jogador.nickname} | ID: ${jogador.playerID} | ${jogador.playerPlatform}\n`;
            });
          }
        });
        const embed = new EmbedBuilder()
          .setTitle(`ℹ️ Detalhes da Sala: ${room.nome}`)
          .setColor(0x9B59B6)
          .setDescription(`**Estado:** ${room.estado}\n**Modo:** ${MODOS[room.modo] || 'Desconhecido'}\n${listaTimes}`);
        return interaction.reply({ embeds: [embed] });
      } catch (e) {
        return interaction.reply('❌ Sala não encontrada ou inválida.');
      }
    }

    if (commandName === 'expulsar') {
      const sshash = interaction.options.getString('sshash');
      const idJogador = interaction.options.getInteger('id_jogador');
      try {
        await axios.post(
          `${API_BASE}/api/v2/expulsar-player`,
          { sshash, accountid: idJogador },
          { headers: { Authorization: API_KEY } }
        );
        return interaction.reply(`✅ Jogador ${idJogador} foi expulso da sala!`);
      } catch (e) {
        return interaction.reply('❌ Não foi possível expulsar o jogador.');
      }
    }
  }

  // Ações dos botões
  if (interaction.isButton()) {
    const [acao, valor1, valor2] = interaction.customId.split(':');

    if (acao === 'iniciar') {
      try {
        await axios.post(
          `${API_BASE}/api/v2/start:room`,
          { sshash: valor1, enviar_msg: true },
          { headers: { Authorization: API_KEY } }
        );
        return interaction.reply('✅ Partida iniciada com sucesso!');
      } catch (e) {
        return interaction.reply({ content: '❌ Erro ao iniciar a partida.', ephemeral: true });
      }
    }

    if (acao === 'atualizar') {
      try {
        const res = await axios.post(
          `${API_BASE}/api/v2/check:room`,
          { sshash: valor1 },
          { headers: { Authorization: API_KEY } }
        );
        return interaction.reply(`🔄 Status da sala: **${res.data.status_atual}**`);
      } catch (e) {
        return interaction.reply({ content: '❌ Não foi possível atualizar.', ephemeral: true });
      }
    }

    if (acao === 'copiar') {
      return interaction.reply({ content: `📋 ID: ${valor1} | Senha: ${valor2}`, ephemeral: true });
    }
  }
});

// Iniciar o bot
client.login(process.env.DISCORD_TOKEN);
