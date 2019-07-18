// @flow

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import Button from './Button';
import { useModalDismissSignal } from './hooks';

import styles from './ModalDialog.css';

type DIALOG_ACTION_HIDE = {|
  type: 'HIDE',
|};
type DIALOG_ACTION_SHOW = {|
  type: 'SHOW',
  canBeDismissed?: boolean,
  content: React$Node,
  title?: React$Node | null,
|};

type Action = DIALOG_ACTION_HIDE | DIALOG_ACTION_SHOW;

type Dispatch = (action: Action) => void;

type State = {|
  canBeDismissed: boolean,
  content: React$Node | null,
  isVisible: boolean,
  title: React$Node | null,
|};

type ModalDialogContextType = {|
  ...State,
  dispatch: Dispatch,
|};

const ModalDialogContext = createContext<ModalDialogContextType>(
  ((null: any): ModalDialogContextType)
);
ModalDialogContext.displayName = 'ModalDialogContext';

function dialogReducer(state, action) {
  switch (action.type) {
    case 'HIDE':
      return {
        canBeDismissed: true,
        content: null,
        isVisible: false,
        title: null,
      };
    case 'SHOW':
      return {
        canBeDismissed: action.canBeDismissed !== false,
        content: action.content,
        isVisible: true,
        title: action.title || null,
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

type Props = {|
  children: React$Node,
|};

function ModalDialogContextController({ children }: Props) {
  const [state, dispatch] = useReducer<State, Action>(dialogReducer, {
    canBeDismissed: true,
    content: null,
    isVisible: false,
    title: null,
  });

  const value = useMemo<ModalDialogContextType>(
    () => ({
      canBeDismissed: state.canBeDismissed,
      content: state.content,
      isVisible: state.isVisible,
      title: state.title,
      dispatch,
    }),
    [state, dispatch]
  );

  return (
    <ModalDialogContext.Provider value={value}>
      {children}
    </ModalDialogContext.Provider>
  );
}

function ModalDialog(_: {||}) {
  const { isVisible } = useContext(ModalDialogContext);
  return isVisible ? <ModalDialogImpl /> : null;
}

function ModalDialogImpl(_: {||}) {
  const { canBeDismissed, content, dispatch, title } = useContext(
    ModalDialogContext
  );
  const dismissModal = useCallback(() => {
    if (canBeDismissed) {
      dispatch({ type: 'HIDE' });
    }
  }, [canBeDismissed, dispatch]);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useModalDismissSignal(modalRef, dismissModal);

  return (
    <div className={styles.Background}>
      <div className={styles.Dialog} ref={modalRef}>
        {title !== null && <div className={styles.Title}>{title}</div>}
        {content}
        {canBeDismissed && (
          <div className={styles.Buttons}>
            <Button autoFocus onClick={dismissModal}>
              Okay
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { ModalDialog, ModalDialogContext, ModalDialogContextController };
