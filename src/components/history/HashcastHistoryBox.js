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
            <div className={styles.dateLine}>
              <div className={styles.lineHC}>{moment.unix(data.time).format('lll')}</div>
            </div>


            {data.hashcastMessage[data.msg] && 
              ((data.hashcastMessage[data.msg].includes("data:image") &&
                data.hashcastMessage[data.msg].includes("base64")) ?
                <>
                  <img 
                    src={data.hashcastMessage[data.msg]}
                    alt="hashcast"
                    style={{width: '100%', maxWidth: 500}}
                  />
                </>:
                <div className={styles.lineHC}>
                  {data.hashcastMessage[data.msg].length > 100 ? 
                    `${data.hashcastMessage[data.msg].slice(0, 100)}...` :
                    `${data.hashcastMessage[data.msg].slice(1,-1)}`
                  }
                </div>
              )
            }
            {data.tag &&
            <div className={styles.tag}>
              <div className={styles.taglineHC}>
                Tag: {data.tag ? data.tag : 'Null'}
              </div>
            </div>
            }

          </div>
        </div>
        <div className={styles.infobox}>
          <div className={styles.statusLine}><span className={styles.statusTitle}>Hashcast:</span> <span className={styles.statusDesc}>{data.msg}</span></div>
          <div className={styles.statusLine}><span className={styles.statusTitle}>Block:</span> <span className={styles.statusDesc}>{data.blockNum}</span></div>
          <div className={styles.statusLine}><span className={styles.statusTitle}>ID:</span> <span className={styles.statusDesc}>{data.hcID.slice(0, 13)}</span></div>
        </div>

      </div>
    )
  }
}

const mapStateToProps = state => ({ 
  hashcast: state.hashcast,
});

export default connect(mapStateToProps)(HashcastHistoryBox);
