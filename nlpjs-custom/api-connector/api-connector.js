const {containerBootstrap} = require('@nlpjs/core');
const {Connector} = require('@nlpjs/connector');
const axios = require('axios');
const gTTS = require('gtts');
const md5 = require('md5');
const fs = require('fs');
const https = require('https');

const SETTINGS = require('./settings');

const SH = axios.create({
    baseURL: SETTINGS.ENDPOINT_SMART_HOME,
});

const SERVER = process.env.SERVER || 'localhost';
const PORT = process.env.PORT || 3000;
const SPEECH_SERVER = process.env.SPEECH_SERVER || 'GOOGLE';

const isEmpty = (value) => !value || value === '';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class ApiConnector extends Connector {
    constructor(settings = {}, container = undefined) {
        super(
            {
                settings: {},
                container: settings.container || container || containerBootstrap(),
            },
            container
        );
        this.applySettings(this.settings, settings);
        if (!this.settings.tag) {
            this.settings.tag = 'api';
        }
        if (!this.settings.apiPath) {
            this.settings.apiPath = '';
        }
        this.applySettings(
            this.settings,
            this.container.getConfiguration(this.settings.tag)
        );
    }

    start() {
        const server = this.container.get('api-server').app;
        if (!server) {
            throw new Error('No api-server found');
        }
        const logger = this.container.get('logger');
        const routePath = this.getRoutePath();
        logger.info(`API connector initialized at route ${routePath}`);

        server.get(routePath, async (req, res) => {
            let question = req.query.q;
            if (isEmpty(question))
                return res.status(400).send({
                    error: "Missing question?"
                });

            const input = {
                locale: 'vi',
                message: question,
                app: this.container.name,
            };
            const nlp = this.container.get('nlp');
            if (nlp) {
                const result = await nlp.process(input);
                // console.log(result);
                let answer = 'Xin lỗi, tôi không hiểu...';
                if (!isEmpty(result.answer)) {
                    answer = result.answer;
                }

                if (!isEmpty(result.intent)) {
                    switch (result.intent) {
                        case 'smarthome.turnon':
                            // Command turn on once device
                            this.writePinValue(result, 1);
                            break;
                        case 'smarthome.turnoff':
                            // Command turn off once device
                            this.writePinValue(result, 0);
                            break;
                        case 'smarthome.turnonall':
                            // Command turn on all devices
                            this.writeAllPinValue(result, 1);
                            break;
                        case 'smarthome.turnoffall':
                            // Command turn off all devices
                            this.writeAllPinValue(result, 0);
                            break;
                        case 'smarthome.monitor':
                            // Command view temperature and humanity
                            let labels = [];
                            await SH.get('/project')
                                .then((res) => {
                                    labels = res.data.widgets.filter(
                                        (w) => w.type === 'LABELED_VALUE_DISPLAY',
                                    );
                                });
                            answer = `Phòng đang có nhiệt độ là ${parseInt(labels[1].value)}°C và độ ẩm là ${parseInt(labels[0].value)}%`;
                            break;
						case 'smarthome.time':
                            // Command view time
							let date_ob = new Date();
							let hours = date_ob.getHours();
							let minutes = date_ob.getMinutes();
                            answer = `Bây giờ là ${hours} giờ ${minutes} phút`;
                            break;
                    }
                }

                let filename = `voice-data/${SPEECH_SERVER.toLowerCase()}_${md5(answer)}.mp3`;
                let path = `public/${filename}`;
                let voiceLink = `http://${SERVER}:${PORT}/${filename}`;
                if (!fs.existsSync(path)) {
                    switch (`${SPEECH_SERVER}`) {
                        case 'GOOGLE':
                            let gtts = new gTTS(answer, 'vi');
                            gtts.save(path, function (err, result) {
                                if(err) { throw new Error(err); }
                                console.log("Text to speech converted: " + answer);
                                return res.send({answer: answer, voice: voiceLink});
                            });
                            break;
                        case 'VIETTEL':
                            let data = {
                                text: answer,
                                voice: "hn-quynhanh",
                                id: "2",
                                without_filter: false,
                                speed: 1,
                                tts_return_option: 3
                            };

                            let config = {
                                method: 'post',
                                url: SETTINGS.ENDPOINT_TTS_VIETTEL,
                                headers: {
                                    'token': SETTINGS.API_KEY_VIETTEL,
                                    'Content-Type': 'application/json'
                                },
                                data : JSON.stringify(data),
                                httpsAgent: httpsAgent,
                                responseType: 'stream'
                            };


                            axios(config)
                                .then(function (response) {
                                    let writer = fs.createWriteStream(path)
                                    response.data.pipe(writer);
                                    writer.on('finish', () => {
                                        console.log("Text to speech converted: " + answer);
                                        return res.send({answer: answer, voice: voiceLink});
                                    })
                                    writer.on('error', err => {return res.send({error: true})});
                                })
                                .catch(function (error) {
                                    console.log(error);
                                    return res.send({error: true});
                                });

                            break;
                    }
                } else {
                    return res.send({answer: answer, voice: voiceLink});
                }
            } else
				return res.send();
        });
    }

    writePinValue(nlp, value) {
        if (nlp.entities.length > 0)
            SH.get(`/update/${nlp.entities[0].option}?value=${value}`);
    }

    writeAllPinValue(nlp, value) {
        SH.get('/project')
            .then((res) => {
                let buttons = res.data.widgets.filter((w) => w.type === 'BUTTON');
                buttons.forEach(button => {
                    SH.get(`/update/${this.getPinShortCode(button)}?value=${value}`);
                });
            });

    }

    getPinShortCode(widget) {
        if (!widget.pin === -1) {
            return;
        }
        switch (widget.pinType) {
            case 'DIGITAL':
                return `D${widget.pin}`;
            case 'VIRTUAL':
                return `V${widget.pin}`;
        }
        return `${widget.pin}`;
    };

    getRoutePath() {
        let routePath = this.settings.apiPath;
        if (routePath === undefined) {
            routePath = this.container.name || '';
        }
        if (routePath && !routePath.startsWith('/')) {
            routePath = `/${routePath}`;
        }
        routePath = routePath
            ? `${routePath}${this.settings.nlpPath || '/api/nlp'}`
            : this.settings.nlpPath || '/api/nlp';

        return routePath;
    }
}

module.exports = ApiConnector;
