import { create } from 'zustand'
import { persist } from "zustand/middleware";

import { toBase64, fromBase64 } from "@injectivelabs/sdk-ts";

import { 
  chainGrpcWasmApi,
} from '../utils/networks';
import { todayInSeconds } from '../utils/utils';
import { call_collection, getFactoryConfig } from '../utils/messages';
import { BigNumberInWei } from '@injectivelabs/utils';

interface AppState {
  is_admin: boolean
  loading: boolean
  time_diff: number
  refresh: boolean
  menu: boolean
  allCollections: Array<any>
  factory_info: Factory_Config
  allCollectionInfos: Map<string, CollectionTotalInfo>
  is_special_offer_active: boolean
  fetchAdmin: Function
  fetchAllCollections: Function
  setLoading: Function
  setRefresh: Function
  setMenu: Function
}

export const useAppStore = create<AppState>() (
  persist(
    (set, get) => ({
      is_admin: false,
      loading: false,
      time_diff: 0,
      refresh: false,
      menu: true,
      allCollections: [],
      factory_info: {
        owner_one: "",
        owner_two: "",
        enable: true,
        fee_wallet: "",
        create_fee: 1,
        native_token: "inj",
        special_offer_wallet: [],
        wl_limit_time: 0,
        wl_price: 1,
        max_count_per_wl: 0,
      },
      allCollectionInfos: new Map<string, CollectionTotalInfo>(),
      is_special_offer_active: false,
      fetchAdmin: async (address: string) => {
        try {
          const response:any = await chainGrpcWasmApi.fetchSmartContractState(
            import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
            toBase64({ 
              is_owner: {
                address: address
              } 
            })
          )
          if (response) {
            const result = fromBase64(response.data)
            set({
              is_admin: result.is_owner,
              time_diff: todayInSeconds() - result.block_time,
            });
          }
        }catch (error) {
          console.log(false, `Get Config error : ${error}`)
        }
      },
      
      fetchAllCollections: async () => {
        try{
          set({loading: true});
          const collectionArray:any = []
          let start_after:string = '0'
          while (1) {
            const response:any = await chainGrpcWasmApi.fetchSmartContractState(
              import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT, 
              toBase64({
                get_all_collection: {
                  start_after: start_after,
                  limit: 30
                }
              })
            );
            if (response) {
              const result = fromBase64(response.data)
              if (result.contracts.length == 0) break
              result.contracts.forEach((contract_info: any) => {
                collectionArray.push({contract_address: contract_info.address, minter: contract_info.minter, 
                        logo_url: contract_info.logo_url, name: contract_info.name, symbol: contract_info.symbol});
                start_after = contract_info.address
              })
            } else {
              break;
            }
          }
          set({allCollections: collectionArray})
          let factoryConfig:Factory_Config = {
            owner_one: "",
            owner_two: "",
            enable: true,
            fee_wallet: "",
            create_fee: 1,
            native_token: "inj",
            special_offer_wallet: [],
            wl_limit_time: 0,
            wl_price: 1,
            max_count_per_wl: 0,
          }
          let app_config = await getFactoryConfig();
          let is_special_offer_active = false;
          if (app_config != null) {
            factoryConfig = {
              owner_one: app_config.owner_one,
              owner_two: app_config.owner_two,
              enable: app_config.enabled,
              fee_wallet: app_config.fee_wallet,
              create_fee: new BigNumberInWei(app_config.create_fee).toBase().toNumber(),
              native_token: app_config.native_token,
              special_offer_wallet: app_config.special_offer_wallet,
              wl_limit_time: app_config.wl_limit_time,
              wl_price: new BigNumberInWei(app_config.wl_price).toBase().toNumber(),
              max_count_per_wl: app_config.max_count_per_wl,
            }
            is_special_offer_active = app_config.is_special_offer_active;
          }
          console.log("factory config", factoryConfig);
          set({is_special_offer_active: is_special_offer_active, factory_info: factoryConfig})
          let collection_infos = new Map<string, CollectionTotalInfo>();
         
          Promise.all(collectionArray.map((info: any) => call_collection(info, get().time_diff)))
            .then((data: any) => {    
              for (let info of data) {
                console.log("allCollectionInfos_____data", info);
                collection_infos.set(info.address, info);
              }
              set({allCollectionInfos: collection_infos});
            })
          // set({allCollectionInfos: allCollection_infos})
          set({loading: false})
        } catch (error) {
          set({allCollections: []})
          set({loading: false})
          console.log("get All Contracts error", error)
        }
      },
      
      setLoading: (isLoading: boolean) => {
        set({loading: isLoading})
      },
      setRefresh: () => {
        let is_refresh = get().refresh;
        set({refresh: !is_refresh})
      },
      setMenu: () => {
        let is_menu = get().menu;
        set({menu: !is_menu})
      }
    }),
    {
      name: "app-state"
    }
  )
)