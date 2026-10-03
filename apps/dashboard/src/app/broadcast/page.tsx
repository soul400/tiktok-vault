'use client';

import React from 'react';
import { BroadcastHUD } from '../../components/broadcast/BroadcastHUD';

export default function BroadcastPage() {
  return (
    <main className="w-full min-h-screen bg-[#070A12] text-white">
      <BroadcastHUD />
    </main>
  );
}
