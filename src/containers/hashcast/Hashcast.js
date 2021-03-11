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
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from 'react';
import { connect } from 'react-redux';
import { orderBy, isEqual } from 'lodash';

import { sendHashcastMessage, sendHashcastFile, subscribeChannel } from 'actions/hashcastAction';
import Button from 'components/button/Button';
import Pager from 'components/pager/Pager';
import { parseVarna, findHashcasts, hashSlice } from 'util/transactionSort';
import HashcastHistoryBox from "components/history/HashcastHistoryBox";

import * as styles from './Hashcast.module.scss';

const PER_PAGE = 4;

class Hashcast extends React.Component {

  constructor(props) {

    super(props);

    const { 
      sendHashcastLoad,
      uploadHashcastMessageLoad,
      getUploadHashCastFileURLLoad,
      uploadHashcastFileLoad,
      configureHashcastToPlasmaLoad,
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,
      hashpullGetUrlLoad,
    } = this.props.hashcast;

    const { 
      transaction,
    } = this.props;

    this.state = {
      // Simple message that users want to cast
      simpleMessage: '',
      
      // selected file
      selectedFile: null,

      // channel that message is posted to
      channel: null,
      
      // channel that users want to subscribe
      subscribedChannel: null,

      // send hashcast status
      sendHashcastLoad,

      // upload hashcast message
      uploadHashcastMessageLoad,

      // get upload url
      getUploadHashCastFileURLLoad,

      // upload hashcast file
      uploadHashcastFileLoad,

      // configure plasma
      configureHashcastToPlasmaLoad,

      // subscribe channel
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,

      // download hashcast
      hashpullGetUrlLoad,

      // Transaction History
      // sort by time
      transactions: orderBy(transaction, i => i.block.timestamp, 'desc'),
      
      hashToPull: '',
      hashcasts: '', //filtered lists of transactions - just show the hashcasts

      //history of Hashcasts
      page: 1,

    }
  }

  componentDidMount() {
    const { transaction } = this.props;
    
    const sortedData = parseVarna(transaction);
    const hashcasts = findHashcasts(transaction);

    this.setState({ transactions: sortedData.orderedTransactions });
    this.setState({ hashcasts });
  }

  componentDidUpdate(prevState) {

    const { 
      sendHashcastLoad,
      uploadHashcastMessageLoad,
      getUploadHashCastFileURLLoad,
      uploadHashcastFileLoad,
      configureHashcastToPlasmaLoad,
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,
      hashpullGetUrlLoad,
    } = this.props.hashcast;

    //your Plasma transactions
    const { 
      transaction
    } = this.props;

    if (prevState.hashcast.sendHashcastLoad !== sendHashcastLoad) {
      this.setState({ sendHashcastLoad });
    }

    if (prevState.hashcast.uploadHashcastMessageLoad !== uploadHashcastMessageLoad) {
      this.setState({ uploadHashcastMessageLoad });
    }

    if (prevState.hashcast.getUploadHashCastFileURLLoad !== getUploadHashCastFileURLLoad) {
      this.setState({ getUploadHashCastFileURLLoad });
    }

    if (prevState.hashcast.uploadHashcastFileLoad !== uploadHashcastFileLoad) {
      this.setState({ uploadHashcastFileLoad });
    }

    if (prevState.hashcast.configureHashcastToPlasmaLoad !== configureHashcastToPlasmaLoad) {
      this.setState({ configureHashcastToPlasmaLoad });
    }

    if (prevState.hashcast.subscribedChannelURL !== subscribedChannelURL) {
      this.setState({ subscribedChannelURL });
    }

    if (prevState.hashcast.subscribeChannelLoad !== subscribeChannelLoad) {
      this.setState({ subscribeChannelLoad });
    }

    if (prevState.hashcast.subscribeChannelError !== subscribeChannelError) {
      this.setState({ subscribeChannelError });
    }

    if (!isEqual(prevState.hashcast.hashpullGetUrlLoad, hashpullGetUrlLoad)) {
      this.setState({ hashpullGetUrlLoad });
    }


    if (prevState.transaction !== transaction) {
      //this means that you have either submitted a new item or a new bid,
      //so your Plasma transaction list has changed
      const sortedData = parseVarna(transaction);
      const hashcasts = findHashcasts(transaction);

      this.setState({ transactions: sortedData.orderedTransactions });
      this.setState({ hashcasts });
    }
  }

