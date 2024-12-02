import { create } from 'zustand'
import { persist } from "zustand/middleware";

import { BigNumberInWei } from '@injectivelabs/utils';

import { 
  chainGrpcBankApi,
} from '../utils/networks';


interface AccountState {
  address: string
  balance: string
  tokenUris: Array<any>
  setAddress: Function
  setBalance: Function
  fetchBalance: Function
}

export const useAccountStore = create<AccountState>() (
  persist(
    (set, get) => ({
      address: '',
      balance: '0',
      tokenUris: [],
      setAddress: (address: string) => {
        set({address: address})
      },
      setBalance: (balance: string) => {
        set({balance: balance})
      },
      fetchBalance: async () => {
        try {
          const balance = await chainGrpcBankApi.fetchBalance({
            accountAddress: get().address, 
            denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM
          })
          set({balance:( new BigNumberInWei(balance.amount).toBase().toFixed(2))})
        } catch (error) {
          console.log("fetch balance failed...", error)
        }
      },
    }),
    {
      name: "account-state"
    }
  )
)
