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

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import WrongNetworkModal from 'containers/modals/wrongnetwork/WrongNetworkModal';
import networkService from 'services/networkService';

import { selectModalState } from 'selectors/uiSelector';

import { 
  selectWalletMethod, 
  selectNetwork, 
  selectNetworkShort, 
  selectNetworkWURL,
  selectPlasmaAddress, 
} from 'selectors/setupSelector';

import { openModal } from 'actions/uiAction';
import { setWalletMethod, setNetwork } from 'actions/setupAction';
import { getAllNetworks } from 'util/networkName';

import logo from 'images/omg_labs.svg';
import chevron from 'images/chevron.svg';
import browserwallet from 'images/browserwallet.png';
import * as styles from './WalletPicker.module.scss';

function WalletPicker ({ onEnable }) {

  const dispatch = useDispatch();
  const dropdownNode = useRef(null);

  const [ walletEnabled, setWalletEnabled ] = useState(false);
  const [ accountsEnabled, setAccountsEnabled ] = useState(false);
  const [ wrongNetwork, setWrongNetwork ] = useState(false);
  const [ showAllNetworks, setShowAllNetworks ] = useState(false);

  const walletMethod = useSelector(selectWalletMethod());

  const networkName = useSelector(selectNetwork());
  const networkNameShort = useSelector(selectNetworkShort());
  const watcherURL = useSelector(selectNetworkWURL());
  const plasmaAddress = useSelector(selectPlasmaAddress());

  const wrongNetworkModalState = useSelector(selectModalState('wrongNetworkModal'));

  const dispatchSetWalletMethod = useCallback((methodName) => {
    dispatch(setWalletMethod(methodName));
  }, [ dispatch ]);

  const dispatchSetNetwork = useCallback((network) => {
    setShowAllNetworks(false);
    dispatch(setNetwork(network));
  }, [ dispatch ]);

  useEffect(() => {

    async function enableBrowserWallet () {

      const selectedNetwork = networkName ? networkName: "Mainnet";
    
      const walletEnabled = await networkService.enableBrowserWallet(selectedNetwork);
      
      return walletEnabled
        ? setWalletEnabled(true)
        : dispatchSetWalletMethod(null);
    }

    if (walletMethod === 'browser') {
      enableBrowserWallet();
    }

  }, [ dispatchSetWalletMethod, walletMethod, networkName ]);

  useEffect(() => {

    async function initializeAccounts () {

      const initialized = await networkService.initializeAccounts( 
        networkNameShort, 
        watcherURL,
        plasmaAddress
      );

      if (!initialized) {
        return setAccountsEnabled(false);
      }

      if (initialized === 'wrongnetwork') {
        setAccountsEnabled(false);
        return setWrongNetwork(true);
      }
      
      if (initialized === 'enabled') {
        return setAccountsEnabled(true);
      }

    }
    if (walletEnabled) {
      initializeAccounts();
    }
  }, [ walletEnabled, networkNameShort, watcherURL, plasmaAddress ]);

  useEffect(() => {
    if (accountsEnabled) {
      onEnable(true);
    }
  }, [ onEnable, accountsEnabled ]);

  useEffect(() => {
    if (walletEnabled && wrongNetwork) {
      dispatch(openModal('wrongNetworkModal'));
    }
  }, [ dispatch, walletEnabled, wrongNetwork ]);

  function resetSelection () {
    dispatchSetWalletMethod(null);
    setWalletEnabled(false);
    setAccountsEnabled(false);
  }

  const browserEnabled = !!window.ethereum;

  // defines the set of possible networks
  const allNetworks = getAllNetworks();

  // pick the first one as the startup default
  useEffect(() => {
    if ( watcherURL === '' ) {
        dispatch(setNetwork({network: allNetworks[0]}));
    }
  }, [ dispatch, watcherURL, allNetworks, networkName ]);

  return (
    <>

      <WrongNetworkModal
        open={wrongNetworkModalState}
        onClose={resetSelection}
      />

      <div className={styles.WalletPicker}>
        <div className={styles.title}>
          <img src={logo} alt='logo' />
          <div className={styles.menu}>

            <div
              onClick={()=>setShowAllNetworks(prev => !prev)}
              className={styles.network}
            >
              <div className={styles.indicator} />
              <div>
                OMG Network:&nbsp;
                {networkName}
              </div>
              {!!allNetworks.length && (
                <img
                  src={chevron}
                  alt='chevron'
                  className={[
                    styles.chevron,
                    showAllNetworks ? styles.open : ''
                  ].join(' ')}
                />
              )}
            </div>

            <div 
              ref={dropdownNode} 
              className={styles.dropdown}
            >
              {!!allNetworks.length && showAllNetworks && allNetworks.map((network, index) => (
                <div
                  style={{background: '#2A308E', color: 'white', marginTop: 5, padding: 5, borderRadius: 3}}
                  key={index}
                  onClick={()=>dispatchSetNetwork({network})}
                >
                  {network.name}
                </div>))
              }
            </div>

          </div>
        </div>

        <div className={styles.directive}>
          
          <div className={styles.Title}>
            <br/>
            <br/>Welcome, explorer, to Hashcast, a simple messaging layer for Plasma. Athough Hashcast is 
            primarily designed to facilitatite inter-chain and cross-chain coordination, we are releasing 
            this simple frontend to make it easy to explore and use the system.
            <br/>
            <br/>
          </div>

          <div className={styles.Note}>
            <span className={styles.B}>Where are you?</span> You are currently on 
            {' '}<span className={styles.B}>{networkName}</span>.
          </div>

          <div className={styles.Note}>
            <span className={styles.B}>Requirements</span>. Only Chrome/Metamask is tested 
            for now. You will need Chrome, Metamask, and some OMG on Plasma.
          </div>

          <div className={styles.Note}>
            <span className={styles.B}>Known incompatibilites</span>. Brave does not fully support Metamask, 
            so if you use Brave, assorted and sundry functionality will fail. And, as always, keep your 
            passwords and keys safe, and double check ERC20 contract and wallet addresses before you swap.
            <br/>
            <br/>
            <br/>
            <br/>
          </div>

        </div>

        <div className={styles.wallets}>
          <div
            className={[
              styles.wallet,
              !browserEnabled ? styles.disabled : ''
            ].join(' ')}
            onClick={()=>dispatchSetWalletMethod('browser')}
          >
            <img src={browserwallet} alt='browserwallet' />
            <h3>Metamask</h3>
            {browserEnabled && (
              <div>
              </div>
            )}
            {!browserEnabled && (
              <div>Your browser does not have a web3 provider.</div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default React.memo(WalletPicker);