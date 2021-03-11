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

import React from 'react';
import truncate from 'truncate-middle';

import Copy from 'components/copy/Copy';
import Button from 'components/button/Button';
import networkService from 'services/networkService';
import * as styles from './Account.module.scss';

function sendBatch () {

    console.log("sending bulk transaction")

    networkService.circularWriteBatch([
      'amojJ4NOhcWg0NXqBZRe',
      'tlyFKN9plmO0iQWWLpf6',
      '8K2HWEIEJfbHPaJENTHu',
      'C7eYgKGnqInsBkrv7vKp',
      'p10vOTjPU0AHUnIGsRoV',
      'gcKCQlJCyTvUWvRzbPKX',
      '4AVFXVIyhzFSZU0M2oR6',
      'amojJ4NOhcWg0NXqBZRe',
      'tlyFKN9plmO0iQWWLpf6',
      '8K2HWEIEJfbHPaJENTHu',
      'C7eYgKGnqInsBkrv7vKp',
      'p10vOTjPU0AHUnIGsRoV',
      'gcKCQlJCyTvUWvRzbPKX',
      '4AVFXVIyhzFSZU0M2oR6',
      'amojJ4NOhcWg0NXqBZRe',
      'tlyFKN9plmO0iQWWLpf6',
      '8K2HWEIEJfbHPaJENTHu',
      'C7eYgKGnqInsBkrv7vKp',
      'p10vOTjPU0AHUnIGsRoV',
      'gcKCQlJCyTvUWvRzbPKX',
      '4AVFXVIyhzFSZU0M2oR6',
    ])

  }

function Account () {

  const wAddress = networkService.account ? truncate(networkService.account, 6, 4, '...') : '';

  return (
    <div className={styles.Account}>

      <div className={styles.wallet}>
        <span className={styles.address}>{`Wallet Address : ${wAddress}`}</span>
        <Copy value={networkService.account} />
      </div>

      <div style={{width: 300, background: 'yellow', margin: 20, padding: 30}}>
        <span>EXPERIMENTAL AREA</span>
        <Button
          onClick={()=>sendBatch()}
          type='primary'
          size='tiny' 
        >
          BATCH FLUSH
        </Button>
      </div>

    </div>
  );

}

export default React.memo(Account);

