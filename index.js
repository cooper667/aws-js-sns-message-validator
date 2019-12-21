const url = require('url'),
    https = require('https'),
    crypto = require('crypto'),
    defaultEncoding = 'utf8',
    defaultHostPattern = /^sns\.[a-zA-Z0-9\-]{3,}\.amazonaws\.com(\.cn)?$/,
    certCache = {},
    subscriptionControlKeys = ['SubscribeURL', 'Token'],
    subscriptionControlMessageTypes = [
        'SubscriptionConfirmation',
        'UnsubscribeConfirmation'
    ],
    requiredKeys = [
        'Message',
        'MessageId',
        'Timestamp',
        'TopicArn',
        'Type',
        'Signature',
        'SigningCertURL',
        'SignatureVersion'
    ],
    signableKeysForNotification = [
        'Message',
        'MessageId',
        'Subject',
        'SubscribeURL',
        'Timestamp',
        'TopicArn',
        'Type'
    ],
    signableKeysForSubscription = [
        'Message',
        'MessageId',
        'Subject',
        'SubscribeURL',
        'Timestamp',
        'Token',
        'TopicArn',
        'Type'
    ],
    lambdaMessageKeys = {
        'SigningCertUrl': 'SigningCertURL',
        'UnsubscribeUrl': 'UnsubscribeURL'
    };

const hashHasKeys = function (hash, keys) {
    for(const key of keys) {
        if (!(key in hash)) {
            return false;
        }
    }

    return true;
};

function convertLambdaMessage(message) {
    for (const key in lambdaMessageKeys) {
        if (key in message) {
            message[lambdaMessageKeys[key]] = message[key];
        }
    }

    if ('Subject' in message && message.Subject === null) {
        delete message.Subject;
    }

    return message;
}

const validateMessageStructure = function (message) {
    try {
        let valid = hashHasKeys(message, requiredKeys);

        if (subscriptionControlMessageTypes.includes(message['Type'])) {
            valid = valid && hashHasKeys(message, subscriptionControlKeys);
        }

        return valid;
    } catch {
        return false;
    }
};

const validateUrl = function (urlToValidate, hostPattern) {
    try {
        const parsed = url.parse(urlToValidate);

        return parsed.protocol === 'https:'
            && parsed.path.substr(-4) === '.pem'
            && hostPattern.test(parsed.host);
    } catch {
        return false;
    }
};

const getUrl = function(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page'));
            }
            const body = [];
            response.on('data', (chunk) => body.push(chunk));
            response.on('end', () => resolve(body.join('')));
        });
        request.on('error', (err) => reject(err))
    })
};

let getCertificate = async function (certUrl) {
    if (certCache.hasOwnProperty(certUrl)) {
        return [null, certCache[certUrl]];
    }

    try {
        certCache[certUrl] = await getUrl(certUrl);
        return [null, certCache[certUrl]];
    } catch(error) {
        return [new Error('Certificate could not be retrieved')];
    }
};

const validateSignature = async function (message, encoding) {
    if (message['SignatureVersion'] !== '1') {
        throw new Error(`The signature version ${message['SignatureVersion']} is not supported.`);
    }

    let signableKeys;
    if (message.Type === 'SubscriptionConfirmation') {
        signableKeys = signableKeysForSubscription.slice(0);
    } else {
        signableKeys = signableKeysForNotification.slice(0);
    }

    const verifier = crypto.createVerify('RSA-SHA1');
    for(const key of signableKeys) {
        if (key in message) {
            verifier.update(key + "\n"
                + message[key] + "\n", encoding);
        }
    }

    const [err, certificate] = await getCertificate(message['SigningCertURL']);
    if(err) throw err;

    if (verifier.verify(certificate, message['Signature'], 'base64')) {
        return message;
    } else {
        throw new Error('The message signature is invalid.');
    }
};

/**
 * A validator for inbound HTTP(S) SNS messages.
 *
 * @constructor
 * @param {RegExp} [hostPattern=/^sns\.[a-zA-Z0-9\-]{3,}\.amazonaws\.com(\.cn)?$/] - A pattern used to validate that a message's certificate originates from a trusted domain.
 * @param {String} [encoding='utf8'] - The encoding of the messages being signed.
 */
module.exports = class MessageValidator {
    constructor(hostPattern, encoding) {
        this.hostPattern = hostPattern || defaultHostPattern;
        this.encoding = encoding || defaultEncoding;
    }

    /**
     * Validates a message's signature and passes it to the provided callback.
     *
     * @param {Object} hash
     */
    validate(hash) {
        const parsedHash = typeof hash === 'string' ? JSON.parse(hash) : hash;

        const convertedHash = convertLambdaMessage(parsedHash);

        if (!validateMessageStructure(convertedHash)) {
            throw new Error('Message missing required keys.');
        }

        if (!validateUrl(convertedHash['SigningCertURL'], this.hostPattern)) {
            throw new Error('The certificate is located on an invalid domain.');

        }

        return validateSignature(convertedHash, this.encoding);
    };
}


