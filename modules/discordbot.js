const Discord = require('discord.js');
const debug = require('debug')('discordFrontend');

// initialize the discord bot

class DiscordInstance {
    /**
     * initialize
     * @param {config} config config snippet from global
     */
    constructor(config) {
        this.cfg = config;
        this.channelID = this.cfg.bot.channel;
        this.mentionRequire = this.cfg.bot.requireMention;
        this.permRequired = this.cfg.bot.managementRole;
        this.dbg = function (msg) {
            debug(`[${this.cfg.clientName}]: ${msg}`);
        };
        // list for storing regex match pairs
        //config-able command opts
        this.inputHookQueue = {};

        this.discordClient = new Discord.Client();
        this.dbg('Initializing discord frontend');
    }
    /**
     * starts the bot
     * @param {String} channelID id of channel to sit in
     */
    init(channelID = this.channelID) {

        return new Promise((resolve, reject) => {

            this.discordClient.login(this.cfg.clientToken)
                // .then((resolve) => null)
                .catch(reason => {
                    this.dbg('err');
                    reject(reason);
                });
            this.channelID = channelID;
            //boot hooking
            this.discordClient.on('ready', () => {
                this.clientName = this.discordClient.user.username;
                this.channel = this.discordClient.channels.get(this.cfg.bot.channel);
                this.discordClient.user.setActivity('Active and managing servers');
                this.dbg('Discord ready');
                //input hooking
                this.discordClient.on('message', message => this.messageHandle(message));
                resolve(true);

            });

        });

    }

    /**
     * @returns {boolean} isStillValid
     */
    isStillAlive() {
        return this.discordClient && this.discordClient.status === 0;
    }

    passOutput(data, destination = this.channelID) {
        if (!this.channelID) this.channelID = this.cfg.bot.channel;
        if (!this.channel) this.channel = this.discordClient.channels.get(destination);
        this.channel.send(data)
            .then(result => this.dbg(`sent message ${data} ${result}`))
            .catch(err => this.dbg(`err send message ${data} ${err}`));

    }

    /**
     *  append regex filter for input trigger
     * @param {String} tag tag for identifying regex purpose
     * @param {RegExp} regex regex object to match with
     * @param {function} cb callback run on match
     */
    registerInputQueue(tag, regex, cb) {
        if (!this.inputHookQueue.hasOwnProperty(tag)) {
            this.dbg(`appended new regex trigger: ${tag} for: ${regex}`);
            this.inputHookQueue[tag] = {
                'call': cb,
                'reg': regex
            };
        }
    }

    /**
     * Handles incoming message
     * @param {Discord.Message} data discord bot message event
     * @param {DiscordInstance} self the discord class instance 
     */
    messageHandle(data) {
        //invalidate bot messages
        if (data.author.bot) return;
        //invalidate non mentions
        let t = /[@](\S+)/.exec(data.cleanContent);
        if (t === null) return;
        if (t[1] !== this.clientName) return;

        // check for exist regex
        if (this.inputHookQueue !== null && this.inputHookQueue.length !== 0) {

            // for each of the internal regex items, check against and pass if needed
            for (let tag in this.inputHookQueue) {
                if (this.inputHookQueue.hasOwnProperty(tag)) {
                    let tmp = this.inputHookQueue[tag];

                    if (tmp.reg.exec(data.cleanContent) !== null) {
                        //pass the message and the current instance for exec outside of scope
                        //make sure we don't talk to a bot
                        tmp.call(data);
                    }
                }
            }
        }

        // else we don't care, no messages are filtered for output
        // unless debug print all
        if (this.debugLevel === 2) {
            this.dbg(`${data}`);
        }

    }

}

module.exports = {
    DiscordInstance
};