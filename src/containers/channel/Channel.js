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

import { verifyChannelID } from 'actions/hashcastAction';
import { openError } from 'actions/uiAction';
import Button from 'components/button/Button';

import logo from 'images/hashcast.svg';

import * as styles from './Channel.module.scss';

class Channel extends React.Component {
  constructor(props) {
    super(props);
    
    const { channelSummary, verifyChannelError } = this.props.hashcast;

    this.state = {
      channelID: null,
      channelSummary,
      verifyChannelError,
    }
  }

  componentDidMount() {
    let url = window.location.href;
    let urlSplitted = url.split("/");
    const channelID = urlSplitted[urlSplitted.length - 1];
    this.props.dispatch(verifyChannelID(channelID));
    this.setState({ channelID });
  }

  componentDidUpdate(prevState) {
    const { channelSummary, verifyChannelError } = this.props.hashcast;

    if (prevState.hashcast.channelSummary !== channelSummary) {
      this.setState({ channelSummary });
    }

    if (prevState.hashcast.verifyChannelError !== verifyChannelError) {
      this.setState({ verifyChannelError });

      if (verifyChannelError === 404) {
        this.props.history.push("/");
        this.props.dispatch(openError("Invalid channel ID!"));
      }
    }
  }

  handleRefresh() {
    const { channelID } = this.state;
    this.props.dispatch(verifyChannelID(channelID));
  }

  render() {
    const { verifyChannelError, channelID, channelSummary } = this.state;
    console.log(channelSummary);
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
            <div style={{display: 'inline-block', verticalAlign: 'top'}}>
              <h2>Channel: {channelSummary.channelName}</h2>
              <h2>Channel ID: {channelID}</h2>
              <h2>Last updated: {moment.unix(channelSummary.lastUpdated / 1000).format('lll')}</h2>
            </div>
            <div style={{display: 'inline-block', verticalAlign: 'top', float: 'right'}}>
              <Button className={styles.smallButton} onClick={()=>{this.handleRefresh()}}>Refresh</Button>
            </div>
          </div>

          {channelSummary.channelItems.map((v,i) => {
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