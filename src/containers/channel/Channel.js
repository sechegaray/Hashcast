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
import moment from 'moment';
import { isEqual, orderBy } from 'lodash';

import { verifyChannelID, getChannelMessage, findChannelWaitingList } from 'actions/hashcastAction';
import { openError } from 'actions/uiAction';
import Pager from 'components/pager/Pager';
import { hashSlice } from 'util/transactionSort';

import logo from 'images/hashcast.svg';

import * as styles from './Channel.module.scss';

const PER_PAGE = 4;

class Channel extends React.Component {
  constructor(props) {
    super(props);
    
    const { 
      channelSummary, 
      verifyChannelError,
      channelMessageWaitingList,
      currentchannelMessageHashID,
      channelMessage,
      channelMessageLoad,
    } = this.props.hashcast;

    this.state = {
      page: 1,
      channelID: null,
      channelSummary,
      verifyChannelError,
      channelMessageWaitingList,
      currentchannelMessageHashID,
      channelMessage,
      channelMessageLoad,
      autoRefesh: 60,
    }
  }

  componentDidMount() {
    let url = window.location.href;
    let urlSplitted = url.split("/");
    const channelID = urlSplitted[urlSplitted.length - 1];
    this.props.dispatch(verifyChannelID(channelID));
    setInterval(() => { 
      console.log("Scan the channel!");
      this.props.dispatch(verifyChannelID(channelID));
      this.setState({ autoRefesh: 60 });
    }, 60 * 1000);
    
    setInterval(() => { 
      this.setState({ autoRefesh: this.state.autoRefesh - 1 });
    }, 1000);

    this.setState({ channelID });
  }

  componentDidUpdate(prevState) {
    const { 
      channelSummary, 
      verifyChannelError,
      channelMessageWaitingList,
      currentchannelMessageHashID,
      channelMessage,
      channelMessageLoad,
    } = this.props.hashcast;

    if (prevState.hashcast.channelSummary !== channelSummary) {
      this.setState({ channelSummary });
    }

    if (prevState.hashcast.verifyChannelError !== verifyChannelError) {
      this.setState({ verifyChannelError });

      if (verifyChannelError === 404) {
        this.props.history.push("/");
        this.props.dispatch(openError("Invalid channel ID!"));
      }

      if (verifyChannelError === false) {
        const sortedChannelItems = orderBy(channelSummary.channelItems, 'timestamp', 'desc');
        const channelMessageWaitingListTemp = this.props.dispatch(findChannelWaitingList(
          sortedChannelItems.reduce((acc, cur) =>{ acc.push(cur.hashID); return acc; },[]),
          channelMessageLoad,
          channelMessageWaitingList,
        ));

        // start to get hashcast message
        if ((currentchannelMessageHashID === null && channelMessageWaitingListTemp.length) ||
          channelMessageWaitingListTemp.length === 1) {
          this.props.dispatch(getChannelMessage(
            channelMessageWaitingListTemp[0].hashID,
            channelMessageWaitingListTemp,
          ));
        }
      }
    }

    if (!isEqual(prevState.hashcast.channelMessageLoad, channelMessageLoad)) {
      this.setState({ channelMessageLoad });

      if (prevState.hashcast.channelMessageLoad[currentchannelMessageHashID] !== 
        channelMessageLoad[currentchannelMessageHashID] &&
        channelMessageLoad[currentchannelMessageHashID] === false &&
        channelMessageWaitingList.length
      ) {
        this.props.dispatch(getChannelMessage(
          channelMessageWaitingList[0].hashID,
          channelMessageWaitingList,
        ));
      }
    }

    if (!isEqual(channelMessageWaitingList, channelMessageWaitingList)) {
      this.setState({ channelMessageWaitingList });
    }

    if (prevState.hashcast.currentchannelMessageHashID !== currentchannelMessageHashID) {
      this.setState({ currentchannelMessageHashID });
    }

    if (!isEqual(prevState.hashcast.channelMessage, channelMessage)) {
      this.setState({ channelMessage });
    }
  }

  render() {
    const { 
      page,
      verifyChannelError, 
      channelID, 
      channelSummary, 
      channelMessage,
      autoRefesh,
    } = this.state;

    let sortedChannelItems = [];
    if (channelSummary.channelItems) {
      sortedChannelItems = orderBy(channelSummary.channelItems, 'timestamp', 'desc');
    }

    const paginatedHashcasts = hashSlice(page, PER_PAGE, sortedChannelItems);

    //needed for the total number of pages so we can display Page X of Y
    let totalNumberOfPages = Math.ceil(sortedChannelItems.length / PER_PAGE);

    //if totalNumberOfPages === 0, set to one so we don't get the "Page 1 of 0" display glitch
    if (totalNumberOfPages === 0) totalNumberOfPages = 1;

    if (verifyChannelError === null) {
      return (
        <div className={styles.channelContainerCenter}>
          <div className={styles["lds-grid"]}><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        </div>
      )
    }

    if (verifyChannelError === false) {
      return (
        <div className={styles.channelContainer}>
          <div className={styles.varnaLogoContainer} >
            <img src={logo} className={styles.varnaLogo} alt="" onClick={()=>{this.props.history.push("/")}}/>
          </div>

          <div>
            <h2>Channel: {channelSummary.channelName}</h2>
            <h2>Channel ID: {channelID}</h2>
            <h2>Last updated: {moment.unix(channelSummary.lastUpdated / 1000).format('lll')}</h2>
            <h2>Auto refresh in {autoRefesh} seconds</h2>
          </div>

          <Pager
            currentPage={page}
            totalPages={totalNumberOfPages}
            isLastPage={paginatedHashcasts.length < PER_PAGE}
            onClickNext={()=>this.setState({page:page+1})}
            onClickBack={()=>this.setState({page:page-1})}
          />

          {sortedChannelItems.map((v,i) => {
            return (
              <div className={styles.channelItemContainer} key={i}>
                <div className={styles.line}>
                  Hash ID: {v.hashID}
                </div>
                <div className={styles.line}>
                  Directory: {v.directory}
                </div>
                <div className={styles.line}>
                  Time: {moment(v.timestamp).format('lll')}
                </div>
                {channelMessage[v.hashID] && 
                  ((channelMessage[v.hashID].includes("data:image") &&
                  channelMessage[v.hashID].includes("base64")) ?
                    <>
                      <div className={styles.line}> Image:</div>
                      <img 
                        src={channelMessage[v.hashID]}
                        alt="hashcast"
                        style={{width: '100%', maxWidth: 500}}
                      />
                    </>:
                    <div className={styles.line}>Message:{" "}
                      {channelMessage[v.hashID].length > 100 ? 
                        `${channelMessage[v.hashID].slice(0, 100)}...` :
                        `${channelMessage[v.hashID]}`
                      }
                    </div>
                  )
                }
              </div>
            )
          })}
        </div>
      )
    }
  }
}


const mapStateToProps = state => ({ 
  hashcast: state.hashcast,
});

export default connect(mapStateToProps)(Channel);