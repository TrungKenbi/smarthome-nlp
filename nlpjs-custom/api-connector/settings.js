const ENDPOINT_SMART_HOME = process.env.ENDPOINT_SMART_HOME;
const ENDPOINT_TTS_VIETTEL = process.env.ENDPOINT_TTS_VIETTEL;
const API_KEY_VIETTEL = process.env.API_KEY_VIETTEL;

const isEmpty = (value) => !value || value === '';

if (
    isEmpty(ENDPOINT_SMART_HOME) ||
    isEmpty(ENDPOINT_TTS_VIETTEL) ||
    isEmpty(API_KEY_VIETTEL)
) {
    throw new Error('Missing config API endpoint');
}

module.exports = {
    isEmpty,
    ENDPOINT_SMART_HOME,
    ENDPOINT_TTS_VIETTEL,
    API_KEY_VIETTEL
};
