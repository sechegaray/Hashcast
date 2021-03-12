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
            <div className={styles.lineHC}>Block: {data.blockNum} ID: {data.hcID.slice(0, 13)}</div>
            <div className={styles.lineHC}>{moment.unix(data.time).format('lll')} Tag: {data.tag ? data.tag : 'Null' }</div>
            {data.hashcastMessage[data.msg] && 
              ((data.hashcastMessage[data.msg].includes("data:image") &&
                data.hashcastMessage[data.msg].includes("base64")) ?
                <>
                  <div className={styles.lineHC}> Image:</div>
                  <img 
                    src={data.hashcastMessage[data.msg]}
                    alt="hashcast"
                    style={{width: '100%', maxWidth: 500}}
                  />
                </>:
                <div className={styles.lineHC}>Message:{" "}
                  {data.hashcastMessage[data.msg].length > 100 ? 
                    `${data.hashcastMessage[data.msg].slice(0, 100)}...` :
                    `${data.hashcastMessage[data.msg]}`
                  }
                </div>
              )
            }
          </div>
        </div>

      </div>
    )
  }
}

const mapStateToProps = state => ({ 
  hashcast: state.hashcast,
});

export default connect(mapStateToProps)(HashcastHistoryBox);