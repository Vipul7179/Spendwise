'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { trackEvent, trackOnboardingStarted } from '@/lib/analytics';

type ModalType = 'quickAdd' | 'name' | 'account' | 'coffee' | null;

interface ModalContextType {
  activeModal: ModalType;
  modalProps?: any;
  openQuickAdd: () => void;
  openName: (first?: boolean) => void;
  openAccount: () => void;
  openCoffee: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalProps, setModalProps] = useState<any>(null);

  const openQuickAdd = useCallback(() => {
    trackEvent('feature_opened', { feature_name: 'expenses', action_source: 'quick_add' });
    setActiveModal('quickAdd');
    setModalProps(null);
  }, []);

  const openName = useCallback((first: boolean = false) => {
    if (first) trackOnboardingStarted();
    setActiveModal('name');
    setModalProps({ first });
  }, []);

  const openAccount = useCallback(() => {
    setActiveModal('account');
    setModalProps(null);
  }, []);

  const openCoffee = useCallback(() => {
    setActiveModal('coffee');
    setModalProps(null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalProps(null);
  }, []);

  return (
    <ModalContext.Provider
      value={{
        activeModal,
        modalProps,
        openQuickAdd,
        openName,
        openAccount,
        openCoffee,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

