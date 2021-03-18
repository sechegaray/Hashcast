/* eslint-disable quotes */
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

import { ChildChain, RootChain, OmgUtil } from '@omisego/omg-js';

import '@metamask/legacy-web3'

import { orderBy, flatten, uniq, get, pickBy, keyBy } from 'lodash';
import BN from 'bn.js';
import axios from 'axios';
import JSONBigNumber from 'omg-json-bigint';
import { bufferToHex } from 'ethereumjs-util';
import erc20abi from 'human-standard-token-abi';
import BigNumber from "bignumber.js";

import Web3 from 'web3';
import store from 'store';
import { getToken } from 'actions/tokenAction';
import { WebWalletError } from 'services/errorService';
import { updateReservedUTXOs, buildUTXOPayload, reserveUTXO } from 'actions/reserveAction';

import config from 'util/config';

const ethUtil = require('ethereumjs-util');
const sigUtil = require('eth-sig-util');

class NetworkService {

  constructor () {
    this.web3 = null;
    this.provider = null;
    this.rootChain = null;
    this.childChain = null;
    this.OmgUtil = OmgUtil;
    this.plasmaContractAddress = null;
    this.environment = null;
  }

  makeWeb3 (provider) {
    return new Web3(
      provider,
      null,
      { transactionConfirmationBlocks: 1 }
    );
  }

  async enableBrowserWallet (selectedNetwork) {
    try {

      if (window.ethereum) {
        this.provider = window.ethereum;
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        return false;
      }

      this.web3 = this.makeWeb3(this.provider);
      this.environment = selectedNetwork;

      this.bindProviderListeners('browserwallet');
      return true;
    } catch (error) {
      return false;
    }
  }

  handleAccountsChanged (accounts) {
    const providerRegisteredAccount = accounts ? accounts[0] : null;
    const appRegisteredAcount = networkService.account;
    if (!providerRegisteredAccount || !appRegisteredAcount) {
      return;
    }
    if (appRegisteredAcount !== providerRegisteredAccount) {
      try {
        window.location.reload();
      } catch (error) {
        //
      }
    }
  }

  bindProviderListeners (walletProvider) {
    if (walletProvider === 'browserwallet' && window.ethereum) {
      try {
        window.ethereum.on('accountsChanged', (accounts) => {
          this.handleAccountsChanged(accounts);
        });
        window.ethereum.on('chainChanged', function () {
          window.location.reload();
        });
      } catch (err) {
        console.log('Web3 event handling not available');
      }
    }
  }

  async initializeAccounts ( 
    networkNameShort, 
    watcherURL,
    plasmaAddress,
  ) {

    try {

      this.plasmaContractAddress = plasmaAddress;

      //fire up the chains
      this.childChain = new ChildChain({ watcherUrl: watcherURL, plasmaContractAddress: this.plasmaContractAddress });
      this.rootChain = new RootChain({ web3: this.web3, plasmaContractAddress: this.plasmaContractAddress });
      
      const accounts = await this.web3.eth.getAccounts();
      //const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      //pick the first one, whichever that one is
      this.account = accounts[0];

      const networkMetaMask = await this.web3.eth.net.getNetworkType();
      //const network = await window.ethereum.request({ method: 'eth_chainId' });

      const isCorrectNetwork = networkMetaMask === networkNameShort;
      return isCorrectNetwork ? 'enabled' : 'wrongnetwork';
    } catch (error) {
      return false;
    }
  }

