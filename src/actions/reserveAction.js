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

/**
 * Update the reserved utxos
 * state.reservedUTXOs will be overwritten by this
 * @param {Array} utxos 
 */
export const updateReservedUTXOs = (reservedUTXOs) => ({
  type: 'UPDATE_RESERVED_UTXOS',
  payload: reservedUTXOs,
});

/**
 * Insert utxo into state.reservedUTXOs  
 * @param {Object} utxo 
 *
 * {
 *  currency: utxo.currency,
 *  amount: utxo.amount.toString(),
 *  utxo_position: utxo.utxo_pos.toString(),
 *  insert_timestamp: new Date().getTime(),
 *  expire_timestamp: new Date().getTime() + duration,
 *  usage,
 * }
 */
export const reserveUTXO = (utxo) => ({
  type: 'ADD_UTXO',
  payload: utxo,
});

/**
 * Release one or more UTXOs
 * @param {Array} utxoPositionArray 
 */
export const releaseUTXO = (utxoPositionArray) => ({
  type: 'RELEASE_UTXO',
  payload: utxoPositionArray,
})

/**
 * transfer utxo to the following data structure
 * @param {Object} utxo 
 * @param {Int} duration 
 * @param {Object} usage 
 * 
 * {
 *   currency: 
 *   amount: 
 *   utxo_position: 
 *   insert_timstamp:
 *   expire_timestamp: 
 *   usage: 
 * }
 */
const expiryTime = 10 * 60 * 1000; //default expiry time is 10 minutes
export const buildUTXOPayload = (utxo, usage, duration = expiryTime, data={}) => {
  return {
    currency: utxo.currency,
    amount: utxo.amount.toString(),
    utxo_position: utxo.utxo_pos.toString(),
    insert_timestamp: new Date().getTime(),
    expire_timestamp: new Date().getTime() + duration,
    usage,
    data,
  }
}

/**
 * update the transaction history
 * @param {Object} data 
 * {receipt: RECEIPT, txBody: TXBODY}
 */
export const updateTransactionHistory = (data) => ({
  type: 'UPDATE_TRANSACTION_HISTORY',
  payload: data,
})