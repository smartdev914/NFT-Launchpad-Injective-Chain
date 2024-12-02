import { MsgExecuteContract, MsgSend, SimulateResult } from "@delphi-labs/shuttle-react";
import { BigNumberInBase } from "@injectivelabs/utils";
import { 
  chainGrpcWasmApi,
} from '../utils/networks';
import { toBase64, fromBase64 } from "@injectivelabs/sdk-ts";
import { todayInSeconds } from "./utils";
import { BigNumberInWei } from '@injectivelabs/utils';

export const call_collection = async(info: any, time_diff: number) => {
  let collection_config: CollectionConfig = {
    minter:"",
    total_supply: 0,
    max_mint: 10,
    is_mint_active: false,
    native_token:"inj",
    base_url:"",
    logo_url:"",
    mint_wallet: "",
    royalty_wallet: [],
  } 
  let config = await getCollectionConfig(info.contract_address);
  if (config != null) {
    collection_config = {
        minter:config.minter,
        total_supply: config.total_supply,
        max_mint: config.max_mint,
        is_mint_active: config.is_mint_active,
        native_token:config.native_token,
        base_url:config.base_url,
        logo_url:config.logo_url,
        mint_wallet: "",
        royalty_wallet: [],
      }
  }
  
  let active_phase:MintPhaseConfig = {
    mint_type: "",
    mint_name: "",
    price: "1",
    start_time: todayInSeconds(),
    end_time: todayInSeconds(),
  }
  let mintPhaseInfo = await getActiveMintPhase(info.contract_address);
  if (mintPhaseInfo != null) {
    active_phase = {
      mint_type: mintPhaseInfo.mint_type,
      mint_name: mintPhaseInfo.mint_name,
      price: new BigNumberInWei(mintPhaseInfo.price).toBase().toNumber().toString(),
      start_time: mintPhaseInfo.start_time + time_diff,
      end_time: mintPhaseInfo.end_time + time_diff
    }
  }
  
  let collectionInfo: CollectionTotalInfo = {
    address: info.contract_address,
    name: info.name,
    symbol: info.symbol,
    collection_config: collection_config,
    active_phase: active_phase,
  };
  return collectionInfo;
}


export async function getFactoryConfig () : Promise<any> {
  try {
    const response: any = await chainGrpcWasmApi.fetchSmartContractState(
      import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
      toBase64({
        get_config: {}
      })
    )
    if (response) {
      return fromBase64(response.data)
    }
  } catch (error) {
  }
}

export async function getActiveContractAddress () : Promise<any> {
  try {
    const response: any = await chainGrpcWasmApi.fetchSmartContractState(
      import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
      toBase64({
        get_active_collection: {}
      })
    )
    if (response) {
      return fromBase64(response.data)
    }
  } catch (error) {
    return ""
  }
}

