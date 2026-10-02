/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserAccount, RackData, ProductItem, ActivityLog } from '../types';
import { WarehouseDashboardSummary } from './WarehouseDashboardSummary';

interface MainMenuHubProps {
  currentUser: UserAccount;
  racks: Record<string, RackData>;
  products: ProductItem[];
  logs: ActivityLog[];
  onSelectMenu: (menuId: 'dashboard' | 'in-warehouse' | 'out-warehouse', subTab?: string) => void;
  onOpenScannerPutaway: () => void;
  onOpenScannerPicking: () => void;
  onOpenRackQrPrint: () => void;
  onSelectRackVisual?: (rackId: string) => void;
  activeRackId?: string;
  onSlotClick?: (slot: any) => void;
  onOpenScannerForSlot?: (slotCode: string) => void;
}

export const MainMenuHub: React.FC<MainMenuHubProps> = ({
  currentUser,
  racks,
  products,
  logs,
  onSelectMenu,
  onOpenScannerPutaway,
  onOpenScannerPicking,
  onOpenRackQrPrint,
  onSelectRackVisual,
  activeRackId = 'A',
  onSlotClick,
  onOpenScannerForSlot
}) => {
  const [selectedRack, setSelectedRack] = React.useState(activeRackId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto py-2">
      {/* DASHBOARD UTAMA GUDANG (STATISTIK SESUAI INSTRUKSI SPESIFIK USER) */}
      <WarehouseDashboardSummary
        racks={racks}
        activeRackId={selectedRack}
        onSelectRackId={(rackId) => {
          setSelectedRack(rackId);
          if (onSelectRackVisual) onSelectRackVisual(rackId);
        }}
        onSlotClick={onSlotClick}
        onOpenScannerForSlot={onOpenScannerForSlot}
        userRole={currentUser.role}
      />
    </div>
  );
};
