const logger = require("firebase-functions/logger");
const axios = require("axios");

export async function getBankList() {
    try {
      let config = {
        method: "get",
        url: "https://api.apixplatform.com/cbdc/hackathon/banks",
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function getCustomer(bankId, customerId) {
    try {
      let config = {
        method: "get",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/customers/${customerId}`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function createCustomer(bankId, user) {
    try {
      let config = {
        method: "post",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/customers`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
        data: user,
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function getWallet(bankId, customerId, walletAdd) {
    try {
      let config = {
        method: "get",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/customers/${customerId}/wallets/${walletAdd}`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function createWallet(bankId, data) {
    try {
      let config = {
        method: "post",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/customers/${customerId}/wallets`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
        data: data,
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function loadMoney(bankId, data) {
    try {
      let config = {
        method: "post",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/purchases`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
        data: data,
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }

export async function sendMoney(bankId, customerId, walletAdd) {
    try {
      let config = {
        method: "post",
        url: `https://api.apixplatform.com/cbdc/hackathon/banks/${bankId}/customer/${customerId}/wallets/${walletAdd}/transfer`,
        headers: {
          "Content-Type": "application/json",
          "X-Authorization" : process.env.MASTERCARD_CBDC_API_KEY
        },
        data: data,
      };
      const res = await axios.request(config);
      logger.info("Response" + res.data);
      if (res.status === 200) {
        return JSON.stringify(res.data);
      }
    } catch (error) {
      logger.error(error);
    }

    return undefined;
  }