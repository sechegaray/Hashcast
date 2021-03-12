/*
  Hashcast - A messaging layer for OMG Plasma
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

const initialState = {
  sendHashcastLoad: false,
  sendHashcastError: null,

  uploadHashcastMessageLoad: false,
  uploadHashcastMessageError: null,

  UploadHashCastFileURL: null,
  getUploadHashCastFileURLLoad: false,
  getUploadHashCastFileURLError: null,

  uploadHashcastFileLoad: false,
  uploadHashcastFileError: null,

  hashpullGetUrlLoad: {},
  hashpullGetUrlError: {},

  configureHashcastToPlasmaLoad: false,
  configureHashcastToPlasmaError: null,

  subscribedChannelURL: null,
  subscribeChannelLoad: false,
  subscribeChannelError: null,

  channelSummary: {},
  verifyChannelIDLoad: false,
  verifyChannelError: null,

  verifiedHashID: [],
  verifyHashIDLoad: false,
  verifyHashIDError: null,
  verifyHashIDLoadIndicator: null,

  currentHashcasetMessageHashID: null,

  hashcastMessage: {},
  hashcastMessageLoad: {},
  hashcastMessageError: {},

  hashcastMessageWaitingList: [],

  currentchannelMessageHashID: null,

  channelMessage: {},
  channelMessageLoad: {},
  channelMessageError: {},

  channelMessageWaitingList: [],
};

function hashCastReducer (state = initialState, action) {
  switch(action.type) {
    case 'SEND_HASHCAST':
      return {
        ...state,
        sendHashcastLoad: true,
        sendHashcastError: null,
      }
    case 'SEND_HASHCAST_SUCCESS': 
      return {
        ...state,
        sendHashcastLoad: false,
        sendHashcastError: false,
      }
    case 'SEND_HASHCAST_FAILURE': 
      return {
        ...state,
        sendHashcastLoad: false,
        sendHashcastError: action.payload,
      }
    case 'UPLOAD_HASHCAST_MESSAGE':
      return {
        ...state,
        uploadHashcastMessageLoad: true,
        uploadHashcastMessageError: null,
      }
    case 'UPLOAD_HASHCAST_MESSAGE_SUCCESS':
      return {
        ...state,
        uploadHashcastMessageLoad: false,
        uploadHashcastMessageError: false,
      }
    case 'UPLOAD_HASHCAST_MESSAGE_FAILURE':
      return {
        ...state,
        uploadHashcastMessageLoad: false,
        uploadHashcastMessageError: action.payload,
      }
    case 'GET_UPLOAD_HASHCAST_FILE_URL':
      return {
        ...state,
        UploadHashCastFileURL: null,
        getUploadHashCastFileURLLoad: true,
        getUploadHashCastFileURLError: null,
      }
    case 'GET_UPLOAD_HASHCAST_FILE_URL_SUCCESS':
      return {
        ...state,
        UploadHashCastFileURL: action.payload,
        getUploadHashCastFileURLLoad: false,
        getUploadHashCastFileURLError: false,
      }
    case 'GET_UPLOAD_HASHCAST_FILE_URL_FAILURE':
      return {
        ...state,
        UploadHashCastFileURL: null,
        getUploadHashCastFileURLLoad: false,
        getUploadHashCastFileURLError: action.payload,
      }
    case 'UPLOAD_HASHCAST_FILE':
      return {
        ...state,
        uploadHashcastFileLoad: true,
        uploadHashcastFileError: null,
      }
    case 'UPLOAD_HASHCAST_FILE_SUCCESS':
      return {
        ...state,
        uploadHashcastFileLoad: false,
        uploadHashcastFileError: false,
      }
    case 'UPLOAD_HASHCAST_FILE_FAILURE':
      return {
        ...state,
        uploadHashcastFileLoad: false,
        uploadHashcastFileError: action.payload,
      }
    case 'HASHCAST_TO_PLASMA':
      return {
        ...state,
        configureHashcastToPlasmaLoad: true,
        configureHashcastToPlasmaError: null,
      }
    case 'HASHCAST_TO_PLASMA_SUCCESS':
      return {
        ...state,
        configureHashcastToPlasmaLoad: false,
        configureHashcastToPlasmaError: false,
      }   
    case 'HASHCAST_TO_PLASMA_FAILURE':
      return {
        ...state,
        configureHashcastToPlasmaLoad: false,
        configureHashcastToPlasmaError: action.payload,
      }
    case 'SUBSCRIBE_CHANNEL':
      return {
        ...state,
        subscribedChannelURL: null,
        subscribeChannelLoad: true,
        subscribeChannelError: null,
      }
    case 'SUBSCRIBE_CHANNEL_SUCCESS':
      return {
        ...state,
        subscribedChannelURL: action.payload,
        subscribeChannelLoad: false,
        subscribeChannelError: false,
      }
    case 'SUBSCRIBE_CHANNEL_FAILURE':
      return {
        ...state,
        subscribedChannelURL: null,
        subscribeChannelLoad: false,
        subscribeChannelError: action.payload,
      }
    case 'HASHPULL_GET_URL':
      return {
        ...state,
        hashpullGetUrlLoad: {
          ...state.hashpullGetUrlLoad,
          [action.payload.hashID]: true
        },
        hashpullGetUrlError: {
          ...state.hashpullGetUrlError,
          [action.payload.hashID]: null
        },
      }
    case 'HASHPULL_GET_URL_SUCCESS':
      return {
        ...state,
        hashpullGetUrlLoad: {
          ...state.hashpullGetUrlLoad,
          [action.payload.hashID]: false
        },
        hashpullGetUrlError: {
          ...state.hashpullGetUrlError,
          [action.payload.hashID]: false
        },
      }
    case 'HASHPULL_GET_URL_FAILURE':
      return {
        ...state,
        hashpullGetUrlLoad: {
          ...state.hashpullGetUrlLoad,
          [action.payload.hashID]: false
        },
        hashpullGetUrlError: {
          ...state.hashpullGetUrlError,
          [action.payload.hashID]: action.payload.error,
        },
      }
    case 'VERIFY_CHANNEL_ID':
      return {
        ...state,
        verifyChannelIDLoad: state.verifyChannelIDLoad === false ? false : true,
        verifyChannelError: state.verifyChannelError === false ? false : null,
      }
    case 'VERIFY_CHANNEL_ID_SUCCESS':
      return {
        ...state,
        channelSummary: action.payload,
        verifyChannelIDLoad: false,
        verifyChannelError: false,
      }
    case 'VERIFY_CHANNEL_ID_FAILURE':
      return {
        ...state,
        verifyChannelIDLoad: false,
        verifyChannelError: action.payload,
      }
    case 'VERIFY_HASH_ID':

      let verifyHashIDLoadIndicator = state.verifyHashIDLoadIndicator;
      if (state.verifyHashIDLoadIndicator === null) {
        verifyHashIDLoadIndicator = true;
      }

      return {
        ...state,
        verifyHashIDLoad: true,
        verifyHashIDError: null,
        verifyHashIDLoadIndicator,
      }
    case 'VERIFY_HASH_ID_SUCCESS': 
      return  {
        ...state,
        verifiedHashID: action.payload,
        verifyHashIDLoad: false,
        verifyHashIDError: false,
        verifyHashIDLoadIndicator: false,
      }
    case 'VERIFY_HASH_ID_FAILURE': 
      return  {
        ...state,
        verifyHashIDLoad: false,
        verifyHashIDError: action.payload,
        verifyHashIDLoadIndicator: false,
      }
    case 'LOAD_HASHCAST_MESSAGE': 
      return {
        ...state,
        currentHashcasetMessageHashID: action.payload.hashID,
        hashcastMessageLoad: {
          ...state.hashcastMessageLoad,
          [action.payload.hashID]: true,
        },
        hashcastMessageError: {
          ...state.hashcastMessageError,
          [action.payload.hashID]: null,
        },
      }
    case 'LOAD_HASHCAST_MESSAGE_SUCCESS': 
      return {
        ...state,
        hashcastMessage: {
          ...state.hashcastMessage,
          [action.payload.hashID]: action.payload.hashcastMessage,
        },
        hashcastMessageLoad: {
          ...state.hashcastMessageLoad,
          [action.payload.hashID]: false,
        },
        hashcastMessageError: {
          ...state.hashcastMessageError,
          [action.payload.hashID]: false,
        },
      }
    case 'LOAD_HASHCAST_MESSAGE_FAILURE': 
      return {
        ...state,
        hashcastMessageLoad: {
          ...state.hashcastMessageLoad,
          [action.payload.hashID]: false,
        },
        hashcastMessageError: {
          ...state.hashcastMessageError,
          [action.payload.hashID]: action.payload.error,
        },
      }
    case 'UPDATE_HASHCAST_MESSAGE_WAITING_LIST':
      return {
        ...state,
        hashcastMessageWaitingList: action.payload,
      }
      case 'LOAD_CHANNEL_MESSAGE': 
      return {
        ...state,
        currentchannelMessageHashID: action.payload.hashID,
        channelMessageLoad: {
          ...state.channelMessageLoad,
          [action.payload.hashID]: true,
        },
        channelMessageError: {
          ...state.channelMessageError,
          [action.payload.hashID]: null,
        },
      }
    case 'LOAD_CHANNEL_MESSAGE_SUCCESS': 
      return {
        ...state,
        channelMessage: {
          ...state.channelMessage,
          [action.payload.hashID]: action.payload.channelMessage,
        },
        channelMessageLoad: {
          ...state.channelMessageLoad,
          [action.payload.hashID]: false,
        },
        channelMessageError: {
          ...state.channelMessageError,
          [action.payload.hashID]: false,
        },
      }
    case 'LOAD_CHANNEL_MESSAGE_FAILURE': 
      return {
        ...state,
        channelMessageLoad: {
          ...state.channelMessageLoad,
          [action.payload.hashID]: false,
        },
        channelMessageError: {
          ...state.channelMessageError,
          [action.payload.hashID]: action.payload.error,
        },
      }
    case 'UPDATE_CHANNEL_MESSAGE_WAITING_LIST':
      return {
        ...state,
        channelMessageWaitingList: action.payload,
      }
    default:
      return state;
  }
}

export default hashCastReducer;