export async function getUserWLConfig (contract_address: string, phase_type: string, wallet:any) : Promise<any> {
  if (contract_address != null && wallet && wallet.account){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          w_l_info: {user: wallet.account.address, phase_type: phase_type}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("User WL Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}

export async function getUserFactoryWLConfig (contract_address: string, wallet:any) : Promise<any> {
  if (contract_address != null && wallet && wallet.account){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          w_l_info: {user: wallet.account.address}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("User WL Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}

export async function getCollectionBaseConfig (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          contract_info: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("Contract Base Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}
export async function getCollectionConfig (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          config: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("Contract Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}
export async function getMintedTokens(contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          num_tokens: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("token num", result)
        return result;
      }
    } catch (error) {
    }
  }
}

export async function getUserTokenIds(contract_address: string, wallet: any) : Promise<any> {
  if (contract_address != null && wallet && wallet.account){
    try {
      const tokenArray:any = []
      let start_after:string = '0'
      while (1) {
        const response:any = await chainGrpcWasmApi.fetchSmartContractState(
          contract_address, 
          toBase64({
            tokens: {
              owner: wallet.account.address,
              start_after: start_after,
              limit: 30
            }
          })
        );
        if (response) {
          const result = fromBase64(response.data)
          if (result.tokens.length == 0) break
          result.tokens.forEach((token_id: any) => {
            tokenArray.push(token_id);
            start_after = token_id;
          })
        } else {
          break;
        }
      }
      
      return tokenArray;
    } catch (error) {
    }
  }
}

export async function getAllTokenIds(contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const tokenArray:number[] = []
      let start_after:string = '0'
      while (1) {
        const response:any = await chainGrpcWasmApi.fetchSmartContractState(
          contract_address, 
          toBase64({
            all_tokens: {
              start_after: start_after,
              limit: 30
            }
          })
        );
        if (response) {
          const result = fromBase64(response.data)
          if (result.tokens.length == 0) break
          result.tokens.forEach((token_id: any) => {
            tokenArray.push(Number(token_id));
            start_after = token_id;
          })
        } else {
          break;
        }
      }
      
      return tokenArray;
    } catch (error) {
    }
  }
}

export async function getWalletConfig (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          wallet: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("wallet Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}

export async function getMintPhaseConfig (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          mint_phase: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("Mint Phase Config", result)
        return result;
      }
    } catch (error) {
    }
  }
}

export async function getActiveMintPhase (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try {
      const response: any = await chainGrpcWasmApi.fetchSmartContractState(
        contract_address,
        toBase64({
          active_mint_phase: {}
        })
      )
      if (response) {
        let result = fromBase64(response.data)
        console.log("active_mint_phase_config", result);
        return result;
      }
    } catch (error) {
      console.log("active_mint_phase_config", error);
      return null;
    }
  }
}

export async function getCollectAllWLInfo (contract_address: string, phase_type: string) : Promise<any> {
  if (contract_address != null){
    try{
      const wl_array:WhiteListInfo[] = []
      let start_after:string = '0'
      while (1) {
        const response:any = await chainGrpcWasmApi.fetchSmartContractState(
          contract_address, 
          toBase64({
            all_w_l_info: {
              phase_type: phase_type,
              start_after: start_after,
              limit: 300
            }
          })
        );
        if (response) {
          const result = fromBase64(response.data)
          if (result.users.length == 0) break
          result.users.forEach((wl_info: any) => {
            wl_array.push({address: wl_info.address, limit_time: wl_info.limit_time, 
                max_count: wl_info.max_count, spent_amount: wl_info.spent_amount, phase_type: wl_info.phase_type, price: wl_info.price});
            start_after = wl_info.address
          })
        } else {
          break;
        }
      }
      console.log("get All WLInfo", wl_array)
      return wl_array;
    } catch (error) {
      console.log("get All WLInfo error", error)
    }
  }
}

export async function getFactoryCollectAllWLInfo (contract_address: string) : Promise<any> {
  if (contract_address != null){
    try{
      const wl_array:UIWhiteListInfo[] = []
      let start_after:string = '0'
      while (1) {
        const response:any = await chainGrpcWasmApi.fetchSmartContractState(
          contract_address, 
          toBase64({
            all_w_l_info: {
              start_after: start_after,
              limit: 30
            }
          })
        );
        if (response) {
          const result = fromBase64(response.data)
          if (result.users.length == 0) break
          result.users.forEach((wl_info: any) => {
            wl_array.push({address: wl_info.address, limit_time: wl_info.limit_time, 
                max_count: wl_info.max_count, spent_amount: wl_info.spent_amount, price: '1.5'});
            start_after = wl_info.address
          })
        } else {
          break;
        }
      }
      return wl_array;
    } catch (error) {
      console.log("get All WLInfo error", error)
    }
  }
}

export function writeFactoryConfigMsg(wallet: any, config: Factory_Config) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
    msg: {
      update_config: {
        create_fee: new BigNumberInBase(config.create_fee).toWei().toFixed(),
        enable: config.enable,
        fee_wallet: config.fee_wallet,
        native_token: config.native_token,
        owner_one: config.owner_one,
        owner_two: config.owner_two,
        special_offer_wallet: config.special_offer_wallet,
        wl_limit_time: config.wl_limit_time,
        wl_price: new BigNumberInBase(config.wl_price).toWei().toFixed(),
        max_count_per_wl: Number(config.max_count_per_wl),
      }
    },
  });

  return [msg]
}
export function writeMintActiveMsg(wallet:any, is_active: boolean, contract_address: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      mint_active: {
        is_active: is_active
      }
    },
  });

  return [msg]
}

export function writeActiveCollection(wallet:any, contract_address: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
    msg: {
      active_collection: {
        address: contract_address
      }
    },
  });

  return [msg]
}

export function writeSpecialActiveMsg(wallet:any, is_active: boolean) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
    msg: {
      special_active: {
        is_active: is_active
      }
    },
  });

  return [msg]
}

export function writeCreateCollectionConfigMsg(wallet: any, config:CreateContractConfig, create_fee:number) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
    msg: {
      create_contract: {
        code_id: config.code_id,
        logo_url: config.logo_url,
        minter: config.minter,
        name: config.name,
        symbol: config.symbol
      }
    },
    funds: [
      {
        denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
        amount: new BigNumberInBase(create_fee).toWei().toFixed(),
      }
    ]
  });

  return [msg]
}

export function writeCollectionConfigMsg(wallet: any, config:any, contract_address: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      config: {
        minter:config.minter,
        total_supply: Number(config.total_supply),
        max_mint: Number(config.max_mint),
        native_token: config.native_token,
        base_url: config.base_url,
        logo_url: config.logo_url,
        mint_wallet: config.mint_wallet,
        royalty_wallet: config.royalty_wallet
      }
    },
  });

  return [msg]
}

export function writeMintPhaseConfigMsg(wallet: any, phase:MintPhaseConfig[], contract_address: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      mint_phase: {
        mint_phase: phase
      }
    },
  });

  return [msg]
}
export function writeWhiteListMsg(wallet: any, white_list_info:WhiteListInfo[], contract_address: string) {
  console.log("save_white_list", white_list_info);
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      add_white_list: {
        white_list: white_list_info
      }
    },
  });

  return [msg]
}
export function writeBuyWLConfigMsg(wallet: any, wl_price: number) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
    msg: {
      add_white_list: {}
    },
    funds: [
      {
        denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
        amount: new BigNumberInBase(wl_price).toWei().toFixed(),
      }
    ]
  });

  return [msg]
}