  handleSimpleMessage(event) {
    this.setState({ simpleMessage: event.target.value });
  }

  handleChannel(event) {
    this.setState({ channel: event.target.value });
  }

  handleSubscribeChannel(event) {
    this.setState({ subscribedChannel: event.target.value });
  }

  handleFileChange(event) {
    this.setState({ selectedFile: event.target.files[0] });
  }

  handleSetHash(event) {
    this.setState({ hashToPull: event.target.value });
  }

  /*********************************************/
  /******** Hashcast a simple string ***********/
  /*********************************************/

  //submit a simple Hashcast
  handleHashcast() {
    const { simpleMessage, selectedFile, channel } = this.state;
    if (simpleMessage) {
      this.props.dispatch(sendHashcastMessage(simpleMessage, channel));
    }
    if (selectedFile) {
      this.props.dispatch(sendHashcastFile(selectedFile, channel));
    }
  }

  /*********************************************/
  /********** Subscribe a channel **************/
  /*********************************************/
  handleSubscribe() {
    const { subscribedChannel } = this.state;
    this.props.dispatch(subscribeChannel(subscribedChannel));
  }

  render() {

    const { 
      simpleMessage, selectedFile, channel, subscribedChannel,
      // upload hashcast status
      uploadHashcastMessageLoad, uploadHashcastFileLoad,
      // get url
      getUploadHashCastFileURLLoad,
      // configure plasma
      configureHashcastToPlasmaLoad,
      // subscribe channel
      subscribedChannelURL, subscribeChannelLoad, subscribeChannelError,
      // page
      page,
      // hashcast data
      hashcasts,
      // pull data
      hashpullGetUrlLoad,
    } = this.state;

    const pageURL = window.location.href;

    let uploadButtonText = "Let's CAST!";
    let uploadButtonLoading = false;
    if (getUploadHashCastFileURLLoad) {
      uploadButtonText = 'Getting URL';
      uploadButtonLoading = true;
    }
    if (uploadHashcastMessageLoad || uploadHashcastFileLoad) {
      uploadButtonText = 'Uploading';
      uploadButtonLoading = true;
    }
    if (configureHashcastToPlasmaLoad) {
      uploadButtonText = 'Configuring';
      uploadButtonLoading = true;
    }

    let subscribeButtonText = "Subscribe";
    if (subscribeChannelLoad) subscribeButtonText = "Subscribing";

    //const _transactions = hashcasts; //transactions; //.filter(i => itemOpenList.includes(i.metadata));
    const paginatedHashcasts = hashSlice(page, PER_PAGE, hashcasts);

    //needed for the total number of pages so we can display Page X of Y
    let totalNumberOfPages = Math.ceil(hashcasts.length / PER_PAGE);

    //if totalNumberOfPages === 0, set to one so we don't get the "Page 1 of 0" display glitch
    if (totalNumberOfPages === 0) totalNumberOfPages = 1;

    return (

      <div className={styles.Container}>

        <div className={styles.InputContainer}>

          <div className={styles.Note}>
            <span className={styles.B}>Hashcast</span> is like Twitter for computers. You can 
            {' '}<span className={styles.B}>CAST</span> (broadcast) many different types 
            of messages, ranging from simple strings ('Hello world!') to 
            cryptographic payloads, such as Varna bids and atomic swap signatures.
            You can scan Plasma for these broadcasts, and if you find something 
            interesting, most hashes resolve to files that you can 
            {' '}<span className={styles.B}>PULL</span>{' '}(download).
            <br/>
            <br/>
            Hashcast allows all of us on Plasma to connect, trade, store stuff, 
            communicate, and exchange data. The latter capability is the starting 
            point for inter-process communication and synchronization, which is 
            needed for things like atomic swaps.
          </div>

          <div style={{background: '#C83950', padding: '5px', marginTop: '5px'}}>
          
          <h3 style={{marginTop: '5px', marginBottom: 0, color: 'white'}}>What would you like to CAST?</h3>

          <h5 style={{marginBottom: 0, color: 'white'}}>A simple message...</h5>
          
          <div className={styles.NoteWhite}>
            This message will be stored as cleartext at the location defined by the message hash.
          </div>
          <input
            value={simpleMessage}
            placeholder="Hello world!"
            onChange={event => {this.handleSimpleMessage(event)}}
            disabled={selectedFile}
          />

          <h5 style={{marginBottom: 0, color: 'white'}}>Or, a larger file</h5>
          <div className={styles.NoteWhite}>
            In most cases, this file will contain a cipher text. It's up to you to encrypt your data - 
            all we do is store your file for one year at a location defined by the file's hash.
          </div>
          <input type="file" onChange={(event)=>{this.handleFileChange(event)}} disabled={simpleMessage}/>

          <h5 style={{marginBottom: 0, color: 'white'}}>Set channel</h5>
          <div className={styles.NoteWhite}>
            To help people find your casts, you can define a channel ID.
            This could be something like 'VARNA', 'OMG_NEWS', or 'TOKTIK'.
            People can then subscribe to those channels.
          </div>
          <input
            value={channel ? channel : ""}
            placeholder="Optional - channelID"
            onChange={event => {this.handleChannel(event)}}
          />
          <Button
            type='primary'
            style={{marginTop: 20}}
            loading={uploadButtonLoading}
            disabled={(!simpleMessage && !selectedFile) || uploadButtonLoading}
            onClick={()=>{this.handleHashcast()}}
          >
            {uploadButtonText}
          </Button>
          </div>
        </div>

        <div className={styles.InputContainer}>

          <div style={{background: '#C83950', padding: '5px', marginTop: '5px'}}>
            <h3 style={{marginTop: 0, color: 'white'}}>Subscribe</h3>

            <div className={styles.NoteWhite}>
              When you subscribe, you will be notified of new casts on that channel. If you get an error, 
              such as 'Channel does not exist', that means the channel has not been set up yet. You can 
              set one up by Hashcasting.
            </div>
            <input
              value={subscribedChannel ? subscribedChannel : ""}
              placeholder="Subscribe to OMG_NEWS"
              onChange={event => {this.handleSubscribeChannel(event)}}
            />

            <Button
              type='primary'
              style={{marginTop: 20}}
              loading={subscribeChannelLoad}
              disabled={!subscribedChannel || subscribeChannelLoad}
              onClick={()=>{this.handleSubscribe()}}
            >
              {subscribeButtonText}
            </Button>

            {subscribeChannelError === false &&
              <div className={styles.successMessageBox} onClick={()=>{window.open(pageURL.includes("labs.varna.ai") ? subscribedChannelURL.subscribedURL : subscribedChannelURL.subscribedURL.replace("https://labs.varna.ai/", "http://localhost:3000/"))}}>
                {pageURL.includes("labs.varna.ai") ? subscribedChannelURL.subscribedURL : subscribedChannelURL.subscribedURL.replace("https://labs.varna.ai/", "http://localhost:3000/")}
              </div>
            }

            {subscribeChannelError !== null && subscribeChannelError !== false &&
              <div className={styles.errorMessageBox}>
                Invalid channel
              </div>
            }
          </div>

          <div style={{background: 'white', marginTop: 10}}>
            <h3 style={{marginTop: 0}}>My Hashcasts</h3>

            <div className={styles.Note}>
              Clicking {' '}<span className={styles.B}>PULL</span>{' '}
              will download the associated file.
            </div>

              <Pager
                currentPage={page}
                totalPages={totalNumberOfPages}
                isLastPage={paginatedHashcasts.length < PER_PAGE}
                onClickNext={()=>this.setState({page:page+1})}
                onClickBack={()=>this.setState({page:page-1})}
              />

              {!paginatedHashcasts.length && (
                <div className={styles.Disclaimer}>No More Hashcasts.</div>
              )}

              {paginatedHashcasts && paginatedHashcasts.map((v,i) => {
                return (
                  <HashcastHistoryBox 
                    key={i} 
                    data={{...v, hashpullGetUrlLoad}}
                  />
                )
              })}

          </div>
        </div>
      </div>

    )
  }
}

const mapStateToProps = state => ({
  hashcast: state.hashcast,
  transaction: state.transaction,
});

export default connect(mapStateToProps)(Hashcast);