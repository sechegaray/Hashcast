/*
Copyright 2019-present OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import React, { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import truncate from 'truncate-middle';
import { Send, MergeType } from '@material-ui/icons';

import { selectLoading } from 'selectors/loadingSelector';
import { selectIsSynced } from 'selectors/statusSelector';
import { selectChildchainBalance, selectRootchainBalance } from 'selectors/balanceSelector';
import { selectPendingExits } from 'selectors/exitSelector';
import { selectChildchainTransactions } from 'selectors/transactionSelector';

import { openModal } from 'actions/uiAction';

import Copy from 'components/copy/Copy';
import Button from 'components/button/Button';
import { logAmount } from 'util/amountConvert';

import networkService from 'services/networkService';

import bunny_happy from 'images/bunny_happy.svg';
import bunny_sad from 'images/bunny_sad.svg';

import * as styles from './Account.module.scss';

function Account () {

  const dispatch = useDispatch();
  const isSynced = useSelector(selectIsSynced);
  const childBalance = useSelector(selectChildchainBalance, isEqual);
  const rootBalance = useSelector(selectRootchainBalance, isEqual);
  const pendingExits = useSelector(selectPendingExits, isEqual);
  const transactions = useSelector(selectChildchainTransactions, isEqual);
  const criticalTransactionLoading = useSelector(selectLoading([ 'EXIT/CREATE' ]));
  
  const exitPending = useMemo(() => 
    pendingExits.some(i => i.status === 'Pending'), 
    [ pendingExits ]
  );

  const transferPending = useMemo(() => 
    transactions.some(i => i.status === 'Pending'), 
    [ transactions ]
  );

  const disabled = !childBalance.length || !isSynced || exitPending || transferPending;

  const handleModalClick = useCallback(
    (name, beginner = false) => dispatch(openModal(name, beginner)),
    [ dispatch ]
  );

  let balances = {
    OMG : {have: false, amount: 0, amountShort: '0'},
    ETH : {have: false, amount: 0, amountShort: '0'}
  }

  childBalance.reduce((acc, cur) => {
    if(cur.symbol === 'OMG' && cur.amount > 0 ) {
      acc['OMG']['have'] = true;
      acc['OMG']['amount'] = cur.amount;
      acc['OMG']['amountShort'] = logAmount(cur.amount, cur.decimals, 2);
    } else if (cur.symbol === 'ETH' && cur.amount > 0 ) {
      acc['ETH']['have'] = true;
      acc['ETH']['amount'] = cur.amount;
      acc['ETH']['amountShort'] = logAmount(cur.amount, cur.decimals, 2);
    }
    return acc;
  }, balances)

  const wAddress = networkService.account ? truncate(networkService.account, 6, 4, '...') : '';

  return (
    <div className={styles.Account}>

      <div className={styles.wallet}>
        <span className={styles.address}>{`Wallet Address: ${wAddress}`}</span>
        <Copy value={networkService.account} />
      </div>

      {balances['OMG']['have'] &&
        <h3 style={{marginBottom: '30px'}}>Status: Ready to use OMG Plasma</h3> 
      }
      {!balances['OMG']['have'] &&
        <h3 style={{marginBottom: '30px'}}>Status: Bunny Cry. You do not have any OMG on the Child Chain</h3> 
      }

      {balances['OMG']['have'] &&
        <div className={styles.RabbitBox}>
          <img className={styles.bunny} src={bunny_happy} alt='Happy Bunny' />
          <div className={styles.RabbitRight}>
            <div
              className={styles.RabbitRightTop}
            >
              Child Chain<br/>Balance
            </div>
            <div 
              className={styles.RabbitRightMiddle.sad}
              style={{color: '#0ebf9a', fontSize: '4em'}}
            >
              <span>
              {balances['OMG']['amountShort']}
              </span>
            </div>
            <div className={styles.RabbitRightBottom}>
              OMG
            </div>
          </div>
        </div>
      }

      {!balances['OMG']['have'] &&
        <div className={styles.RabbitBox}>
          <img className={styles.bunny} src={bunny_sad} alt='Sad Bunny' />
          <div className={styles.RabbitRight}>
            <div
              className={styles.RabbitRightTop}
            >
              Child Chain<br/>OMG Balance
            </div>
            <div className={styles.RabbitRightMiddle}>
              <span className={styles.sad}>
                0
              </span>
            </div>
            <div className={styles.RabbitRightBottom}>
              <Button
                onClick={()=>handleModalClick('depositModal', true)}
                type='primary'
                disabled={!isSynced}
                style={{fontFamily: 'MessinaMonoSemiBold', fontSize: '1.4em', padding: 10}}
              >
                DEPOSIT OMG
              </Button>
            </div>
          </div>
        </div>
      }

      <div className={styles.balances} style={{marginTop: 30}}>

        <div className={styles.box}>
          <div className={styles.header}>
            <div className={styles.title}>
              <span>Balance on Childchain</span>
              <span>OMG Network</span>
            </div>
            <div className={styles.actions}>
              <div
                onClick={()=>handleModalClick('depositModal')}
                className={[styles.transfer, !isSynced ? styles.disabled : ''].join(' ')}
              >
                <Send />
                <span>Deposit</span>
              </div>
              <div
                onClick={() => handleModalClick('exitModal')}
                className={[styles.transfer, disabled ? styles.disabled : ''].join(' ')}
              >
                <MergeType />
                <span>Exit</span>
              </div>
            </div>
          </div>
          {childBalance.map((i, index) => {
            return (
              <div key={index} className={styles.row}>
                <div className={styles.token}>
                  <span className={styles.symbol}>{i.symbol}</span>
                </div>
                <span>{logAmount(i.amount, i.decimals, 4)}</span>
              </div>
            );
          })}
          <div className={styles.buttons}>
            <Button
              onClick={() => handleModalClick('transferModal')}
              type='primary'
              disabled={disabled || criticalTransactionLoading}
            >
              TRANSFER
            </Button>
            <Button
              onClick={() => handleModalClick('mergeModal')}
              type='secondary'
              disabled={disabled || criticalTransactionLoading}
            >
              MERGE
            </Button>
          </div>
        </div>

        <div className={styles.box}>
          <div className={styles.header}>
            <div className={styles.title}>
              <span>Balance on Rootchain</span>
              <span>Ethereum Network</span>
            </div>
          </div>

          {rootBalance.map((i, index) => {
            return (
              <div key={index} className={styles.row}>
                <div className={styles.token}>
                  <span className={styles.symbol}>{i.symbol}</span>
                </div>
                <span>{logAmount(i.amount, i.decimals, 4)}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );

}

export default React.memo(Account);
