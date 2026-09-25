/**
 * src/context/AlertContext.js
 *
 * Provides a global alert system to display custom popups instead of native Alert.alert.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlertModal from '../components/CustomAlertModal';

const AlertContext = createContext({
  showAlert:   () => {},
  showSuccess: () => {},
  showError:   () => {},
  showWarning: () => {},
  showConfirm: () => {},
  hideAlert:   () => {},
});

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title:   '',
    message: '',
    type:    'info',
    buttons: [],
  });

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(({ title, message, type = 'info', buttons = [] }) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons,
    });
  }, []);

  const showSuccess = useCallback((title, message, onConfirm) => {
    showAlert({
      title,
      message,
      type: 'success',
      buttons: [
        {
          text: 'OK',
          onPress: () => {
            if (onConfirm) onConfirm();
          },
        },
      ],
    });
  }, [showAlert]);

  const showError = useCallback((title, message) => {
    showAlert({
      title: title || 'Error',
      message: typeof message === 'string' ? message : message?.message || 'Something went wrong.',
      type: 'error',
      buttons: [{ text: 'Dismiss', style: 'cancel' }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title, message) => {
    showAlert({
      title: title || 'Warning',
      message,
      type: 'warning',
      buttons: [{ text: 'OK' }],
    });
  }, [showAlert]);

  const showConfirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) => {
    showAlert({
      title,
      message,
      type: 'confirm',
      buttons: [
        {
          text: cancelText,
          style: 'cancel',
          onPress: () => { if (onCancel) onCancel(); },
        },
        {
          text: confirmText,
          primary: true,
          onPress: () => { if (onConfirm) onConfirm(); },
        },
      ],
    });
  }, [showAlert]);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showConfirm,
        hideAlert,
      }}>
      {children}
      <CustomAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
