// @flow

import React, { Fragment, useContext, useEffect } from 'react';
import { BridgeContext } from './context';
import { ModalDialogContext } from './ModalDialog';

import styles from './WarnIfLegacyBackendDetected.css';

export default function WarnIfLegacyBackendDetected(_: {||}) {
  const bridge = useContext(BridgeContext);
  const { dispatch } = useContext(ModalDialogContext);

  // Detect pairing with legacy v3 backend.
  // We do this by listening to a message that it broadcasts but the v4 backend doesn't.
  // In this case the frontend should show upgrade instructions.
  useEffect(() => {
    // Wall.listen returns a cleanup function
    let unlisten = bridge.wall.listen(event => {
      switch (event.type) {
        case 'call':
        case 'event':
        case 'many-events':
          // Any of these types indicate the v3 backend.
          dispatch({
            canBeDismissed: false,
            type: 'SHOW',
            title:
              'React DevTools v4 is incompatible with this version of React',
            content: <InvalidBackendDetected />,
          });

          if (typeof unlisten === 'function') {
            unlisten();
            unlisten = null;
          }
          break;
        default:
          break;
      }
    });

    return () => {
      if (typeof unlisten === 'function') {
        unlisten();
        unlisten = null;
      }
    };
  }, [bridge, dispatch]);

  return null;
}

function InvalidBackendDetected(_: {||}) {
  return (
    <Fragment>
      <p>Either upgrade React or install React DevTools v3:</p>
      <code className={styles.Command}>npm install -d react-devtools@^3</code>
    </Fragment>
  );
}
