const input = {
    "Type" : "Notification",
    "MessageId" : "c3b4a063-5f75-5382-93cc-f617543bf590",
    "TopicArn" : "arn:aws:sns:us-east-2:693645241078:CloudwatchAlerts",
    "Subject" : "log error",
    "Message" : "{\"id\":\"35160858038942125810605845726748282755422303439779266560\",\"timestamp\":1576667403978,\"message\":{},\"event\":\"* Container 7655159760040085 started in br-ca-qc-2-cersei (Wed Dec 18 2019 11:09:54 GMT+0000 (UTC))\\r\\n* Got dependency LinkedIn Companies Info.js\\r\\n* Got dependency lib-LinkedIn.js\\r\\n* Got dependency lib-StoreUtilities.js\\r\\n* Spawning Node v8.10.0\\r\\nℹ️ Your \\\"Folder management\\\" setting is currently on \\\"Delete all previous files at launch\\\", this API may not be able to continue its job where it left off next launch. Consider changing it to \\\"Mix new and old files\\\".\\r\\nℹ️ Processing 3 lines...\\r\\nCompanies to scrape: [\\r\\n    \\\"http://www.linkedin.com/company/3103304\\\",\\r\\n    \\\"https://www.linkedin.com/company/neathouse-partners-limited\\\",\\r\\n    \\\"http://uk.linkedin.com/company/dicitas-consulting\\\"\\r\\n]\\r\\n\uD83D\uDD04 Connecting to LinkedIn...\\r\\n❌ Can't connect to LinkedIn with this session cookie.\\r\\n* Process finished with an error (exit code: 83) (Wed Dec 18 2019 11:09:59 GMT+0000 (UTC))\\r\\n\",\"logGroup\":\"/aws/lambda/spider-linkedin-spiderLinkedIn-EPPV2Y1EKQ47\",\"name\":\"spider-linkedin-spiderLinkedIn-EPPV2Y1EKQ47\",\"logStream\":\"2019/12/18/[45]c8b0e18c08c44ab4b6f011032432bed3\",\"type\":\"log error\",\"url\":\"https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logEventViewer:group=/aws/lambda/spider-linkedin-spiderLinkedIn-EPPV2Y1EKQ47;stream=2019/12/18/[45]c8b0e18c08c44ab4b6f011032432bed3;reftime=1576667403978;refid=35160858038942125810605845726748282755422303439779266560;\"}",
    "Timestamp" : "2019-12-18T11:10:06.137Z",
    "SignatureVersion" : "1",
    "Signature" : "OxaHEioQqrkwB6hyF8YFEtCvRVamuY4Gj2brNMZYoyMT1cYiFs6b9YAxrM1eP1zMu3ed4U6TRoGSvqn0P+woLxTdm0PPUebupGivibbrCuZnHA1W2L3KkLQ4yDbfDnBi57K5L6YHNoE8JhyttD7XU7boQTon16zhvT+Fpyzc1rY59TgCuxVseyftio6sx7CPidiYjysheBhQ7MAviKoSH2PRY9fvim375F909nbJOxEiR+QXombE3re5teFfLC9ngXosk2qC4BawWTYP5YR+yr6E8AGopgtVngvWWsOX54msYvWEp5ku0YcJBjgGY2W4WHyHy3YLoztrqvzVjYfEQ==",
    "SigningCertURL" : "https://sns.us-east-2.amazonaws.com/SimpleNotificationService-6aad65c2f9911b05cd53efda11f913f9.pem",
    "UnsubscribeURL" : "https://sns.us-east-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-2:693645241078:CloudwatchAlerts:83078622-1dbc-4f9e-9ec8-0c804e971459"
};

// var MessageValidator = require('sns-validator');


const  MessageValidator = require("./index.js");

const validator = new MessageValidator();

(async () => {
    try {
        const res = await validator.validate(input);
        console.log(res);
    } catch(e) {
        console.log("errrr");
        console.log(e);
    }
})();