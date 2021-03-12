/*
  Utility functions fo OMG Plasma Users 
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

import { orderBy, uniq } from 'lodash';

export const findHashcasts = (transaction, activeHashID) => {

  const orderedTransactions = orderBy(transaction, i => i.block.timestamp, 'desc');
  const hashcasts = [];

  activeHashID.forEach(element => {
    const hashID = element.hashID;
    const filterTransactions = orderedTransactions.filter(i => i.metadata === hashID);
    
    if (filterTransactions.length) {
      let hcID = 'pending';
      let time = Date.now();
      let blockNum = null;
  
      if(typeof filterTransactions[0].block !== 'undefined') {
        if (typeof filterTransactions[0].block.hash !== 'undefined')
          hcID = filterTransactions[0].block.hash;
        if (typeof filterTransactions[0].block.timestamp !== 'undefined')
          time = filterTransactions[0].block.timestamp;
        if (typeof filterTransactions[0].block.blknum !== 'undefined')
          blockNum = filterTransactions[0].block.blknum;
      }
  
      hashcasts.push({
        msg: hashID,
        hcID,
        time,
        blockNum,
        tag: element.tag,
      });
    }

  })

  return hashcasts;
}

export const transactionsSlice = (page, PER_PAGE, transaction) => {
  const startingIndex = page === 1 ? 0 : ((page - 1) * PER_PAGE);
  const endingIndex = page * PER_PAGE;
  const paginatedTransactions = transaction.slice(startingIndex, endingIndex);
  return paginatedTransactions;
}

export const bidsSlice = (page, PER_PAGE, bids) => {
  const startingIndex = page === 1 ? 0 : ((page - 1) * PER_PAGE);
  const result = Object.values(bids);
  let endingIndex = page * PER_PAGE;
  if(result.length < endingIndex) endingIndex = result.length;
  return result.slice(startingIndex, endingIndex);
}

export const hashSlice = (page, PER_PAGE, hashcasts) => {
  const startingIndex = page === 1 ? 0 : ((page - 1) * PER_PAGE);
  const result = Object.values(hashcasts);
  let endingIndex = page * PER_PAGE;
  if(result.length < endingIndex) endingIndex = result.length;
  return result.slice(startingIndex, endingIndex);
}

export const parseVarna = (transaction) => {

  const orderedTransactions = orderBy(transaction, i => i.block.timestamp, 'desc');

  const IDList = [];
  const swapMetaRaw = [];
  const hashcastMeta = [];
  let isBeginner = true;

  orderedTransactions.forEach(element => {
    if (element.metadata.length === 32) {
      IDList.push(element.metadata);
      if(isBeginner) isBeginner = false; //this trips once, and then the beginner state is set
    }
    if (element.metadata.length === 32 && element.metadata.includes('-SWAP-')) {
      swapMetaRaw.push(element.metadata);
    }
    if (typeof element.metadata !== 'undefined' &&
      element.metadata !== '' &&
      element.metadata !== 'Merge UTXOs' &&
      element.metadata !== 'atomic swap' &&
      !element.metadata.includes('--') &&
      !element.metadata.includes('-SWAP-') &&
      !element.metadata.includes('<->')) {
      hashcastMeta.push(element.metadata);
    }
  });

  return { 
    IDList, 
    orderedTransactions,
    swapMetaRaw,
    hashcastMeta: uniq(hashcastMeta),
    isBeginner,
  };
}