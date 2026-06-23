import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../../utils/api';

// Types (replace any with proper interfaces as needed)
export type MenuItem = any;
export type StaffMember = any;
export type Customer = any;
export type Transaction = any;
export type Message = any;

type AppDataContextProps = {
  menuItems: MenuItem[];
  staffMembers: StaffMember[];
  customers: Customer[];
  transactions: Transaction[];
  messages: Message[];
  refreshMenu: () => Promise<void>;
  refreshStaff: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshMessages: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextProps | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const refreshMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenuItems(res.data);
    } catch (e) {

    }
  };

  const refreshStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaffMembers(res.data);
    } catch (e) {

    }
  };

  const refreshCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (e) {

    }
  };

  const refreshTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (e) {

    }
  };

  const refreshMessages = async () => {
    try {
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (e) {

    }
  };

  // Initial load
  useEffect(() => {
    refreshMenu();
    refreshStaff();
    refreshCustomers();
    refreshTransactions();
    refreshMessages();
  }, []);

  const value: AppDataContextProps = {
    menuItems,
    staffMembers,
    customers,
    transactions,
    messages,
    refreshMenu,
    refreshStaff,
    refreshCustomers,
    refreshTransactions,
    refreshMessages,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

// Convenience hooks
export const useMenu = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useMenu must be used within AppDataProvider');
  return { menuItems: ctx.menuItems, refreshMenu: ctx.refreshMenu };
};
export const useStaff = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useStaff must be used within AppDataProvider');
  return { staffMembers: ctx.staffMembers, refreshStaff: ctx.refreshStaff };
};
export const useCustomers = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useCustomers must be used within AppDataProvider');
  return { customers: ctx.customers, refreshCustomers: ctx.refreshCustomers };
};
export const useTransactions = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useTransactions must be used within AppDataProvider');
  return { transactions: ctx.transactions, refreshTransactions: ctx.refreshTransactions };
};
export const useMessages = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useMessages must be used within AppDataProvider');
  return { messages: ctx.messages, refreshMessages: ctx.refreshMessages };
};

// Dummy default export to satisfy Expo Router
export default function AppDataContextRoute() { return null; }
