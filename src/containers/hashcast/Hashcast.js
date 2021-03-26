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

import { 
  sendHashcastMessage, 
  sendHashcastFile,
  verifyHashID, 
  findHashcaseWaitingList, 
  getHashcastMessage,
  subscribeChannel,
} from 'actions/hashcastAction';
import { checkVersion } from 'actions/versionAction';
import Button from 'components/button/Button';
import Pager from 'components/pager/Pager';
import { parseVarna, findHashcasts, hashSlice } from 'util/transactionSort';
import HashcastHistoryBox from "components/history/HashcastHistoryBox";

import * as styles from './Hashcast.module.scss';
import { openError } from 'actions/uiAction';

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
      hashpullGetUrlLoad,
      verifiedHashID,
      hashcastMessageWaitingList,
      currentHashcasetMessageHashID,
      hashcastMessage,
      hashcastMessageLoad,
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,
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
      channel: '',
      
      // channel that users want to subscribe
      subscribedChannel: '',

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

      // download hashcast
      hashpullGetUrlLoad,

      // Transaction History
      // sort by time
      transactions: orderBy(transaction, i => i.block.timestamp, 'desc'),
      
      hashToPull: '',
      hashcasts: '', //filtered lists of transactions - just show the hashcasts

      //history of Hashcasts
      page: 1,

      // active hashID
      verifiedHashID,

      // filter
      filterTag: '',

      // the waiting list of hashcast that needs to be downloaded
      hashcastMessageWaitingList,

      // downloaded hashcast message
      currentHashcasetMessageHashID,
      hashcastMessage,
      hashcastMessageLoad,

      // subscribe channel
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,
    }
  }

  componentDidMount() {
    const { transaction } = this.props;
    const { hashcastMessageWaitingList, verifiedHashID } = this.state;

    const sortedData = parseVarna(transaction);

    if (sortedData.hashcastMeta.length) {
      this.props.dispatch(verifyHashID(sortedData.hashcastMeta));
    }

    // Display the hashcast data
    if (verifiedHashID.length) {
      const hashcasts = findHashcasts(transaction, verifiedHashID);
      this.setState({ hashcasts });
    }

    // restart to download message
    if (hashcastMessageWaitingList.length) {
      this.props.dispatch(getHashcastMessage(
        hashcastMessageWaitingList[0].hashID,
        hashcastMessageWaitingList,
      ));
    }

    this.props.dispatch(checkVersion());

    this.setState({ transactions: sortedData.orderedTransactions });


  }

  componentDidUpdate(prevState) {

    const { 
      sendHashcastLoad,
      uploadHashcastMessageLoad,
      getUploadHashCastFileURLLoad,
      uploadHashcastFileLoad,
      configureHashcastToPlasmaLoad,
      hashpullGetUrlLoad,
      verifiedHashID,
      hashcastMessageWaitingList,
      currentHashcasetMessageHashID,
      hashcastMessage,
      hashcastMessageLoad,
      subscribedChannelURL,
      subscribeChannelLoad,
      subscribeChannelError,
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

    if (!isEqual(prevState.hashcast.hashpullGetUrlLoad, hashpullGetUrlLoad)) {
      this.setState({ hashpullGetUrlLoad });
    }

    if (prevState.transaction !== transaction) {
      //this means that you have either submitted a new item or a new bid,
      //so your Plasma transaction list has changed
      const sortedData = parseVarna(transaction);
      const hashcasts = findHashcasts(transaction, verifiedHashID);
      this.props.dispatch(verifyHashID(sortedData.hashcastMeta));
      this.setState({ transactions: sortedData.orderedTransactions, hashcasts });
    }

    if (!isEqual(prevState.hashcast.verifiedHashID, verifiedHashID)) {
      this.setState({ verifiedHashID, filterTag: '' });
      const hashcasts = findHashcasts(transaction, verifiedHashID);

      const hashcastMessageWaitingListTemp = this.props.dispatch(findHashcaseWaitingList(
        verifiedHashID,
        hashcastMessageLoad,
        hashcastMessageWaitingList,
      ));

      // start to get hashcast message
      if ((currentHashcasetMessageHashID === null && hashcastMessageWaitingListTemp.length) ||
        hashcastMessageWaitingListTemp.length === 1) {
        this.props.dispatch(getHashcastMessage(
          hashcastMessageWaitingListTemp[0].hashID,
          hashcastMessageWaitingListTemp,
        ));
      }

      this.setState({ hashcasts });
    }

    if (!isEqual(hashcastMessageWaitingList, hashcastMessageWaitingList)) {
      this.setState({ hashcastMessageWaitingList });
    }

    if (prevState.hashcast.currentHashcasetMessageHashID !== currentHashcasetMessageHashID) {
      this.setState({ currentHashcasetMessageHashID });
    }

    if (!isEqual(prevState.hashcast.hashcastMessage, hashcastMessage)) {
      this.setState({ hashcastMessage });
    }

    if (!isEqual(prevState.hashcast.hashcastMessageLoad, hashcastMessageLoad)) {
      this.setState({ hashcastMessageLoad });

      if (prevState.hashcast.hashcastMessageLoad[currentHashcasetMessageHashID] !== 
        hashcastMessageLoad[currentHashcasetMessageHashID] &&
        hashcastMessageLoad[currentHashcasetMessageHashID] === false &&
        hashcastMessageWaitingList.length
      ) {
        this.props.dispatch(getHashcastMessage(
          hashcastMessageWaitingList[0].hashID,
          hashcastMessageWaitingList,
        ));
      }
    }

    if (prevState.hashcast.subscribedChannelURL !== subscribedChannelURL) {
      this.setState({ subscribedChannelURL });
    }

    if (prevState.hashcast.subscribeChannelLoad !== subscribeChannelLoad) {
      this.setState({ subscribeChannelLoad });
    }

    if (prevState.hashcast.subscribeChannelError !== subscribeChannelError) {
      this.setState({ subscribeChannelError });

      if (subscribeChannelError === false) {
        const pageURL = window.location.href;
        window.open(`${pageURL}${subscribedChannelURL.subscribed}`);
      }

      if (subscribeChannelError === 404) {
        this.props.dispatch(openError("Channel not found"));
        this.setState({ subscribedChannel: '' });
      }
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

  handleSetHash(event) {
    this.setState({ hashToPull: event.target.value });
  }

  handleFileChange(event) {
    const fileSize = event.target.files[0].size;
    if (fileSize < 1024 * 1024) {
      this.setState({ selectedFile: event.target.files[0] });
    } else {
      this.props.dispatch(openError('File size exceeds 1MB'));
      event.target.value = null;
    }
  }

  /*********************************************/
  /******** Hashcast a simple string ***********/
  /*********************************************/
  handleHashcast() {
    const { simpleMessage, selectedFile, channel } = this.state;
    if (simpleMessage) {
      this.props.dispatch(sendHashcastMessage(simpleMessage, channel));
    }
    if (selectedFile) {
      this.props.dispatch(sendHashcastFile(selectedFile, channel));
    }
  }

  /************************************************/
  /******** filter the hashcast message ***********/
  /************************************************/
  handleFilterTag(event) {
    const { transactions, verifiedHashID } = this.state;
    const filterTag = event.target.value;
    if (!filterTag) {
      const hashcasts = findHashcasts(transactions, verifiedHashID);
      this.setState({ hashcasts });
    } else {
      const hashcasts = findHashcasts(transactions, verifiedHashID);
      const filteredHashcasts = hashcasts.filter(i => i.tag && i.tag.includes(filterTag));
      this.setState({ hashcasts: filteredHashcasts });
    }
    this.setState({ filterTag });
  }

  hanldeShowAll() {
    const { transactions, verifiedHashID } = this.state;
    const hashcasts = findHashcasts(transactions, verifiedHashID);
    this.setState({ hashcasts, filterTag: '' });
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
      // page
      page,
      // hashcast data
      hashcasts,
      // pull data
      hashpullGetUrlLoad,
      // filter tag
      filterTag,
      // hashcast message
      hashcastMessage,
      // subscribe channel
      subscribeChannelLoad,
    } = this.state;

    let uploadButtonText = "Cast";
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
      <div>
      <div className={styles.container}>
        <div className={styles.postCastContainer}>
          <input
              value={channel}
              className={styles.inputtag}
              placeholder="#Tag (optional)"
              onChange={event => {this.handleChannel(event)}}
          />
          <input
              value={simpleMessage}
              className={styles.input}
              placeholder="Type your message to the world..."
              onChange={event => {this.handleSimpleMessage(event)}}
              disabled={selectedFile}
          /> or &nbsp;
          <div className={styles.inputImageContainer}>
                <label for="files" class="btn" className={styles.label} disabled={simpleMessage}>
                  Upload an Image (&le;1MB)
                </label>
              <input
                  id="files"
                  type="file"
                  className={styles.inputImage}
                  accept="image/*"
                  onChange={(event)=>{this.handleFileChange(event)}}
                  disabled={simpleMessage}
              />
          </div>
          <Button
              type='primary'
              className={styles.button}
              loading={uploadButtonLoading}
              disabled={(!simpleMessage && !selectedFile) || uploadButtonLoading}
              onClick={()=>{this.handleHashcast()}}
          >
            {uploadButtonText}
          </Button>
        </div>
      </div>
    <div className={styles.container}>
        <div className={styles.leftBoxContainer}>
          <div className={styles.innerContainer}>

            <div className={styles.hashcastContainer}>

              <Pager
                currentPage={page}
                totalPages={totalNumberOfPages}
                isLastPage={paginatedHashcasts.length < PER_PAGE}
                onClickNext={()=>this.setState({page:page+1})}
                onClickBack={()=>this.setState({page:page-1})}
              />

              {!paginatedHashcasts.length && (
                <div className={styles.basictext}>No More Hashcasts.</div>
              )}

              {paginatedHashcasts && paginatedHashcasts.map((v,i) => {
                return (
                  <HashcastHistoryBox 
                    key={i} 
                    data={{...v, hashpullGetUrlLoad, hashcastMessage}}
                  />
                )
              })}

            </div>

          </div>
        </div>

      <div className={styles.rightBoxContainer}>
            <div className={styles.innerContainer}>

              <div className={styles.basictext}>
                Live Hashcasts
              </div>
              <div className={styles.buttonsContainer}>
                <Button
                    className={styles.smallButton}
                    inactive={filterTag}
                    onClick={()=>{this.hanldeShowAll()}}
                >
                  Show All My Casts
                </Button>
              </div>
              <div className={styles.buttonsContainer}>
                <input
                    value={filterTag}
                    className={`${styles.input}`}
                    style={{margin: 0}}
                    placeholder="Filter by tag..."
                    onChange={event => {this.handleFilterTag(event)}}
                />
              </div>
              <p></p>
              <div className={styles.basictext}>
                Subscribe to Channel
              </div>
              <input
                  value={subscribedChannel}
                  className={styles.input}
                  placeholder='Enter channel tag (try "OMG")'
                  onChange={event => {this.handleSubscribeChannel(event)}}
              />
              <Button
                  type='primary'
                  className={styles.button}
                  style={{marginTop: 20}}
                  loading={subscribeChannelLoad}
                  disabled={!subscribedChannel || subscribeChannelLoad}
                  onClick={()=>{this.handleSubscribe()}}
              >
                {subscribeButtonText}
              </Button>
            </div>



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
