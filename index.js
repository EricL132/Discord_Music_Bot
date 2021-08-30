const {joinVoiceChannel,createAudioPlayer,createAudioResource,entersState,StreamType,AudioPlayerStatus,VoiceConnectionStatus} = require("@discordjs/voice")
const {Client, Intents} = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_VOICE_STATES] })
const config = require("./config.json")
const path = require("path")
const ytdl = require('ytdl-core');
const fs = require('fs')
const player = createAudioPlayer();
let connection;
async function playSong(url) {
    ytdl(url).pipe(fs.createWriteStream('music.mp4')).on('finish', async () => {
        const resource = createAudioResource('./music.mp4', {
            inputType: StreamType.Arbitrary,
        });
        player.play(resource);
        currentPlaying=url
        return entersState(player, AudioPlayerStatus.Playing, 5e3);
    });
}


async function connectToChannel(message) {
	connection = joinVoiceChannel({
		channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
	});
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
		return connection;
	} catch (error) {
		connection.destroy();
		throw error;
	}
}

client.on('ready',()=>{
    console.log("Connected")
})

let currentPlaying = ""
let nextTracks = []

client.on('message',async (message)=>{
    if(message.content.startsWith("-p ")){
        let musicURL = message.content.replace("-p ","")
        const {voice} = message.member
        if(!voice.channelId){
            return message.reply('You must be in a voice channel')
        }
        if(currentPlaying===""){
            await playSong(musicURL, voice.channelId);
            connectToChannel(message).then(connection=>{
                connection.subscribe(player);
            })
        }else{
            nextTracks.push(musicURL)
        }
    }

    if(message.content.startsWith('-pause')){
        player.pause()
    }

    if(message.content.startsWith('-resume')){
        player.unpause()
    }

    if(message.content.startsWith('-stop')){
        player.stop()
        if(connection) connection.destroy();
    }

    if(message.content.startsWith('-skip')){
        getNextResource()
    }
    
})

function getNextResource(){
    const nextTrack = nextTracks.shift()
    playSong(nextTrack)
}



player.on(AudioPlayerStatus.Idle, () => {
    if(nextTracks.length>0){
        getNextResource()
    }else{
        currentPlaying = ""
    }
	
});

client.login(config.Token)