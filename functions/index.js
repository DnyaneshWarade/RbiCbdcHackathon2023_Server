/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cryptoJS = require("crypto-js");
const axios = require("axios");
const qs = require("qs");
const bodyParser = require("body-parser");
const express = require("express");
const {
  getLoadMoneySuccessMsg,
  getNewUserRegistrationSuccessMsg,
  getNewUserRegistrationFailureMsg,
  getLoadMoneyFailureMsg,
  getSendMoneyFailureToSenderMsg,
  getSendMoneyFailureToReceiverMsg,
  getSendMoneySuccessToSenderMsg,
  getSendMoneySuccessToReceiverMsg,
} = require("./helperFunctions");

const app = express();
admin.initializeApp();
const db = admin.firestore();

const runtimeOpts = {
  maxInstances: 10,
};

app.post("/", bodyParser.urlencoded({extended:true}), async (request, response) => {
  try {
    logger.info("Request received BodyContent: " + request.body);
  // validate the body
  if (!request.body || !request.body.content || request.body.content.length < 5) {
    logger.error("Invalid request data");
    response.status(404).send("Invalid data");
  }

  // remove start part from text local
  const encryptedMsg = request.body.content.substr(5, request.body.content.length);

  // decrypt the body
  const key = cryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY);
  const decrypted = cryptoJS.AES.decrypt(encryptedMsg, key, {
    mode: cryptoJS.mode.ECB,
    padding: cryptoJS.pad.Pkcs7,
  });
  const decryptedMessage = decrypted.toString(cryptoJS.enc.Utf8);
  const decryptedJson = JSON.parse(decryptedMessage);
  // logic to handle the sms action
  let ret = await handleSMSAction(decryptedJson, request.body.sender);
  // send response
  response.status(ret.status).send(ret.message);
  } catch (error) {
    logger.error(error);
    response.status(500).send("Something went wrong");
  }
});

exports.smsEntry = functions.runWith(runtimeOpts).https.onRequest(app);

