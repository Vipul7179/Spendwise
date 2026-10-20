'use client';

import React from 'react';
import { useModal } from '@/context/ModalContext';
import QuickAddModal from './QuickAddModal';
import NameModal from './NameModal';
import AccountModal from './AccountModal';
import CoffeeModal from './CoffeeModal';

export default function ModalHost() {
  const { activeModal, modalProps } = useModal();

  if (!activeModal) return null;

  switch (activeModal) {
    case 'quickAdd':
      return <QuickAddModal />;
    case 'name':
      return <NameModal first={modalProps?.first} />;
    case 'account':
      return <AccountModal />;
    case 'coffee':
      return <CoffeeModal />;
    default:
      return null;
  }
}

