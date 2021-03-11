import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { isEqual } from 'lodash';
import * as styles from './AutoComplete.module.scss';

class AutoComplete extends React.Component {

  constructor(props) {

    super(props);

    this.state = {
      placeholder: this.props.placeholder || '',
      tokenList: this.props.tokenList || '',
      selectedToken: '',
    }

  }

  componentDidUpdate(prevState) {
    if (!isEqual(prevState.tokenList, this.props.tokenList)) {
      this.setState({ tokenList: this.props.tokenList });
    }
  }

  handleUpdateValue(v) {
    this.props.updateValue(v.target.innerText);
    this.setState({ selectedToken: v.target.innerText });
  }

  render() {

    const { 
      placeholder,
      tokenList,
      selectedToken,
    } = this.state;

    const options = [];
    Object.values(tokenList).forEach(val => {
      options.push(val);
    })

    return (
     <Autocomplete
        options={options}
        inputValue={selectedToken}
        getOptionLabel={(option) => option.symbol}
        //getOptionSelected={(option, value) => option === value}
        onChange={e=>this.handleUpdateValue(e)}
        renderInput={(params) => (
          <div ref={params.InputProps.ref}>
            <input 
              className={styles.autoCompleteContainer} 
              placeholder={placeholder}
              type="text" 
              {...params.inputProps}
            />
          </div>
        )}
      />
    )
  }
}

export default AutoComplete;