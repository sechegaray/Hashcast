import React from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { isEqual } from 'lodash';

// import Button from 'components/button/Button';
import { hashpullGetUrl } from 'actions/hashcastAction';

import * as styles from './HistoryBox.module.scss';

class HashcastHistoryBox extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      data: this.props.data,
    }
  }

  componentDidUpdate(prevState) {

    const { data } = this.props;

    if (!isEqual(prevState.data, data)) {
      this.setState({ data });
    }

  }

  handleHashPull() {
    const { data } = this.state;
    this.props.dispatch(hashpullGetUrl(data.msg));
  }

  render() {

    const { 
      data, 
    } = this.state;

    return (
      <div className={styles.container}>

        <div className={styles.topInfoContainer}>

          {/* Left part */}
          <div className={styles.topLeftContainerHC}>
            <div className={styles.lineHC}>Hashcast: {data.msg}</div>
            <div className={styles.lineHC}>ID: {data.hcID.slice(0, 13)}</div>
            <div className={styles.lineHC}>Block: {data.blockNum}</div>
            <div className={styles.lineHC}>Tag: {data.tag ? data.tag : 'Null' }</div>
            <div className={styles.lineHC}>{moment.unix(data.time).format('lll')}</div>
            {data.hashcastMessage[data.msg] && 
              <div className={styles.lineHC}>Message:{" "}
                {data.hashcastMessage[data.msg].length > 100 ? 
                  `${data.hashcastMessage[data.msg].slice(0, 100)}...` :
                  `${data.hashcastMessage[data.msg]}`
                }
              </div>
            }
          </div>

          {/* Right part
          {
            <div className={styles.topRightContainerHC}>
              <div className={styles.buttonContainer}>
                <Button 
                  type='primary'
                  size='tiny'
                  className={styles.button}
                  onClick={()=>{this.handleHashPull()}}
                  disabled={data.hashpullGetUrlLoad[data.msg]}
                >
                  Pull
                </Button>
              </div>
            </div>
          } */}
        </div>

      </div>
    )
  }
}

const mapStateToProps = state => ({ 
  hashcast: state.hashcast,
});

export default connect(mapStateToProps)(HashcastHistoryBox);