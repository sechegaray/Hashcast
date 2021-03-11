import React from 'react';

import logo_small from 'images/enya.svg';

import Hamburger from 'components/hamburger/Hamburger';
import * as styles from './MobileHeader.module.scss';

function MobileHeader ({ mobileMenuOpen, onHamburgerClick }) {
  return (
    <div className={styles.MobileHeader}>
      <img className={styles.logo} src={logo_small} alt='enya' />
      <Hamburger
        hamburgerClick={onHamburgerClick}
        isOpen={mobileMenuOpen}
      />
    </div>
  );
}

export default MobileHeader;
