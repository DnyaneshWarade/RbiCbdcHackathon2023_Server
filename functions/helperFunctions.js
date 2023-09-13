const logger = require("firebase-functions/logger");
const cryptoJS = require("crypto-js");

function splitStringIntoChunks(requestId, status, chunkSize = 30) {
  const chunks = [];
  try {
    const statusCode = getStatusCode(requestId, status);
    if (!statusCode) {
      logger.error("Failed to get encrypted status code");
    }

    for (let i = 0; i < statusCode.length; i += chunkSize) {
      chunks.push(statusCode.substr(i, chunkSize));
    }
  } catch (error) {
    logger.error(error);
  }

  return chunks;
}

function encryptAES(data) {
  const key = cryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY);
  const cipher = cryptoJS.AES.encrypt(data, key, {
    mode: cryptoJS.mode.ECB,
    padding: cryptoJS.pad.Pkcs7,
  });
  return cipher.toString();
}

function getStatusCode(requestId, status) {
  if (!status || !requestId) {
    return undefined;
  }

  const smsResponse = {
    r: requestId,
    s: status,
    d: Date.now()
  };
  return encryptAES(JSON.stringify(smsResponse));
}

function getNewUserRegistrationSuccessMsg(firstName, requestId) {
  const chunks = splitStringIntoChunks(requestId, true);
  return `Congratulations ${firstName.trim()}!\nWe are happy to inform that your account & wallet has been created successfully.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getNewUserRegistrationFailureMsg(firstName, requestId, status) {
  const chunks = splitStringIntoChunks(requestId, false);
  return `We are sorry to inform ${firstName.trim()}!\nYour account & wallet creation has failed. Please try after sometime or contact your bank.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getLoadMoneySuccessMsg(firstName, amount, requestId) {
  const chunks = splitStringIntoChunks(requestId, true);
  return `Congratulations ${firstName.trim()}!\nAmount of ${amount} has been successfully credited in your ePaisa wallet.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getLoadMoneyFailureMsg(firstName, amount, requestId) {
  const chunks = splitStringIntoChunks(requestId, false);
  return `We are sorry to inform ${firstName.trim()}!\nAmount of ${amount} has failed to load in your ePaisa wallet.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getSendMoneySuccessToSenderMsg(amount, receiverMobileNo, requestId) {
  const chunks = splitStringIntoChunks(requestId, true);
  return `Congratulations, your transaction is successful!\nAmount of ${amount}, has been successfully credited to ePaisa wallet of ${receiverMobileNo}.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getSendMoneyFailureToSenderMsg(amount, receiverMobileNo, requestId) {
  const chunks = splitStringIntoChunks(requestId, false);
  return `We are sorry to inform that your transaction of amount ${amount} to ${receiverMobileNo} has failed.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getSendMoneySuccessToReceiverMsg(
  firstName,
  amount,
  senderMobileNo,
  requestId
) {
  const chunks = splitStringIntoChunks(requestId, true);
  return `Congratulations ${firstName.trim()}!\nYour have received amount of ${amount} in your ePaisa wallet from ${senderMobileNo}.\nYour interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.\nRegards,\nePaisa - Dygnify`;
}

function getSendMoneyFailureToReceiverMsg(
  firstName,
  amount,
  senderMobileNo,
  requestId
) {
  const chunks = splitStringIntoChunks(requestId, false);
  return `We are sorry to inform ${firstName.trim()}!
	Remittance of amount ${amount} from ${senderMobileNo} to you has failed.
	Your interaction id is ${chunks[0]} and ${chunks[1]} and ${chunks[2]}.
	Regards,
	ePaisa - Dygnify`;
}

module.exports = {
  getNewUserRegistrationSuccessMsg,
  getNewUserRegistrationFailureMsg,
  getLoadMoneySuccessMsg,
  getLoadMoneyFailureMsg,
  getSendMoneySuccessToSenderMsg,
  getSendMoneyFailureToSenderMsg,
  getSendMoneySuccessToReceiverMsg,
  getSendMoneyFailureToReceiverMsg,
};