  async checkStatus () {
    
    try {
      const { byzantine_events, 
        last_seen_eth_block_timestamp, 
        last_seen_eth_block_number, 
        services_synced_heights 
      } = await this.childChain.status();

      const filteredByzantineEvents = byzantine_events
        .filter(i => {
          if (
            i.event === 'unchallenged_exit' ||
            i.event === 'invalid_block' ||
            i.event === 'block_withholding'
          ) {
            return true;
          }
          return false;
        });

      const blockGetterHeight = services_synced_heights.find(i => i.service === 'block_getter' ).height;
      const watcherSynced = last_seen_eth_block_number - blockGetterHeight <= config.checkSyncInterval;

      return {
        connection: !!byzantine_events,
        byzantine: !!filteredByzantineEvents.length,
        watcherSynced: watcherSynced,
        lastSeenBlock: last_seen_eth_block_timestamp
      };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  async getAllTransactions () {
    try {
      const rawTransactions = await this.childChain.getTransactions({ address: this.account });

      const currencies = uniq(flatten(rawTransactions.map(i => i.inputs.map(input => input.currency))));

      //console.log("getAllTransactions:",currencies)
      await Promise.all(currencies.map(i => getToken(i)));
      return rawTransactions.map(i => {
        return {
          ...i,
          metadata: OmgUtil.transaction.decodeMetadata(String(i.metadata))
        };
      });
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  async getBalances () {

    try {
      const _childchainBalances = await this.childChain.getBalance(this.account);
      //console.log("_childchainBalances:",_childchainBalances)
      const childchainBalances = await Promise.all(_childchainBalances.map(
        async i => {
          const token = await getToken(i.currency);
          return {
            ...token,
            amount: i.amount.toString()
          };
        }
      ));

      const rootErc20Balances = await Promise.all(childchainBalances.map(
        async i => {
          //console.log("Looking up:",i)
          if (i.symbol !== 'ETH') {
            const balance = await OmgUtil.getErc20Balance({
              web3: this.web3,
              address: this.account,
              erc20Address: i.currency
            });
            //console.log("Balance:",balance)
            return {
              ...i,
              amount: balance.toString()
            };
          }
        }
      ));

      const _rootEthBalance = await this.web3.eth.getBalance(this.account);
      const ethToken = await getToken(OmgUtil.transaction.ETH_CURRENCY);
      const rootchainEthBalance = {
        ...ethToken,
        amount: _rootEthBalance
      };

      return {
        rootchain: orderBy([ rootchainEthBalance, ...rootErc20Balances.filter(i => !!i) ], i => i.currency),
        childchain: orderBy(childchainBalances, i => i.currency)
      };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  async checkAllowance (currency) {
    try {
      const tokenContract = new this.web3.eth.Contract(erc20abi, currency);
      const { address: erc20VaultAddress } = await this.rootChain.getErc20Vault();
      const allowance = await tokenContract.methods.allowance(this.account, erc20VaultAddress).call({ from: currency });
      return allowance.toString();
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not check deposit allowance for ERC20.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async approveErc20 (value, currency, gasPrice) {
    try {
      const valueBN = new BN(value.toString());
      await this.rootChain.approveToken({
        erc20Address: currency,
        amount: valueBN,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not approve ERC20 for deposit.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async resetApprove (value, currency, gasPrice) {
    try {
      const valueBN = new BN(value.toString());
      // the reset approval
      await this.rootChain.approveToken({
        erc20Address: currency,
        amount: 0,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
      // approval for new amount
      await this.rootChain.approveToken({
        erc20Address: currency,
        amount: valueBN,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not reset approval allowance for ERC20.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

// normalize signing methods across wallet providers
  async signTypedData (typedData) {
    function isExpectedSignTypedV3Error (message) {
      if (
        message.includes('The method eth_signTypedData_v3 does not exist')
        || message.includes('Invalid JSON RPC response')
        || message.includes('Cannot read property') // walletlink
        || message.includes('undefined is not an object') // walletlink safari
      ) {
        return true;
      }
      return false;
    }

    try {

      const signature = await this.web3.currentProvider.send(
        'eth_signTypedData_v3',
        [
          this.web3.utils.toChecksumAddress(this.account),
          JSONBigNumber.stringify(typedData)
        ]
      );
      //return signature; //for Web3.js 1.0.0-beta 55
      return signature.result; //enables Web 1.3.4

    } catch (error) {

    if (!isExpectedSignTypedV3Error(error.message)) {
        // not an expected error
        throw new WebWalletError({
          originalError: error,
          customErrorMessage: 'Could not sign the transaction. Please try again.',
          reportToSentry: true,
          reportToUi: true
        });
      }
      // method doesn't exist try another
    }

    // fallback signing method if signTypedData is not implemented by the provider
    try {
      const typedDataHash = OmgUtil.transaction.getToSignHash(typedData);
      const signature = await this.web3.eth.sign(
        bufferToHex(typedDataHash),
        this.web3.utils.toChecksumAddress(this.account)
      );
      return signature;
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not sign the transaction. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  getMergeTypedData (utxos) {
    const _metadata = 'Merge UTXOs';
    const payments = [ {
      owner: this.account,
      currency: utxos[0].currency,
      amount: utxos.reduce((prev, curr) => {
        return prev.add(new BN(curr.amount.toString()));
      }, new BN(0))
    } ];
    const fee = {
      currency: OmgUtil.transaction.ETH_CURRENCY,
      amount: 0
    };
    const txBody = OmgUtil.transaction.createTransactionBody({
      fromAddress: this.account,
      fromUtxos: utxos,
      payments,
      fee,
      metadata: OmgUtil.transaction.encodeMetadata(_metadata)
    });
    const typedData = OmgUtil.transaction.getTypedData(txBody, this.plasmaContractAddress);
    return {
      typedData,
      txBody
    };
  }

  async mergeUtxos (useLedgerSign = false, utxos) {

    try {
      const { typedData, txBody } = this.getMergeTypedData(utxos);

      const signature = useLedgerSign
        ? await this.ledgerSign(typedData)
        : await this.signTypedData(typedData);

      const signatures = new Array(txBody.inputs.length).fill(signature);
      const signedTxn = this.childChain.buildSignedTransaction(typedData, signatures);
      const submittedTransaction = await this.childChain.submitTransaction(signedTxn);
      return {
        ...submittedTransaction,
        block: {
          blknum: submittedTransaction.blknum,
          timestamp: Math.round((new Date()).getTime() / 1000)
        },
        metadata: 'Merge UTXOs',
        status: 'Pending'
      };
    } catch (error) {
      if (error instanceof WebWalletError) {
        throw error;
      }

      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not merge utxos. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async fetchFees () {
    try {
      const allFees = await this.childChain.getFees();
      return allFees['1'];
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  async getTransferTypedData ({
    utxos,
    recipient,
    value,
    currency,
    feeToken,
    metadata
  }) {

    if (!utxos || !utxos.length) {
      try {
        const _utxos = await this.childChain.getUtxos(this.account);
        utxos = orderBy(_utxos, i => i.amount, 'desc');
      } catch (error) {
        throw new WebWalletError({
          originalError: error,
          customErrorMessage: 'Could not fetch account utxos. Please select them manually.',
          reportToSentry: false,
          reportToUi: true
        });
      }
    }

    const allFees = await this.fetchFees();
    const feeInfo = allFees.find(i => i.currency === feeToken);
    if (!feeInfo) {
      throw new WebWalletError({
        originalError: new Error(`${feeToken} is not a supported fee token.`),
        customErrorMessage: `${feeToken} is not a supported fee token.`,
        reportToSentry: false,
        reportToUi: true
      });
    }

    const isAddress = this.web3.utils.isAddress(recipient);
    if (!isAddress) {
      recipient = await this.web3.eth.ens.getAddress(recipient);
    }
    if (!recipient) {
      throw new WebWalletError({
        originalError: new Error('Not a valid ENS name.'),
        customErrorMessage: 'Not a valid ENS name.',
        reportToSentry: false,
        reportToUi: true
      });
    }

    try {
      const payments = [ {
        owner: recipient,
        currency,
        amount: new BN(value.toString())
      } ];
      console.log({ payments });
      const fee = {
        currency: feeToken,
        amount: new BN(feeInfo.amount.toString())
      };
      console.log({ fee });
      const txBody = OmgUtil.transaction.createTransactionBody({
        fromAddress: this.account,
        fromUtxos: utxos,
        payments,
        fee,
        metadata: metadata || OmgUtil.transaction.NULL_METADATA
      });
      console.log({ txBody });
      const typedData = OmgUtil.transaction.getTypedData(txBody, this.plasmaContractAddress);
      return { txBody, typedData };
    } catch (error) {
      if (error.message.includes('Insufficient funds')) {
        throw new WebWalletError({
          originalError: error,
          customErrorMessage: error.message,
          reportToSentry: false,
          reportToUi: true
        });
      }

      if (error.message.includes('Inputs must be an array of size')) {
        throw new WebWalletError({
          originalError: error,
          customErrorMessage: 'This transaction will require more than 4 UTXOs. Please merge some UTXOs then try again.',
          reportToSentry: false,
          reportToUi: true
        });
      }

      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not create the transaction. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async transfer ({
    useLedgerSign = false,
    typedData,
    txBody
  }) {

    try {
      const signature = await this.signTypedData(typedData);

      const signatures = new Array(txBody.inputs.length).fill(signature);
      
      const signedTxn = this.childChain.buildSignedTransaction(typedData, signatures);
     
      const submittedTransaction = await this.childChain.submitTransaction(signedTxn);
      
      return {
        txBody, 
        receipt: submittedTransaction,
        ...submittedTransaction,
        block: {
          blknum: submittedTransaction.blknum,
          timestamp: Math.round((new Date()).getTime() / 1000)
        },
        metadata: OmgUtil.transaction.decodeMetadata(String(txBody.metadata)),
        status: 'Pending'
      };
    } catch (error) {
      if (error instanceof WebWalletError) {
        throw error;
      }
      if (error.message.includes('utxo_not_found')) {
        console.log(error.message)
        throw new WebWalletError({
          originalError: error,
          customErrorMessage: 'Failed - Plasma rate limit exceeded. Try again later.',
          reportToSentry: false,
          reportToUi: true
        });
      }

      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Failed to submit the transaction. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async getUtxos () {
    try {
      const _utxos = await this.childChain.getUtxos(this.account);
      const utxos = await Promise.all(_utxos.map(async utxo => {
        const tokenInfo = await getToken(utxo.currency);
        return { ...utxo, tokenInfo };
      }));
      return utxos;
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not fetch account utxos. Please try again',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async getEthStats () {
    try {
      const currentETHBlockNumber = await this.web3.eth.getBlockNumber();
      return { currentETHBlockNumber };
    } catch (error) {
      return null;
    }
  }

  // run on boot to get past deposits
  async getDeposits () {
    try {
      const { contract: ethVault } = await this.rootChain.getEthVault();
      const { contract: erc20Vault } = await this.rootChain.getErc20Vault();

      let _ethDeposits = [];
      try {
        _ethDeposits = await ethVault.getPastEvents('DepositCreated', {
          filter: { depositor: this.account },
          fromBlock: 0
        });
      } catch (error) {
        console.log('Getting past ETH DepositCreated events timed out: ', error.message);
      }

      let _erc20Deposits = [];
      try {
        _erc20Deposits = await erc20Vault.getPastEvents('DepositCreated', {
          filter: { depositor: this.account },
          fromBlock: 0
        });
      } catch (error) {
        console.log('Getting past ERC20 DepositCreated events timed out: ', error.message);
      }

      const ethDeposits = await Promise.all(_ethDeposits.map(i => this.getDepositStatus(i)));
      const erc20Deposits = await Promise.all(_erc20Deposits.map(i => this.getDepositStatus(i)));
      return { eth: ethDeposits, erc20: erc20Deposits };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not fetch deposit information. Please try restarting the application.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async getDepositStatus (deposit) {
    const depositFinality = 10;
    const state = store.getState();
    const ethBlockNumber = get(state, 'status.currentETHBlockNumber');
    const tokenInfo = await getToken(deposit.returnValues.token);
    const status = ethBlockNumber - deposit.blockNumber >= depositFinality ? 'Confirmed' : 'Pending';
    const pendingPercentage = (ethBlockNumber - deposit.blockNumber) / depositFinality;
    return { ...deposit, status, pendingPercentage: (pendingPercentage * 100).toFixed(), tokenInfo };
  }

  async depositEth (value, gasPrice) {
    try {
      const valueBN = new BN(value.toString());
      const result = await this.rootChain.deposit({
        amount: valueBN,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
      // normalize against deposits from pastevents
      const deposit = {
        ...result,
        isEth: true,
        returnValues: {
          token: OmgUtil.transaction.ETH_CURRENCY,
          amount: value.toString()
        }
      };
      return await this.getDepositStatus(deposit);
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not deposit ETH. Please check to make sure you have enough ETH to cover both the amount you want to deposit and the associated gas fees.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async depositErc20 (value, currency, gasPrice) {
    try {
      const valueBN = new BN(value.toString());
      const result = await this.rootChain.deposit({
        amount: valueBN,
        currency,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
      // normalize against deposits from pastevents
      const deposit = {
        ...result,
        returnValues: {
          token: currency,
          amount: value.toString()
        }
      };
      return await this.getDepositStatus(deposit);
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not deposit ERC20. Please check to make sure you have enough in your wallet to cover both the amount you want to deposit and the associated gas fees.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  // run on poll to check status of any 'pending' deposits
  async checkPendingDepositStatus () {
    try {
      const state = store.getState();
      const { eth: ethDeposits, erc20: erc20Deposits } = state.deposit;

      const pendingEthDeposits = pickBy(ethDeposits, (deposit, transactionHash) => {
        return deposit.status === 'Pending';
      });
      const pendingErc20Deposits = pickBy(erc20Deposits, (deposit, transactionHash) => {
        return deposit.status === 'Pending';
      });

      const updatedEthDeposits = await Promise.all(Object.values(pendingEthDeposits).map(this.getDepositStatus));
      const updatedErc20Deposits = await Promise.all(Object.values(pendingErc20Deposits).map(this.getDepositStatus));
      return { eth: updatedEthDeposits, erc20: updatedErc20Deposits };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  // run on poll to check status of any 'pending' exits
  async checkPendingExitStatus () {
    try {
      const state = store.getState();
      const pendingExits = Object.values(state.exit.pending);
      const updatedExits = pendingExits.map(this.getExitStatus);
      return updatedExits;
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        reportToSentry: false,
        reportToUi: false
      });
    }
  }

  getExitStatus (exit) {

    const exitFinality = 12;
    const state = store.getState();
    const ethBlockNumber = get(state, 'status.currentETHBlockNumber');
    const status = (ethBlockNumber - exit.blockNumber) >= exitFinality ? 'Confirmed' : 'Pending';
    const pendingPercentage = (ethBlockNumber - exit.blockNumber) / exitFinality;

    let enhancedExit = {
      ...exit,
      status,
      pendingPercentage: (pendingPercentage * 100).toFixed()
    };

    if (exit.returnValues) {
      const rawQueues = get(state, 'queue', {});
      const queues = flatten(Object.values(rawQueues));

      const exitId = exit.returnValues.exitId.toString();
      const queuedExit = queues.find(i => i.exitId === exitId);
      let queuePosition;
      let queueLength;
      if (queuedExit) {
        const tokenQueue = rawQueues[queuedExit.currency];
        queuePosition = tokenQueue.findIndex(x => x.exitId === exitId);
        queueLength = tokenQueue.length;
        enhancedExit = {
          ...enhancedExit,
          exitableAt: queuedExit.exitableAt,
          currency: queuedExit.currency,
          queuePosition: queuePosition + 1,
          queueLength
        };
      }
    }

    return enhancedExit;
  }

  async getExits () {
    try {
      const { contract } = await this.rootChain.getPaymentExitGame();

      let allExits = [];
      try {
        allExits = await contract.getPastEvents('ExitStarted', {
          filter: { owner: this.account },
          fromBlock: 0
        });
      } catch (error) {
        console.log('Getting past ExitStarted events timed out: ', error.message);
        return null;
      }

      const exitedExits = [];
      for (const exit of allExits) {
        let isFinalized = [];
        try {
          isFinalized = await contract.getPastEvents('ExitFinalized', {
            filter: { exitId: exit.returnValues.exitId.toString() },
            fromBlock: 0
          });
        } catch (error) {
          console.log('Getting past ExitFinalized events timed out: ', error.message);
          return null;
        }
        if (isFinalized.length) {
          exitedExits.push(exit);
        }
      }

      const pendingExits = allExits
        .filter(i => {
          const foundMatch = exitedExits.find(x => x.blockNumber === i.blockNumber);
          return !foundMatch;
        })
        .map(this.getExitStatus);

      return {
        pending: { ...keyBy(pendingExits, 'transactionHash') },
        exited: { ...keyBy(exitedExits, 'transactionHash') }
      };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not fetch past exit information. Please try restarting the application.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async checkForExitQueue (token) {
    try {
      return await this.rootChain.hasToken(token);
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: `Could not check if exit queue already exists for ${token}.`,
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async getExitQueue (_currency) {

    const currency = _currency; //;

    try {
      let queue = [];
      try {
        queue = await this.rootChain.getExitQueue(currency);
      } catch (error) {
        if (networkService.environment === 'Mainnet') {
          console.log('No exitQueue for', currency);
        }
        return null;
      }
      return {
        currency,
        queue: queue.map(i => ({
          ...i,
          currency
        }))
      };
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: `Could not fetch exit queue for ${currency}`,
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async addExitQueue (token, gasPrice) {
    try {
      return await this.rootChain.addToken({
        token,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not add exit queue. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async exitUtxo (utxo, gasPrice) {
    try {
      const exitData = await this.childChain.getExitData(utxo);
      try {
        const res = await this.rootChain.startStandardExit({
          utxoPos: exitData.utxo_pos,
          outputTx: exitData.txbytes,
          inclusionProof: exitData.proof,
          txOptions: {
            from: this.account,
            gasPrice: gasPrice.toString()
          }
        });
        return {
          ...res,
          status: 'Pending',
          pendingPercentage: 0
        };
      } catch (error) {
        // if error from user cancellation dont retry
        if (error.code !== 4001) {
          // sometimes gas estimation can fail
          // so try again but set the gas explicitly to avoid the estimate
          return this.rootChain.startStandardExit({
            utxoPos: exitData.utxo_pos,
            outputTx: exitData.txbytes,
            inclusionProof: exitData.proof,
            txOptions: {
              from: this.account,
              gasPrice: gasPrice.toString(),
              gas: 400000
            }
          });
        }
        throw error;
      }
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not start exit for this utxo. Please try again.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async processExits (maxExits, currency, gasPrice) {
    try {
      return await this.rootChain.processExits({
        token: currency,
        exitId: 0,
        maxExitsToProcess: maxExits,
        txOptions: {
          from: this.account,
          gasPrice: gasPrice.toString()
        }
      });
    } catch (error) {
      throw new WebWalletError({
        originalError: error,
        customErrorMessage: 'Could not process exits. Please try again later.',
        reportToSentry: false,
        reportToUi: true
      });
    }
  }

  async getGasPrice () {

    //Note - this is always in wei
    /*
      typical numbers are 100 to 400 Gwei
      145,000,000,000 on Feb. 9, 2021
    */

    const toWei = Math.pow(10,9);

    // first try ethgasstation
    try {
      const { data: { safeLow, average, fast } } = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');

      return {
        slow:   (safeLow / 10) * toWei,
        normal: (average / 10) * toWei,
        fast:   (fast    / 10) * toWei
      };

    } catch (error) {
      //
    }

    // if not web3 oracle
    try {
      const _medianEstimate = await this.web3.eth.getGasPrice();
      const medianEstimate = Number(_medianEstimate);
      return {
        slow: Math.max(medianEstimate / 2, 1 * toWei),
        normal: medianEstimate,
        fast: medianEstimate * 5
      };
    } catch (error) {
      //
    }

    // if not these defaults
    // way too low in 2021... Sigh
    return {
      slow:   1 * toWei,
      normal: 2 * toWei,
      fast:  10 * toWei
    };
  }

  getNextTransactionUtxo (
    transactionBody,
    receipt,
    transferCurrency,
    feeCurrency
  ) {
    let nextPaymentUtxo = [];
    let nextFeeUtxo = [];
    // receive token output index
    const tokenOutputIndex = transactionBody.outputs.findIndex(
      output => output.currency === transferCurrency
        && output.outputGuard === this.account
    );
    // set payment uxto for the next transfer
    if (tokenOutputIndex !== -1) {
      nextPaymentUtxo = transactionBody.outputs[tokenOutputIndex];
      nextPaymentUtxo.blknum = receipt.blknum;
      nextPaymentUtxo.txindex = receipt.txindex;
      nextPaymentUtxo.oindex = tokenOutputIndex;
    }
    // receive fee output index
    const feeOutputIndex = transactionBody.outputs.findIndex(
      output => output.currency === feeCurrency
        && output.outputGuard === this.account
    );
    // set fee uxto for the next transfer
    if (feeOutputIndex !== -1) {
      nextFeeUtxo = transactionBody.outputs[feeOutputIndex];
      nextFeeUtxo.blknum = receipt.blknum;
      nextFeeUtxo.txindex = receipt.txindex;
      nextFeeUtxo.oindex = feeOutputIndex;
    }
    return {
      tokenOutputIndex, feeOutputIndex, nextPaymentUtxo, nextFeeUtxo
    }
  }

  checkUtxoForChange (address, utxo, amount, transactionBody) {
    if (!utxo || utxo.length === 0) {
      throw new Error(`No UTXO provided for ${address}`);
    }  if (transactionBody.outputs.length > 4) {
      throw new Error(`The provided transaction body has 4 outputs. You need to have at least 1 spare output to proceed.`);
    }  if (utxo.amount.gt(amount)) {
      const changeAmount = utxo.amount.sub(amount);
      const changeOutput = {
        outputType: 1,
        outputGuard: address,
        currency: utxo.currency,
        amount: changeAmount
      }
      transactionBody.outputs.push(changeOutput);
    }
  }

  amountToBN (amount, decimals = 18) {
    const multiplier = new BigNumber(10).pow(decimals);
    const subunit = new BigNumber(amount).times(multiplier).toFixed();
    return new BN(subunit);
  }

  BNToAmount (amount, decimals = 18) {
    const multiplier = new BigNumber(10).pow(decimals);
    const subunit = new BigNumber(amount).div(multiplier).toString();
    return subunit;
  }

  async getFeeAmount () {

    const fees = await this.childChain.getFees();
    
    const omgR = '0x942f123b3587ede66193aa52cf2bf9264c564f87'
    const omgM = '0xd26114cd6ee289accf82350c8d8487fedb8a0c07'

    //now, pick the right one from the list of three (max)
    const selectedFee = fees['1'].find(fee => fee.currency === omgM || fee.currency === omgR);

    const amount = BN.isBN(selectedFee.amount) ? selectedFee.amount : new BN(selectedFee.amount.toString())
    const currency = selectedFee.currency

    return {amount, currency};

  }

  getUsableUtxos = (
    address, 
    currency, 
    spendAmount, 
    filterEqual = true, 
    usage = 'UFO', 
    UTXOReservedData = {},
  ) => async (dispatch) => {

    const utxos = await this.childChain.getUtxos(address);

    const state = store.getState();
    const reservedUTXOs = state.rUTXOs.reservedUTXOs;
    const transactionHistory = state.rUTXOs.transactionHistory;

    // first update the reserved UTXOs
    const activeReservedUTXOs = reservedUTXOs.filter(utxo => utxo.expire_timestamp > new Date().getTime());
    // drop the expired utxos
    dispatch(updateReservedUTXOs(activeReservedUTXOs));
    // get the utxo_position
    let activeReservedUTXOsPositions = activeReservedUTXOs.reduce((acc, cur)=>{acc.push(cur.utxo_position); return acc},[]);

    if (address !== this.account) {
      activeReservedUTXOsPositions = [];
    }

    //Get OMG token
    const feeDetails = await networkService.getFeeAmount();
    const feeToken = feeDetails.currency;

    // check whether user transferred before or not
    if (usage === 'UFO' && transactionHistory.txBody !== null && transactionHistory.receipt !== null) {
      // we suppose the transferCurrency and feeCurrency is OMG
      const nextTransactionUTXOs = this.getNextTransactionUtxo(
        transactionHistory.txBody,
        transactionHistory.receipt,
        feeToken,
        feeToken,
      );
      return [nextTransactionUTXOs.nextPaymentUtxo, nextTransactionUTXOs.nextFeeUtxo];
    }

    // users haven't made the transaction
    // this is NOT an active UFO
    const filteredUtxos = utxos
    .filter(utxo => {
      return utxo.currency === currency && utxo.status !== 'Pending';
    })
    .filter(utxo => {
      // only select the unreserved utxos
      return !activeReservedUTXOsPositions.includes(utxo.utxo_pos.toString());
    })
    .filter(utxo => {
      const amount = BN.isBN(utxo.amount)
        ? utxo.amount
        : new BN(utxo.amount.toString());
        // console.log("Have:", amount.toString())
        // console.log("Need:", spendAmount.toString())
      return filterEqual ? amount.eq(spendAmount) : amount.gte(spendAmount);
    })
    .map(utxo => {
      const amount = BN.isBN(utxo.amount)
        ? utxo.amount
        : new BN(utxo.amount.toString());
      return {
        ...utxo, amount
      }
    });

    // Search UTXO for other wallets
    if (address !== this.account) {
      return filteredUtxos
    }

    if (!filteredUtxos.length) {
      console.log(`There are no UTXOs that can cover a payment for ${spendAmount} '${currency}'`);
    } else {
      console.log(`We found a good UTXO`);
      if (usage === 'UFO') {
        dispatch(reserveUTXO(buildUTXOPayload(filteredUtxos[0], usage, 5*60*1000, UTXOReservedData)));
      }
      if (usage === 'seller') {
        dispatch(reserveUTXO(buildUTXOPayload(filteredUtxos[0], usage, 30*60*1000, UTXOReservedData)));
      }
      if (usage === 'buyer') {
        dispatch(reserveUTXO(buildUTXOPayload(filteredUtxos[0], usage, 30*60*1000, UTXOReservedData)));
      }
      if (usage === 'doublePerfectA') {
        //reserve very briefly - it will be used right away, and then the OUTPUTS will be reserved
        //we need to reserve this briefly, so we do not double assign the UTXO if the buyer
        //wants to pay the fees and the payment, all with OMG
        dispatch(reserveUTXO(buildUTXOPayload(filteredUtxos[0], usage, 5*1000, UTXOReservedData)));
      }
      if (usage === 'doublePerfectB') {
        //do not reserve - it will be used right away, and then the OUTPUTS will be reserved
      }
    }
    return filteredUtxos.length ? [filteredUtxos[0]] : [];
  }

  confirmPerfectFeeUTXO (address, utxo, amount, transactionBody) {
    if (!utxo || utxo.length === 0) {
      throw new Error(`No Fee UTXO provided for ${address}`);
    }  if (transactionBody.outputs.length > 4) {
      throw new Error(`The provided transaction body has more than 4 outputs. You can only have 4 (max).`);
    }  if (utxo.amount.gt(amount)) {
      throw new Error(`Fee UXTO amount imperfect`);
    }
  }

  getSignature (toSign, signer) {
    const signature = ethUtil.ecsign(
      toSign,
      Buffer(signer.privateKey.replace('0x', ''), 'hex')
    );
    return sigUtil.concatSig(signature.v, signature.r, signature.s);
  }

  getSignatures (typedData, sender, receiver, feePayer){
    const toSign = OmgUtil.transaction.getToSignHash(typedData);
    const senderSignature = this.getSignature(toSign, this.senderAST);
    const receiverSignature = this.getSignature(toSign, this.receiverAST);
    const feePayerSignature = this.getSignature(toSign, this.feePayerAST);
    return [senderSignature, receiverSignature, feePayerSignature];
  }

  createTransactionBodyBid (
    paymentUtxo,
    paymentAmount,
    feeUtxo,
    feeAmount,
    metadata
  ) {  

  const address = networkService.account;

  //make sure there is enough in the feeUtxo
  const doubleFee = feeAmount.mul(new BN('2', 10));
  console.log("DoubleFee",doubleFee.toString())

  if (feeUtxo.amount.lt(doubleFee)) {
    throw new Error(`Fee UXTO amount too small to cover doubleFee`);
  }

  const encodedMetadata = metadata
    ? OmgUtil.transaction.encodeMetadata(metadata)
    : OmgUtil.transaction.NULL_METADATA;

  let inputs = [];
  let outputs = [];

  if (paymentUtxo.currency === feeUtxo.currency) {
    //that's a special case
    
    let changeAmount = feeUtxo.amount.sub(doubleFee);
    changeAmount = changeAmount.sub(paymentAmount);

    inputs = [feeUtxo];
    outputs = [
      {
        outputType: 1,
        outputGuard: address,
        currency: feeUtxo.currency,
        amount: paymentAmount,
      },
      { //generate perfect fee Utxo for the future swap
        outputType: 1,
        outputGuard: address,
        currency: feeUtxo.currency,
        amount: feeAmount,
      },
      { //and return the leftover
        outputType: 1,
        outputGuard: address,
        currency: feeUtxo.currency,
        amount: changeAmount,
      }
    ]
  } else {
    inputs = [paymentUtxo, feeUtxo];
    outputs = [
      {
        outputType: 1,
        outputGuard: address,
        currency: paymentUtxo.currency,
        amount: paymentAmount,
      },
      { //generate perfect fee Utxo for the future swap
        outputType: 1,
        outputGuard: address,
        currency: feeUtxo.currency,
        amount: feeAmount,
      }
    ];
    /*compute change for payment*/
    if (paymentUtxo.amount.gt(paymentAmount)) {
      const changeAmountP = paymentUtxo.amount.sub(paymentAmount);
      const changeOutputP = {
        outputType: 1,
        outputGuard: address,
        currency: paymentUtxo.currency,
        amount: changeAmountP
      }
      outputs.push(changeOutputP);
    }
    /*might also need to generate fee change Utxo*/
    if (feeUtxo.amount.gt(doubleFee)) {
      const changeAmountC = feeUtxo.amount.sub(doubleFee);
      const changeOutputC = {
        outputType: 1,
        outputGuard: address,
        currency: feeUtxo.currency,
        amount: changeAmountC
      }
      outputs.push(changeOutputC);
    }
  }

  let transactionBody = {
    inputs,
    outputs,
    metadata: encodedMetadata
  }

  return transactionBody;
}

  createTransactionBodyAST (
    sender,
    senderUtxo,
    senderAmount,
    receiver,
    receiverUtxo,
    receiverAmount,
    feePayer,
    feeAmount,
    feeUtxo,
    metadata
  ) {  

  const encodedMetadata = metadata
    ? OmgUtil.transaction.encodeMetadata(metadata)
    : OmgUtil.transaction.NULL_METADATA;

  let transactionBody = {
    inputs: [senderUtxo, receiverUtxo, feeUtxo],
    outputs: [
      {
        outputType: 1,
        outputGuard: receiver.address,
        currency: sender.currency,
        amount: senderAmount,
      },
      {
        outputType: 1,
        outputGuard: sender.address,
        currency: receiver.currency,
        amount: receiverAmount,
      }
    ],
    metadata: encodedMetadata
  }

  this.confirmPerfectFeeUTXO(feePayer.address, feeUtxo, feeAmount, transactionBody);

  /*compute change for sender*/
  if (senderUtxo.amount.gt(senderAmount)) {
    const changeAmountS = senderUtxo.amount.sub(senderAmount);
    const changeOutputS = {
      outputType: 1,
      outputGuard: sender.address,
      currency: senderUtxo.currency,
      amount: changeAmountS
    }
    transactionBody.outputs.push(changeOutputS);
  }

  /*compute change for receiver*/
  if (receiverUtxo.amount.gt(receiverAmount)) {
    const changeAmountR = receiverUtxo.amount.sub(receiverAmount);
    const changeOutputR = {
      outputType: 1,
      outputGuard: receiver.address,
      currency: receiverUtxo.currency,
      amount: changeAmountR
    }
    transactionBody.outputs.push(changeOutputR);
  }

  return transactionBody;
}

}

const networkService = new NetworkService();
export default networkService;
