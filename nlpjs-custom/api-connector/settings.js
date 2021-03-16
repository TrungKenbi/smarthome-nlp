const ENDPOINT_SMART_HOME = process.env.ENDPOINT_SMART_HOME;
const ENDPOINT_TEXT_TO_SPEECH = process.env.ENDPOINT_TEXT_TO_SPEECH;


const isEmpty = (value) => !value || value === '';

if (
    isEmpty(ENDPOINT_SMART_HOME) ||
    isEmpty(ENDPOINT_TEXT_TO_SPEECH)
) {
    throw new Error('Missing config API endpoint');
}

module.exports = {
    isEmpty,
    ENDPOINT_SMART_HOME,
    ENDPOINT_TEXT_TO_SPEECH,
};
