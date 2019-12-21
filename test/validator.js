const chai = require('chai'),
    crypto = require('crypto'),
    sandbox = require('sinon').sandbox.create(),
    expect = chai.expect,
    rewire = require('rewire'),
    pem = require('pem'),
    MessageValidator = rewire('../index.js'),
    signableKeysForSubscription = MessageValidator.__get__('signableKeysForSubscription'),
    invalidMessage = {
        foo: 'bar',
        fizz: 'buzz'
    },
    validMessage = {
        Type: 'Notification',
        MessageId: '1',
        TopicArn: 'arn',
        Message: 'A message for you!',
        Timestamp: (new Date).toISOString(),
        SignatureVersion: '1',
        SigningCertURL: "https://localhost:56789/cert.pem"
    },
    validLambdaMessage = {
        Type: 'Notification',
        MessageId: '1',
        TopicArn: 'arn',
        Subject: null,
        Message: 'A Lambda message for you!',
        Timestamp: (new Date).toISOString(),
        SignatureVersion: '1',
        SigningCertUrl: "https://localhost:56789/cert.pem"
    },
    validSubscriptionControlMessage = Object.assign({}, validMessage, {
        Token: 'Nonce',
        SubscribeURL: 'https://www.amazonaws.com',
        Type: 'SubscriptionConfirmation'
    }),
    utf8Message = Object.assign({}, validMessage, {
        Message: 'Ａ Ｍｅｓｓａｇｅ Ｆｏｒ ｙｏｕ！',
    }),
    utf8SubscriptionControlMessage = Object.assign({}, utf8Message, {
        Token: 'Nonce',
        SubscribeURL: 'https://www.amazonaws.com',
        Type: 'SubscriptionConfirmation'
    }),
    validCertUrl = 'https://sns.us-east-1.amazonaws.com/cert.pem';

describe('Message Validator', function () {
    before(function (done) {
        pem.createCertificate({}, function (err, certHash) {
            if (err) throw err;

            var crypto = require('crypto'),
                validMessages = [
                    validMessage,
                    validLambdaMessage,
                    validSubscriptionControlMessage,
                    utf8Message,
                    utf8SubscriptionControlMessage
                ];

            for (var i = 0; i < validMessages.length; i++) {
                var signer = crypto.createSign('RSA-SHA1');

                for (var j = 0; j < signableKeysForSubscription.length; j++) {
                    if (signableKeysForSubscription[j] in validMessages[i]) {
                        // skip signing null Subject fields to match Lambda behavior
                        if (
                            signableKeysForSubscription[j] === 'Subject' &&
                            validMessages[i][signableKeysForSubscription[j]] === null
                        ) {
                            continue;
                        }

                        signer.update(signableKeysForSubscription[j] + "\n"
                            + validMessages[i][signableKeysForSubscription[j]] + "\n", 'utf8');
                    }
                }

                validMessages[i]['Signature']
                    = signer.sign(certHash.serviceKey, 'base64');
            }

            MessageValidator.__set__('getCertificate', (url) => [null, certHash.certificate]);
            done();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('validator interface', function () {
        it('should return the validated message', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/))
                .validate(validMessage);

            expect(message).to.equal(validMessage);
        });

    });

    describe('message validation', function () {
        it('should reject hashes without all required keys', async function () {
            try {
                const message = await (new MessageValidator())
                    .validate(invalidMessage);
            } catch(err) {
                expect(err).to.be.an('error');
                expect(err.message)
                    .to.equal('Message missing required keys.');
            }
        });

        it('should accept Lambda payloads with improper "Url" casing', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/))
              .validate(validLambdaMessage);

            expect(message.Message)
                .to.equal('A Lambda message for you!');

        });

        it('should reject hashes residing on an invalid domain', async function () {
            try {
                const message = await (new MessageValidator)
                    .validate(validMessage);
            } catch(err) {
                expect(err).to.be.an('error');
                expect(err.message)
                    .to.equal('The certificate is located on an invalid domain.');
            }
        });

        it('should reject hashes with an invalid signature type', async function () {
            try {
                const message = await (new MessageValidator)
                .validate(Object.assign({}, validMessage, {
                    SignatureVersion: '2',
                    SigningCertURL: validCertUrl
                }));
            } catch(err) {
                expect(err).to.be.an('error');
                expect(err.message)
                    .to.equal('The signature version 2 is not supported.');
            }
        });

        it('should attempt to verify the signature of well-structured messages', async function () {
            try {
                const message = await (new MessageValidator(/^localhost:56789$/))
                    .validate(Object.assign({}, validMessage, {
                        Signature: (Buffer.from('NOT A VALID SIGNATURE'))
                            .toString('base64')}));
            } catch(err) {
                expect(err.message)
                    .to.equal('The message signature is invalid.');
            }
        });

        it('should accept a valid message', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/))
                .validate(validMessage);
        });

        it('should accept valid messages as JSON strings', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/))
                .validate(JSON.stringify(validMessage));
        });
    });

    describe('subscription control message validation', function () {
        it('should reject subscribe hashes without additional keys', async function () {
            try {
                const message = await (new MessageValidator(/^localhost:56789$/))
                    .validate(Object.assign({}, validMessage, {
                        Type: 'SubscriptionConfirmation'
                    }));
            } catch(err) {
                expect(err.message)
                    .to.equal('Message missing required keys.');
            }
        });

        it('should accept a valid subscription control message', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/))
                .validate(validSubscriptionControlMessage);
        });
    });

    describe('UTF8 message validation', function () {
        it('should accept a valid UTF8 message', async function () {
            const message = await (new MessageValidator(/^localhost:56789$/, 'utf8'))
                .validate(utf8Message);
        });
    });

    describe('invalid signing cert', function () {
        it('should catch any errors thrown during verification', async function () {
            const verifier = {
                update: sandbox.spy(),
                verify: sandbox.stub().throws()
            };
            sandbox.stub(crypto, 'createVerify').returns(verifier);

            try {
                const message = await (new MessageValidator(/^localhost:56789$/, 'utf8'))
                    .validate(utf8Message);
            } catch(err) {
                expect(err).not.to.be.undefined;
            }
        });
    });
});
