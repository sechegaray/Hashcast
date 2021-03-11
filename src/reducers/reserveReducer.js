/*
  Varna - A Privacy-Preserving Marketplace
  Varna uses Fully Homomorphic Encryption to make markets fair. 
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

import { remove } from 'lodash';

let reservedUTXOsCache = localStorage.getItem("reservedUTXOs");

if (reservedUTXOsCache) {
  reservedUTXOsCache = JSON.parse(reservedUTXOsCache);
  reservedUTXOsCache = reservedUTXOsCache.filter(i => i.expire_timestamp > new Date().getTime());
  localStorage.setItem("reservedUTXOs", JSON.stringify(reservedUTXOsCache));
}

const initialState = {
  reservedUTXOs: reservedUTXOsCache ? reservedUTXOsCache : [],
  transactionHistory: { receipt: null, txBody: null },
};

function reserveReducer (state = initialState, action) {
  switch (action.type) {
    case 'ADD_UTXO':
      var reservedUTXOs = [ 
        ...state.reservedUTXOs, 
        action.payload
      ]
      localStorage.setItem("reservedUTXOs", JSON.stringify(reservedUTXOs));
      return { 
        ...state, 
        reservedUTXOs,
      };
    case 'UPDATE_RESERVED_UTXOS':
      localStorage.setItem("reservedUTXOs", JSON.stringify(action.payload));
      return {
        ...state,
        reservedUTXOs: action.payload,
      }
    case 'RELEASE_UTXO':
      reservedUTXOs = [ 
         ...state.reservedUTXOs
      ]
      reservedUTXOs = remove(reservedUTXOs, function(i) { return action.payload.includes(i.utxo_position) });
      localStorage.setItem("reservedUTXOs", JSON.stringify(reservedUTXOs));
      return {
        ...state,
        reservedUTXOs,
      }
    case 'UPDATE_TRANSACTION_HISTORY':
      return {
        ...state,
        transactionHistory: { 
          receipt: action.payload.receipt, 
          txBody: action.payload.txBody,
        }
      }
    default:
      return state;
  }
}

export default reserveReducer;