async function handleSMSAction(msg, sender) {
  switch (msg.action) {
    case "register":
      try {
        logger.info("register user action");
        // Check if mobile no and sms send number are same or not
        if ("91" + msg.mobileNo === sender) {
          // Check user already registered or not
          const userSnap = await db
            .collection("Users")
            .where("mobileNo", "==", msg.mobileNo)
            .get();
          if (!userSnap.empty) {
            const logMsg = `user with mobile number ${msg.mobileNo} already exists`;
            logger.error(logMsg);
            await sendNewUserRegFailureSMS(
              sender,
              msg.firstName,
              msg.requestId
            );
            return {
              success: false,
              status: 404,
              message: logMsg,
            };
          }

          // Save user registration details in Firestore
          const res = await db.collection("Users").add(msg);
          const resMsg = `User is created with id: ${res.id}`;
          logger.info(resMsg);
          const smsResMsg = getNewUserRegistrationSuccessMsg(
            msg.firstName,
            msg.requestId
          );
          await sendTextlocalSMS(sender, smsResMsg);
          return {
            success: true,
            status: 201,
            message: resMsg,
          };
        } else {
          const logMsg = "message sender and registration number are not same";
          logger.error(logMsg);
          await sendNewUserRegFailureSMS(sender, msg.firstName, msg.requestId);
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
      } catch (error) {
        logger.error(error);
        await sendNewUserRegFailureSMS(sender, msg.firstName, msg.requestId);
        return {
          success: false,
          status: 404,
          message: `something went wrong ${error}`,
        };
      }
      break;

    case "loadMoney":
      try {
        logger.info("loadMoney action");
        // first get the user based from snap
        const userSnap = await db
          .collection("Users")
          .where("mobileNo", "==", msg.to)
          .get();
        if (userSnap.empty) {
          const logMsg = `user with mobile no. ${msg.mobileNo} does not exists, please register first inorder to load money`;
          logger.error(logMsg);
          await sendLoadMoneyFailureSMS(
            sender,
            "",
            msg.amount,
            msg.requestId
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        var userId = userSnap.docs[0].id;
        var userData = userSnap.docs[0].data();

        if (!msg.amount || msg.amount <= 0) {
          const logMsg = `amount ${msg.amount} is not valid`;
          logger.error(logMsg);
          await sendLoadMoneyFailureSMS(
            sender,
            userData.firstName,
            msg.amount,
            msg.requestId
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }

        // Check if mobile no and sms send number are same or not
        if ("91" + msg.to !== sender) {
          const logMsg = "message sender and registered number are not same";
          logger.error(logMsg);
          await sendLoadMoneyFailureSMS(
            sender,
            userData.firstName,
            msg.amount,
            msg.requestId
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        // loadMoney logic
        // first update the transaction
        const data = {
          requestId: msg.requestId,
          to: msg.to,
          desc: msg.desc,
          amount: msg.amount,
          date: Date.now(),
          status: "completed",
        };
        const res = await db.collection("Transactions").add(data);
        if (!res.id) {
          const logMsg = `error while uploading the transaction`;
          logger.error(logMsg);
          await sendLoadMoneyFailureSMS(
            sender,
            userData.firstName,
            msg.amount,
            msg.requestId
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        // second update the balance
        const docRef = db.collection("Users").doc(userId);
        await docRef.update("balance", userData.balance + msg.amount);
        const logMsg = `load money of amount ${msg.amount} is successful.`;
        logger.info(logMsg);
        const sendResMsg = getLoadMoneySuccessMsg(
          userData.firstName,
          msg.amount,
          msg.requestId
        );
        await sendTextlocalSMS(sender, sendResMsg);
        return {
          success: true,
          status: 200,
          message: logMsg,
        };
      } catch (error) {
        logger.error(error);
        await sendLoadMoneyFailureSMS(
          sender,
          userData.firstName,
          msg.amount,
          msg.requestId
        );
        return {
          success: false,
          status: 404,
          message: `something went wrong ${error}`,
        };
      }

      break;

    case "sendMoney":
      try {
        logger.info("send money action");
        // basic validation of data
        if (
          !msg.amount ||
          msg.amount <= 0 ||
          !msg.to ||
          !msg.from ||
          !msg.pin
        ) {
          const logMsg = `amount ${msg.amount} or sender or receiver data is not valid`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }

        // Check if mobile no and sms send number are same or not
        if ("91" + msg.to !== sender) {
          const logMsg = "message sender and registered number are not same";
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }

        // Check user, sender MobileNo is registered. Also check user balance >= amountToSend
        const userFromSnap = await db
          .collection("Users")
          .where("mobileNo", "==", msg.from)
          .get();
        if (userFromSnap.empty) {
          const logMsg = `user with mobile no. ${msg.from} does not exists, please register first inorder to send money`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        var userFromId = userFromSnap.docs[0].id;
        var userFromData = userFromSnap.docs[0].data();

        if (userFromData.balance < msg.amount) {
          const logMsg = `user with mobile no. ${sender} does not have sufficient balance`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }

        if (userFromData.pin != msg.pin) {
          const logMsg = `authentication failed for user with mobile no. ${sender}`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }

        const userToSnap = await db
          .collection("Users")
          .where("mobileNo", "==", msg.to)
          .get();
        if (userToSnap.empty) {
          const logMsg = `user with mobile no. ${msg.to} does not exists, please register first inorder to send money`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        var userToId = userToSnap.docs[0].id;
        var userToData = userToSnap.docs[0].data();

        // create new transaction
        const data = {
          from: userFromId,
          to: userToId,
          amount: msg.amount,
          date: Date.now(),
          status: "completed",
        };
        const res = await db.collection("Transactions").add(data);
        if (!res.id) {
          const logMsg = `error while uploading the transaction`;
          logger.error(logMsg);
          await sendSendMoneyFailureSMS(
            "",
            msg.amount,
            msg.requestId,
            msg.from,
            msg.to
          );
          return {
            success: false,
            status: 404,
            message: logMsg,
          };
        }
        // update sender balance
        const docFromRef = db.collection("Users").doc(userFromId);
        await docFromRef.update("balance", userFromData.balance - msg.amount);
        // update receiver balance
        const docToRef = db.collection("Users").doc(userToId);
        await docToRef.update("balance", userToData.balance + msg.amount);

        // send success response now
        const logMsg = `send money of amount ${msg.amount} from user ${msg.from} to user ${msg.to} is successful.`;
        logger.info(logMsg);
        const sendMoneySenderResSms = getSendMoneySuccessToSenderMsg(
          msg.amount,
          msg.to,
          msg.requestId
        );
        await sendTextlocalSMS(msg.from, sendMoneySenderResSms);
        const sendMoneyReceiverResSms = getSendMoneySuccessToReceiverMsg(
          userToData.firstName,
          msg.amount,
          msg.from,
          msg.requestId
        );
        await sendTextlocalSMS(sender, sendMoneyReceiverResSms);
        return {
          success: true,
          status: 200,
          message: logMsg,
        };
      } catch (error) {
        logger.error(error);
        await sendSendMoneyFailureSMS(
          "",
          msg.amount,
          msg.requestId,
          msg.from,
          msg.to
        );
        return {
          success: false,
          status: 404,
          message: `something went wrong ${error}`,
        };
      }
      break;

    default:
      logger.error("no action recognized");
      await sendSMS(sender, false);
      break;
  }

  async function sendTextlocalSMS(receiverNumber, message) {
    try {
      if (!receiverNumber || !message) {
        logger.error(
          `invalid paramters in send sms mobile no: ${receiverNumber}, message: ${message}`
        );
        return false;
      }

      let data = qs.stringify({
        apikey: process.env.TEXTLOCAL_APIKEY,
        numbers: receiverNumber,
        message: message,
        sender: "DYGNIF",
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://api.textlocal.in/send/",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: data,
      };
      const res = await axios.request(config);
      logger.info("Send SMS response" + res.data);
      if (res.status === 200) {
        const resData = JSON.stringify(res.data);
        if (resData.status === "success") {
          return true;
        }
      }
    } catch (error) {
      logger.error(error);
    }

    return false;
  }

  async function sendNewUserRegFailureSMS(sender, firstName, requestId) {
    if (!sender || !firstName || !requestId) {
      return false;
    }

    const smsResMsg = getNewUserRegistrationFailureMsg(firstName, requestId);
    return await sendTextlocalSMS(sender, smsResMsg);
  }

  async function sendLoadMoneyFailureSMS(sender, firstName, amount, requestId) {
    if (!sender || !firstName || !requestId || !amount) {
      return false;
    }

    const smsResMsg = getLoadMoneyFailureMsg(firstName, amount, requestId);
    return await sendTextlocalSMS(sender, smsResMsg);
  }

  async function sendSendMoneyFailureSMS(
    firstName,
    amount,
    requestId,
    senderMobileNo,
    receiverMobileNo
  ) {
    if (
      !firstName ||
      !requestId ||
      !amount ||
      !senderMobileNo ||
      !receiverMobileNo
    ) {
      return false;
    }

    const senderSmsResMsg = getSendMoneyFailureToSenderMsg(
      amount,
      receiverMobileNo,
      requestId
    );
    var senderStatus = await sendTextlocalSMS(senderMobileNo, senderSmsResMsg);
    const receiverSmsResMsg = getSendMoneyFailureToReceiverMsg(
      firstName,
      amount,
      senderMobileNo,
      requestId
    );
    var receivedStatus = await sendTextlocalSMS(
      receiverMobileNo,
      receiverSmsResMsg
    );
    return senderStatus && receivedStatus;
  }
}
