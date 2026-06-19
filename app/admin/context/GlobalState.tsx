import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalState {
  cart: any[];
  setCart: (c: any[]) => void;
  customerName: string;
  setCustomerName: (n: string) => void;
  customerPhone: string;
  setCustomerPhone: (p: string) => void;
  discountCode: string;
  setDiscountCode: (c: string) => void;
  appliedDiscount: number;
  setAppliedDiscount: (d: number) => void;
  targetTable: string;
  setTargetTable: (t: string) => void;
  paymentMethod: string | null;
  setPaymentMethod: (m: string | null) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [targetTable, setTargetTable] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  return (
    <GlobalStateContext.Provider
      value={{
        cart,
        setCart,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        discountCode,
        setDiscountCode,
        appliedDiscount,
        setAppliedDiscount,
        targetTable,
        setTargetTable,
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return ctx;
};

// Dummy default export to satisfy Expo Router
export default function GlobalStateRoute() { return null; }
