/*
  Hashcast - A messaging layer for Plasma Users 
  Copyright (C) 2021 Enya Inc. Palo Alto, CA

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import md5 from 'md5';
import networkService from 'services/networkService';

import { HASHCAST_API_URL } from '../Settings';
import { transfer, getTransferTypedData } from './networkAction';
import { openAlert, openError } from './uiAction';
import { updateTransactionHistory, releaseUTXO } from './reserveAction';

const BN = require('bn.js');

const sendHashcastBegin = () => ({
  type: "SEND_HASHCAST",
})

const sendHashcastSuccess = () => ({
  type: "SEND_HASHCAST_SUCCESS",
})

const sendHashcastFailure = (data) => ({
  type: "SEND_HASHCAST_FAILURE",
  payload: data,
})

const uploadHashcastMessageBegin = () => ({
  type: "UPLOAD_HASHCAST_MESSAGE",
})

const uploadHashcastMessageSuccess = () => ({
  type: "UPLOAD_HASHCAST_MESSAGE_SUCCESS",
})

const uploadHashcastMessageFailure = (data) => ({
  type: "UPLOAD_HASHCAST_MESSAGE_FAILURE",
  payload: data,
})

const getUploadHashcastFileURLBegin = () => ({
  type: 'GET_UPLOAD_HASHCAST_FILE_URL',
})

const getUploadHashcastFileURLSuccess = (data) => ({
  type: 'GET_UPLOAD_HASHCAST_FILE_URL_SUCCESS',
  payload: data,
})

const getUploadHashcastFileURLFailure = (data) => ({
  type: 'GET_UPLOAD_HASHCAST_FILE_URL_FAILURE',
  payload: data,
})

const uploadHashcastFileBegin = () => ({
  type: "UPLOAD_HASHCAST_FILE",
})

const uploadHashcastFileSuccess = () => ({
  type: "UPLOAD_HASHCAST_FILE_SUCCESS",
})

const uploadHashcastFileFailure = (data) => ({
  type: "UPLOAD_HASHCAST_FILE_FAILURE",
  payload: data,
})

const configureHashcastToPlasmaBegin = () => ({
  type: "HASHCAST_TO_PLASMA",
})

const configureHashcastToPlasmaSuccess = () => ({
  type: "HASHCAST_TO_PLASMA_SUCCESS",
})

const configureHashcastToPlasmaFailure = (data) => ({
  type: "HASHCAST_TO_PLASMA_FAILURE",
  payload: data,
})

const subscribeChannelBegin = () => ({
  type: 'SUBSCRIBE_CHANNEL'
})

const subscribeChannelSuccess = (data) => ({
  type: 'SUBSCRIBE_CHANNEL_SUCCESS',
  payload: data,
})

const subscribeChannelFailure = (data) => ({
  type: 'SUBSCRIBE_CHANNEL_FAILURE',
  payload: data,
})

const verifyChannelIDBegin = () => ({
  type: 'VERIFY_CHANNEL_ID',
})

const verifyChannelIDSuccess = (data) => ({
  type: 'VERIFY_CHANNEL_ID_SUCCESS',
  payload: data,
})

const verifyChannelIDFailure = (data) => ({
  type: 'VERIFY_CHANNEL_ID_FAILURE',
  payload: data,
})

const hashpullGetUrlBegin = (hashID) => ({
  type: 'HASHPULL_GET_URL',
  payload: { hashID },
})

const hashpullGetUrlSuccess = (hashID) => ({
  type: 'HASHPULL_GET_URL_SUCCESS',
  payload: { hashID },
})

const hashpullGetUrlFailure = (hashID, error) => ({
  type: 'HASHPULL_GET_URL_FAILURE',
  payload: { hashID, error },
})

const verifyHashIDBegin = () => ({
  type : 'VERIFY_HASH_ID',
})

const verifyHashIDSuccess = (data) => ({
  type : 'VERIFY_HASH_ID_SUCCESS',
  payload: data,
})

const verifyHashIDFailure = (data) => ({
  type : 'VERIFY_HASH_ID_FAILURE',
  payload: data,
})

export const updateHashcastMessageWaitingList = (data) => ({
  type: 'UPDATE_HASHCAST_MESSAGE_WAITING_LIST',
  payload: data,
})

const getHashcastMessageBegin = (hashID) => ({
  type: 'LOAD_HASHCAST_MESSAGE',
  payload: { hashID },
})

const getHashcastMessageSuccess = (hashID, hashcastMessage) => ({
  type: 'LOAD_HASHCAST_MESSAGE_SUCCESS',
  payload: { hashID, hashcastMessage },
})

const getHashcastMessageFailure = (hashID, error) => ({
  type: 'LOAD_HASHCAST_MESSAGE_FAILURE',
  payload: { hashID, error },
})

const configureHashcastToPlasma = (hashID) => async (dispatch) => {

  let recipient = networkService.account;

  const feeDetails = await networkService.getFeeAmount();
  const feeToken = feeDetails.currency;
  const feeDecimals = feeDetails.decimals;
  const feeAmount = feeDetails.amount;

  dispatch(configureHashcastToPlasmaBegin());

  const bufferAmount = new BN(3, 10);
    //get a good UTXO, as the starting point for the cascade
    //it should be able to support at least three UFOs, otherwise it's pointless, since we will just run out quickly
  const utxos = await dispatch(networkService.getUsableUtxos(
    networkService.account,
    feeToken,
    feeAmount.mul(bufferAmount),
    false,
    'UFO'
  ))
  if(utxos.length) {
    console.log("configureHashcastToPlasma: Found a good UTXO to initiate UFO cascade")
  } else {
    console.log("configureHashcastToPlasma: Sorry, could not find a good UTXO to initiate UFO cascade. You might need to merge UTXOs")
    return
  }

  const transferType = await dispatch(getTransferTypedData({
    utxos,
    recipient,
    value: networkService.amountToBN(0.00001, feeDecimals), //have to send something !== 0
    currency: feeToken,
    feeToken: feeToken,
    metadata: hashID,
  }));

  if (typeof transferType === 'undefined') {
    dispatch(configureHashcastToPlasmaFailure(404));
    dispatch(sendHashcastFailure());
    return ""
  } else {
    const { txBody, typedData } = transferType;
    const utxosPoition = utxos.reduce((acc, cur) => {acc.push(cur.utxo_pos ? cur.utxo_pos.toString() : 0); return acc}, []);
    try {
      const result = await dispatch(transfer({txBody,typedData}));
      dispatch(sendHashcastSuccess());
      dispatch(openAlert("New hashcast successfully deployed"));
      if (typeof result !== 'undefined') {
        dispatch(updateTransactionHistory({ txBody, receipt: result.receipt }));
        dispatch(configureHashcastToPlasmaSuccess());
        dispatch(sendHashcastSuccess());
        dispatch(openAlert("New hashcast successfully deployed"));
      } else {
        dispatch(releaseUTXO(utxosPoition));
        dispatch(configureHashcastToPlasmaFailure(404));
        dispatch(sendHashcastFailure());
      }
    } catch (error) {
      dispatch(releaseUTXO(utxosPoition));
      dispatch(configureHashcastToPlasmaFailure(404));
      dispatch(sendHashcastFailure());
    }
  }
}

export const uploadHashcastMessage = (message, channel, hashID) => (dispatch) => {
  dispatch(uploadHashcastMessageBegin());

  return fetch(HASHCAST_API_URL + 'cast.from.web', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message, 
      channel: channel ? channel : null, 
      hashID,
    }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(uploadHashcastMessageFailure(res.status));
      dispatch(sendHashcastFailure(res.status));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      dispatch(uploadHashcastMessageSuccess(data));
    }
    return data;
  })
}

export const sendHashcastMessage = (message, channel) => (dispatch) => {
  dispatch(sendHashcastBegin());

  const hashID = md5(JSON.stringify(message));

  dispatch(uploadHashcastMessage(message, channel, hashID)).then(data => {
    if (data !== "") {
      dispatch(configureHashcastToPlasma(hashID));
    }
  })
}

const getUploadHashcastFileURL = (channel, hashID, fileType) => (dispatch) => {
  dispatch(getUploadHashcastFileURLBegin());
  let body = {};
  if (channel) {
    body = JSON.stringify({ channel, hashID, fileType });
  } else {
    body = JSON.stringify({ hashID, fileType });
  }
  console.log(body);
  return fetch(HASHCAST_API_URL + 'cast.get.url', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(getUploadHashcastFileURLSuccess(res.status));
      dispatch(sendHashcastFailure(res.status));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      dispatch(getUploadHashcastFileURLFailure(data));
    }
    return data;
  })
}

const uploadHashcastFile = (file, url) => (dispatch) => {
  dispatch(uploadHashcastFileBegin());
  const formData = new FormData();
  formData.append("file", file);

  return fetch(url, {
    method: 'PUT',
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body: formData,
    redirect: 'follow',
  }).then(res => {
    if (res.status === 200) {
      dispatch(uploadHashcastFileSuccess());
    } else {
      dispatch(uploadHashcastFileFailure(res.status));
      dispatch(sendHashcastFailure(res.status));
    }
    return res.status
  })
}

export const sendHashcastFile = (file, channel) => (dispatch) => {
  dispatch(sendHashcastBegin());

  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    const hashID = md5(e.target.result);
    dispatch(getUploadHashcastFileURL(channel, hashID, file.type)).then(data => {
      if (data !== "") {
        dispatch(uploadHashcastFile(file, data.url)).then(statusCode => {
          if (statusCode === 200) {
            dispatch(configureHashcastToPlasma(hashID));
          }
        })
      }
    })
  };
  fileReader.readAsBinaryString(file);
}

export const hashpullGetUrl = (hashID) => (dispatch) => {
  dispatch(hashpullGetUrlBegin(hashID));

  fetch(HASHCAST_API_URL + 'pull.get.url', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hashID }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(hashpullGetUrlFailure(hashID, res.status));
      dispatch(openError("Unknown error"));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      if (data.status === "success") {
        window.open(data.url);
        dispatch(hashpullGetUrlSuccess(hashID))
      } else {
        dispatch(openError("File not found"));
        dispatch(hashpullGetUrlFailure(hashID, "File not found"));
      }
    }
  })
}

export const subscribeChannel = (channel) => (dispatch) => {
  dispatch(subscribeChannelBegin());

  fetch(HASHCAST_API_URL + 'subscribe', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(subscribeChannelFailure(res.status));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      dispatch(subscribeChannelSuccess(data));
    }
  })
}

export const verifyChannelID = (channelID) => (dispatch) => {
  dispatch(verifyChannelIDBegin());

  fetch(HASHCAST_API_URL + 'subscribe.verify', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channelID }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(verifyChannelIDFailure(res.status));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      dispatch(verifyChannelIDSuccess(data));
    }
  })
}

export const verifyHashID = (hashIDArray) => (dispatch) => {
  dispatch(verifyHashIDBegin());

  fetch(HASHCAST_API_URL + 'validateid', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hashIDArray }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      dispatch(verifyHashIDFailure(res.status));
      return ""
    }
  }).then(data => {
    if (data !== "") {
      if (data.status === "success") {
        dispatch(verifyHashIDSuccess(data.hashIDStatusObj));
      } else {
        dispatch(verifyHashIDFailure(404));
      }
    }
  })
}

export const hashPull = (hash) => {
  return fetch(HASHCAST_API_URL + 'pull', {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hash }),
  }).then(res => {
    if (res.status === 201) {
      return res.json()
    } else {
      return ""
    }
  }).then(data => {
    return data;
  })
}

export const findHashcaseWaitingList = (
  verifiedHashID, 
  hashcastMessageLoad, 
  hashcastMessageWaitingList
) => (dispatch) => {
  const hashcastMessageWaitingListTemp = [...hashcastMessageWaitingList];
  
  for (let eachHashIDObj of verifiedHashID) {
    const eachHashID = eachHashIDObj.hashID;

    const filteredHashcastMessageWaitingList = hashcastMessageWaitingList.filter(
      element => element.hahsID === eachHashID
    )
    
    if (typeof hashcastMessageLoad[eachHashID] === 'undefined' && 
      filteredHashcastMessageWaitingList.length === 0) {
        hashcastMessageWaitingListTemp.push({ hashID: eachHashID });
    }
  }
  console.log({ findHashcaseWaitingList: hashcastMessageWaitingListTemp })
  dispatch(updateHashcastMessageWaitingList(hashcastMessageWaitingListTemp));
  return hashcastMessageWaitingListTemp
}

export const getHashcastMessage = (hashID, hashcastMessageWaitingList) => async (dispatch) => {
  dispatch(getHashcastMessageBegin(hashID));
  const hashcastMessage = await hashPull(hashID);

  const hashcastMessageWaitingListTemp = hashcastMessageWaitingList.filter(i => i.hashID !== hashID);
  dispatch(updateHashcastMessageWaitingList(hashcastMessageWaitingListTemp));

  if (hashcastMessage !== "") {
    if (hashcastMessage.status === 'success') {
      dispatch(getHashcastMessageSuccess(hashID, hashcastMessage.ciphertext));
    } else {
      dispatch(getHashcastMessageFailure(hashID, 404));
    }
  } else {
    dispatch(getHashcastMessageFailure(hashID, 404));
  }
}