export function writeBatchMsg(contract_address:string, wallet: any, amount:number, owner:string, extensions:any, mint_price: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      batch_mint_all: {
        token_count: Number(amount),
        owner: owner,
        extension: extensions
      }
    },
    funds: [
      {
        denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
        amount: new BigNumberInBase(mint_price).toWei().toFixed(),
      }
    ]
  });

  return [msg]
}

export function writePresaleMsg(wallet: any, owner: string[], token_id: string[], token_uri: string[], extension: any[], contract_address: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      batch_mint: {
        token_id: token_id,
        owner: owner,
        token_uri: token_uri,
        extension: extension
      }
    },
  });

  return [msg]
}

export function writeOneMintMsg(contract_address:string, wallet: any, token_ids:string, owners:string, token_uris:string, extensions:any, mint_price: string) {
  console.log("BatchMsg fee", token_ids, owners, token_uris, extensions, mint_price);
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: contract_address,
    msg: {
      mint: {
        token_id: token_ids,
        owner: owners,
        token_uri: token_uris,
        extension: extensions
      }
    },
    funds: [
      {
        denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
        amount: new BigNumberInBase(mint_price).toWei().toFixed(),
      }
    ]
  });

  return [msg]
}

export function getAirdropMsg(wallet: any, amount: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
    msg: {
      airdrop: {
        airdrop_amount: new BigNumberInBase(amount).toWei().toFixed(),
      }
    },
  });

  return [msg]
}

export function getAirdropRestartMsg(wallet: any) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
    msg: {
      airdrop_restart: {
      }
    },
  });

  return [msg]
}

export function getChargeMsg(wallet: any, amount: string) {
  const msg = new MsgSend({
    fromAddress: wallet.account.address,
    toAddress: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
    amount: [
      {
        denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
        amount: new BigNumberInBase(amount).toWei().toFixed()
      }
    ],
  });

  return [msg]
}
  
export function getClaimMsg(wallet: any, tokenIds: Array<string>) {
  const msgs = new Array<MsgExecuteContract>

  tokenIds.map((nft_id) => {
    const msg = new MsgExecuteContract({
      sender: wallet.account.address,
      contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
      msg: {
        claim: {
          claim_nft_id: nft_id,
        }
      },
    });

    msgs.push(msg)
  })

  return msgs
}

export function getRestakeMsg(wallet: any, tokenId: string) {
  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
    msg: {
      restake: {
        restake_nft_id: tokenId,
      }
    },
  });

  return [msg]
}
export function getStakeMsg(wallet: any, tokenIds: Array<string>) {

  const msgs = new Array<MsgExecuteContract>

  tokenIds.map((nft_id) => {
    const send_msg = {
      stake: {
        sender: wallet.account.address,
        token_id: nft_id
      }
    };

    const msg = new MsgExecuteContract({
      sender: wallet.account.address,
      contract: import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT,
      msg: {
        send_nft: {
          contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
          token_id: nft_id,
          msg: Buffer.from(JSON.stringify(send_msg)).toString('base64'),
        }
      },
    });

    msgs.push(msg)
  })

  return msgs

}
export function getUnstakeMsg(wallet: any, stakedNfts:any, tokenIds: Array<string>, currentTime:any, locktimeFee:any) {
  const msgs = new Array<MsgExecuteContract>

  tokenIds.map((nft_id) => {
    let nftinfo: any = stakedNfts.find((nft: any) => (nft.token_id == nft_id))
    if (!nftinfo) return
    let feeAmount = '0'
    if (nftinfo.lock_time > currentTime && locktimeFee) {
      feeAmount = new BigNumberInBase(locktimeFee).toWei().toFixed()
    }
    const msg = new MsgExecuteContract({
      sender: wallet.account.address,
      contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
      msg: {
        unstake: {
          unstake_nft_id: nft_id,
        }
      },
      funds: [
        {
          denom: import.meta.env.VITE_PUBLIC_DEFAULT_DENOM,
          amount: feeAmount
        }
      ]
    });

    msgs.push(msg)
  })

  return msgs

}
export function getWithdrawMsg(wallet: any, amount: string) {

  const msg = new MsgExecuteContract({
    sender: wallet.account.address,
    contract: import.meta.env.VITE_PUBLIC_STAKING_CONTRACT,
    msg: {
      withdraw: {
        amount: new BigNumberInBase(amount).toWei().toFixed(),
      }
    },
  });

  return [msg]

}

export async function getFeeEstimate(simulate: any, wallet: any, messages: any) {
  if (!messages || messages.length <= 0 || !wallet) {
    return null;
  }

  const response: SimulateResult = await simulate({
    messages,
    wallet,
  });

  return {
    fee: response.fee?.amount[0],
    gasLimit: response.fee?.gas,
  };
}