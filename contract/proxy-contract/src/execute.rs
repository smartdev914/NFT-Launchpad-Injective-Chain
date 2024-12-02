use serde::de::DeserializeOwned;
use serde::Serialize;


use cosmwasm_std::{Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Addr, Uint128, CosmosMsg, 
    BankMsg, WasmMsg, Coin, Order, to_binary, QuerierWrapper, BalanceResponse as NativeBalanceResponse, QueryRequest,
    WasmQuery, BankQuery,};

use cw2::set_contract_version;
use cw721::{ContractInfoResponse, CustomMsg, Cw721Execute, Cw721ReceiveMsg, Expiration};

use cw_utils::must_pay;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, MintMsg, BatchMintMsg, MintMsgAll};
use crate::state::{Approval, Cw721Contract, TokenInfo, MintPhase, Config, Wallet, WhiteListInfo, Royalty, UpgradableInfo, UpgradablePhase};

use cw20::{Denom, Cw20ExecuteMsg, BalanceResponse as CW20BalanceResponse, Cw20QueryMsg};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:cw721-base";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
const ONLYOWNER:bool = false;
const MAX_ROYALTY_OFFER:u32 = 2;

impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    pub fn instantiate(
        &self,
        deps: DepsMut,
        _env: Env,
        _info: MessageInfo,
        msg: InstantiateMsg,
    ) -> StdResult<Response<C>> {
        set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

        let info = ContractInfoResponse {
            name: msg.name,
            symbol: msg.symbol,
        };
        self.contract_info.save(deps.storage, &info)?;
        let minter = deps.api.addr_validate(&msg.minter)?;
        self.minter.save(deps.storage, &minter)?;

        let config = Config {
            total_supply: 0,
            is_mint_active: false,
            native_token: "inj".to_owned(),
            base_url: "".to_owned(),
            logo_url: "".to_owned(),
            mint_phase_count: 0,
            wl_count: 0,
            max_mint: 10,
        };
        self.config.save(deps.storage, &config)?;

        let wallet = Wallet {
            mint_wallet: minter.clone(),
            royalty_wallet: Vec::new(),
        };
        self.wallet.save(deps.storage, &wallet)?;
        Ok(Response::default())
    }

    pub fn execute(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        msg: ExecuteMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        match msg {
            ExecuteMsg::ChangeMinter{new_minter} => {
                self.change_minter(deps, info, new_minter)
            },
            // ExecuteMsg::Edit(msg) => self.edit(deps, env, info, msg),
            ExecuteMsg::Mint(msg) => self.mint(deps, env, info, msg),
            ExecuteMsg::BatchMint(msg) => self.batch_mint(deps, env, info, msg),
            ExecuteMsg::BatchMintAll(msg) => self.batch_mint_all(deps, env, info, msg),
            ExecuteMsg::Approve {
                spender,
                token_id,
                expires,
            } => self.approve(deps, env, info, spender, token_id, expires),
            ExecuteMsg::Revoke { spender, token_id } => {
                self.revoke(deps, env, info, spender, token_id)
            }
            ExecuteMsg::ApproveAll { operator, expires } => {
                self.approve_all(deps, env, info, operator, expires)
            }
            ExecuteMsg::RevokeAll { operator } => self.revoke_all(deps, env, info, operator),
            ExecuteMsg::TransferNft {
                recipient,
                token_id,
            } => self.transfer_nft(deps, env, info, recipient, token_id),
            ExecuteMsg::SendNft {
                contract,
                token_id,
                msg,
            } => self.send_nft(deps, env, info, contract, token_id, msg),
            ExecuteMsg::Burn { token_id } => self.burn(deps, env, info, token_id),
            ExecuteMsg::Config {minter, total_supply, max_mint, native_token, base_url, logo_url, mint_wallet, royalty_wallet} => {
                self.set_config(deps, env, info, minter, total_supply, max_mint, native_token, base_url, logo_url, mint_wallet, royalty_wallet)
            }
            ExecuteMsg::AddWhiteList {white_list} => self.add_white_list(deps, env, info, white_list),
            ExecuteMsg::AddUpgradableList {users} => self.add_upgradable_list(deps, env, info, users),
            ExecuteMsg::MintPhase {mint_phase} => {
                self.mint_phase(deps, env, info, mint_phase)
            }
            ExecuteMsg::UpgradePhase {upgrade_phase} => self.upgrade_phase(deps, env, info, upgrade_phase),
            ExecuteMsg::MintActive {is_active} => self.set_mint_active(deps, env, info, is_active),
            ExecuteMsg::Withdraw {amount} => self.execute_withdraw(deps, env, info, amount),
        }
    }
}

// TODO pull this into some sort of trait extension??
impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{

    pub fn change_minter(
        &self,
        deps: DepsMut,
        info: MessageInfo,
        new_minter: Addr
    ) -> Result<Response<C>, ContractError> {
        let mut minter = self.minter.load(deps.storage)?;
        
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        minter = new_minter.clone();
        self.minter.save(deps.storage, &minter)?;
        Ok(Response::new()
            .add_attribute("action", "change_owner")
            .add_attribute("owner", new_minter))

    }

    pub fn mint(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        msg: MintMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;

        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }

        // create the token
        let token = TokenInfo {
            owner: deps.api.addr_validate(&info.sender.to_string())?,
            approvals: vec![],
            token_uri: msg.token_uri,
            extension: msg.extension,
        };
        self.tokens
            .update(deps.storage, &msg.token_id, |old| match old {
                Some(_) => Err(ContractError::Claimed {}),
                None => Ok(token),
            })?;

        self.increment_tokens(deps.storage)?;

        Ok(Response::new()
            .add_attribute("action", "mint")
            .add_attribute("minter", info.sender)
            .add_attribute("token_id", msg.token_id))
    }
    
    pub fn batch_mint(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        msg: BatchMintMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;

        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        if msg.token_id.len() != msg.token_uri.len() {
            return Err(ContractError::CountNotMatch {});
        }

        for i in 0..msg.token_id.len() {
            // create the token
            let token = TokenInfo {
                owner: deps.api.addr_validate(&msg.owner[i].clone())?,
                approvals: vec![],
                token_uri: Some(msg.token_uri[i].clone()),
                extension: msg.extension[i].clone(),
            };
            self.tokens
                .update(deps.storage, &msg.token_id[i], |old| match old {
                    Some(_) => Err(ContractError::Claimed {}),
                    None => Ok(token),
                })?;
    
            self.increment_tokens(deps.storage)?;
        }

        Ok(Response::new()
            .add_attribute("action", "batch_mint_original")
            .add_attribute("minter", info.sender)
            .add_attribute("count", msg.token_uri.clone().len().to_string()))
    }
    pub fn batch_mint_replace(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        msg: BatchMintMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;

        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        if msg.token_id.len() != msg.token_uri.len() {
            return Err(ContractError::CountNotMatch {});
        }

        for i in 0..msg.token_id.len() {
            // create the token
            let token = TokenInfo {
                owner: deps.api.addr_validate(&msg.owner[i].clone())?,
                approvals: vec![],
                token_uri: Some(msg.token_uri[i].clone()),
                extension: msg.extension[i].clone(),
            };
            self.tokens
                .save(deps.storage, &msg.token_id[i], &token)?;
        }

        Ok(Response::new()
            .add_attribute("action", "batch_mint_replace")
            .add_attribute("minter", info.sender)
            .add_attribute("count", msg.token_uri.clone().len().to_string()))
    }
    pub fn batch_mint_all(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        msg: MintMsgAll<T>,
    ) -> Result<Response<C>, ContractError> {
        
        let minter = self.minter.load(deps.storage)?;

       
        let config = self.config.load(deps.storage)?;
        if !config.is_mint_active {
            return Err(ContractError::NotStarted {});
        }
        let current_time = env.block.time.seconds();
            
        let current_mint_type = self.get_active_phase_type(deps.as_ref(), &env).unwrap();
        if current_mint_type == "" {
            return Err(ContractError::NotStarted {  });
        }
        let mint_phase = self.mint_phase_map.load(deps.storage, &current_mint_type)?;
        
        let token_ids = self.get_random_ids(deps.as_ref(), config.total_supply.clone(), msg.token_count as usize, info.sender.to_string());
        let mut buyable_amount:usize = token_ids.len();
        
        let mut user_wl_index = 1000;

        let original_info = self.wl_map.load(deps.storage, &info.sender.to_string());
        let mut white_info;
        if original_info.is_ok() {
            white_info = original_info?;
            let wl_size = white_info.phase_type.len();
        
            for index in 0..wl_size {
                if white_info.phase_type[index] == current_mint_type {
                    user_wl_index = index;
                }
            }
            if user_wl_index == 1000 {
                if mint_phase.mint_name.to_lowercase() != "public" {
                    return Err(ContractError::WLExpired {});
                } else {
                    white_info.phase_type.push(mint_phase.mint_type);
                    white_info.spent_amount.push(0);
                    white_info.max_count.push(config.max_mint);
                    white_info.limit_time.push(mint_phase.end_time);
                    white_info.price.push(mint_phase.price);
                    user_wl_index = wl_size;
                    self.wl_map.save(deps.storage, &(white_info.address.to_string()), &white_info)?;
                }
            }
        } else {
            if mint_phase.mint_name.to_lowercase() != "public" {
                return Err(ContractError::WLExpired {});
            } else {
                user_wl_index = 0;
                white_info = WhiteListInfo{
                    address: info.sender.clone(),
                    limit_time: vec![mint_phase.end_time],
                    max_count: vec![config.max_mint],
                    spent_amount: vec![0],
                    phase_type: vec![mint_phase.mint_type],
                    price: vec![mint_phase.price],
                };
                self.wl_map.save(deps.storage, &(white_info.address.to_string()), &white_info)?;
            }
        }
        
        if info.sender != minter {            
            if current_time > white_info.limit_time[user_wl_index] {
                return Err(ContractError::WLExpired {});
            }
            buyable_amount = (white_info.max_count[user_wl_index] - white_info.spent_amount[user_wl_index]) as usize;
            if buyable_amount <= 0 {
                return Err(ContractError::NotEnoughWL {});
            }
        }
        let mut msgs:Vec<CosmosMsg<C>> = vec![];
        let size = std::cmp::min(token_ids.len(), buyable_amount);

        if (info.sender != minter) && (mint_phase.price.u128() > 0) {
            let native_token = config.native_token.clone();
            let receive_fee = match must_pay(&info, &native_token) {
                Ok(it) => it,
                Err(_err) => return Err(ContractError::NotEnoughFee {}),
            }.u128();

            let required_fee =  Uint128::from(mint_phase.price.u128() * size as u128);
            if receive_fee >= u128::from(required_fee) {
                let wallet = self.wallet.load(deps.storage)?;
                let mut royalty_size = wallet.royalty_wallet.len() as u32;
                royalty_size = std::cmp::min(MAX_ROYALTY_OFFER, royalty_size );
                let mut rest_amount = required_fee;
                let mut fee_msg;
                if royalty_size != 0 {
                    let mut index = 0;
                    while index < royalty_size {
                        let royalty_wallet = wallet.royalty_wallet[index as usize].clone();
                        let send_amount = Uint128::from(required_fee.u128() * royalty_wallet.percent as u128 / 1000);
                        rest_amount -= send_amount;
                        fee_msg = self.transfer_token_message(Denom::Native(native_token.clone()), send_amount, royalty_wallet.wallet)?;
                        msgs.push(fee_msg);
                        index += 1;
                    }
                }
                
                fee_msg = self.transfer_token_message(Denom::Native(native_token.clone()), rest_amount, wallet.mint_wallet.clone())?;
                msgs.push(fee_msg);
            }else{
                return Err(ContractError::NotEnoughFee {});
            }
        } 

        for i in 0..size {
            // create the token
            let token_uri_info = format!("ipfs://{}/{}.json", config.base_url, token_ids[i]);
            let token = TokenInfo {
                owner: info.sender.clone(),
                approvals: vec![],
                token_uri: Some(token_uri_info.clone()),
                extension: msg.extension.clone(),
            };
            self.tokens
                .update(deps.storage, &token_ids[i], |old| match old {
                    Some(_) => Err(ContractError::Claimed {}),
                    None => Ok(token),
                })?;
    
            self.increment_tokens(deps.storage)?;
        }

        if info.sender != minter {
            let mut info2 = self.wl_map.load(deps.storage, &info.sender.to_string())?;
            info2.spent_amount[user_wl_index] = info2.spent_amount[user_wl_index] + size as u32;
            self.wl_map.save(deps.storage, &info.sender.to_string(), &info2)?;
        }
        Ok(Response::new()
            .add_messages(msgs)
            .add_attribute("action", "batch_mint")
            .add_attribute("minter", info.sender)
            .add_attribute("token_ids", token_ids.join(","))
            .add_attribute("count", size.to_string()))
        
    }

}

impl<'a, T, C> Cw721Execute<T, C> for Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    type Err = ContractError;
   
    fn transfer_nft(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        recipient: String,
        token_id: String,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        self._transfer_nft(deps, &env, &info, &recipient, &token_id)?;

        Ok(Response::new()
            .add_attribute("action", "transfer_nft")
            .add_attribute("sender", info.sender)
            .add_attribute("recipient", recipient)
            .add_attribute("token_id", token_id))
    }

    fn send_nft(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        contract: String,
        token_id: String,
        msg: Binary,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        // Transfer token
        self._transfer_nft(deps, &env, &info, &contract, &token_id)?;

        let send = Cw721ReceiveMsg {
            sender: info.sender.to_string(),
            token_id: token_id.clone(),
            msg,
        };

        // Send message
        Ok(Response::new()
            .add_message(send.into_cosmos_msg(contract.clone())?)
            .add_attribute("action", "send_nft")
            .add_attribute("sender", info.sender)
            .add_attribute("recipient", contract)
            .add_attribute("token_id", token_id))
    }

    fn approve(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        self._update_approvals(deps, &env, &info, &spender, &token_id, true, expires)?;

        Ok(Response::new()
            .add_attribute("action", "approve")
            .add_attribute("sender", info.sender)
            .add_attribute("spender", spender)
            .add_attribute("token_id", token_id))
    }

    fn revoke(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        spender: String,
        token_id: String,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        self._update_approvals(deps, &env, &info, &spender, &token_id, false, None)?;

        Ok(Response::new()
            .add_attribute("action", "revoke")
            .add_attribute("sender", info.sender)
            .add_attribute("spender", spender)
            .add_attribute("token_id", token_id))
    }

    fn approve_all(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        operator: String,
        expires: Option<Expiration>,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        // reject expired data as invalid
        let expires = expires.unwrap_or_default();
        if expires.is_expired(&env.block) {
            return Err(ContractError::Expired {});
        }

        // set the operator for us
        let operator_addr = deps.api.addr_validate(&operator)?;
        self.operators
            .save(deps.storage, (&info.sender, &operator_addr), &expires)?;

        Ok(Response::new()
            .add_attribute("action", "approve_all")
            .add_attribute("sender", info.sender)
            .add_attribute("operator", operator))
    }

    fn revoke_all(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        operator: String,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        let operator_addr = deps.api.addr_validate(&operator)?;
        self.operators
            .remove(deps.storage, (&info.sender, &operator_addr));

        Ok(Response::new()
            .add_attribute("action", "revoke_all")
            .add_attribute("sender", info.sender)
            .add_attribute("operator", operator))
    }

    fn burn(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        token_id: String,
    ) -> Result<Response<C>, ContractError> {
        if ONLYOWNER {
            let minter = self.minter.load(deps.storage)?;
    
            if info.sender != minter {
                return Err(ContractError::Unauthorized {});
            }
        }
        let token = self.tokens.load(deps.storage, &token_id)?;
        self.check_can_send(deps.as_ref(), &env, &info, &token)?;

        self.tokens.remove(deps.storage, &token_id)?;
        self.decrement_tokens(deps.storage)?;

        Ok(Response::new()
            .add_attribute("action", "burn")
            .add_attribute("sender", info.sender)
            .add_attribute("token_id", token_id))
    }
}

// helpers
impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    fn execute_withdraw (
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        amount: Uint128
    ) -> Result<Response<C>, ContractError> { 
        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        let cfg = self.config.load(deps.storage)?;
        if self.get_token_amount(deps.querier, Denom::Native(cfg.native_token.clone()), env.clone().contract.address.clone())? < amount {
            return Err(crate::ContractError::InsufficientCw20 {  });
        }
    
        let msg = self.transfer_token_message(Denom::Native(cfg.native_token.clone()), amount.clone(), info.sender.clone())?;
    
        Ok(Response::new()
            .add_message(msg)
            .add_attribute("action", "execute_withdraw")
            .add_attribute("withdraw", amount.clone())
        )
    }
    pub fn upgrade(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        token_id: String,
        upgrade_type: String 
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
        let index = usize::MAX;
        if info.sender != minter {      
            let user_info = self.upgradable_user_map.load(deps.storage, &info.sender.to_string())?;
            let index = user_info.phase_type.iter().position(|phase_type| (phase_type.clone() == upgrade_type)).unwrap_or(usize::MAX);
            if index == usize::MAX {
                return Err(ContractError::NotEnoughUpgrade {});
            }      
            let upgradable_amount = (user_info.max_count[index] - user_info.spent_amount[index]) as usize;
            if upgradable_amount <= 0 {
                return Err(ContractError::NotEnoughWL {});
            }
        }
        let token_base_info = self.upgradable_phase_map.load(deps.storage, &upgrade_type)?;
        // create the token
        let token_uri_info = format!("ipfs://{}/{}.json", token_base_info.base_url, token_id);
        let mut original_token = self.tokens.load(deps.storage, &token_id)?;
        self.check_can_send(deps.as_ref(), &env, &info, &original_token)?;
        original_token.token_uri = Some(token_uri_info.clone());
        self.tokens
            .save(deps.storage, &token_id, &original_token)?;

        if info.sender != minter {      
            let mut user_info = self.upgradable_user_map.load(deps.storage, &info.sender.to_string())?;
            user_info.spent_amount[index] += 1;
            self.upgradable_user_map.save(deps.storage, &info.sender.to_string(), &user_info)?;
        }

        Ok(Response::new()
            .add_attribute("action", "nft_upgrade")
            .add_attribute("minter", info.sender)
            .add_attribute("token_id", token_id))
    }

    fn upgrade_phase(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        upgrade_phase:Vec<UpgradablePhase>
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }

        let size = upgrade_phase.len() as u32;
        let mut index = 0;
        while index < size {
            let upgrade_phase_info = upgrade_phase[index as usize].clone();
            self.upgradable_phase_map.save(deps.storage, &(upgrade_phase_info.phase_type), &upgrade_phase_info)?;
            index += 1;
        }

        Ok(Response::new()
            .add_attribute("action", "mint_phase")
            .add_attribute("sender", info.sender))
    }

    fn mint_phase(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        mint_phase:Vec<MintPhase>
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }

        let size = mint_phase.len() as u32;
        let mut index = 0;
        while index < size {
            let mint_phase_info = mint_phase[index as usize].clone();
            self.mint_phase_map.save(deps.storage, &(mint_phase_info.mint_type), &mint_phase_info)?;
            index += 1;
        }
        let mut config = self.config.load(deps.storage)?;
        config.mint_phase_count = size;
        self.config.save(deps.storage, &config)?;

        Ok(Response::new()
            .add_attribute("action", "mint_phase")
            .add_attribute("sender", info.sender))
    }
    fn add_upgradable_list(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        users:Vec<UpgradableInfo>
     ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        let size = users.len() as u32;
        let mut index = 0;
        while index < size {
            let user_info = users[index as usize].clone();
            let original_info = self.upgradable_user_map.load(deps.storage, &user_info.address.to_string());
            if original_info.is_ok() {
                let mut info = original_info?;
                let wl_size = info.phase_type.len();
                let mut user_phase_index = 1000;
                for wl_index in 0..wl_size {
                    if info.phase_type[wl_index] == user_info.phase_type[0] {
                        user_phase_index = wl_index;
                    }
                }
                if user_phase_index == 1000 {
                    info.phase_type.push(user_info.phase_type[0].clone());
                    info.spent_amount.push(user_info.spent_amount[0].clone());
                    info.max_count.push(user_info.max_count[0].clone());
                }else{
                    info.phase_type[user_phase_index] = user_info.phase_type[0].clone();
                    info.spent_amount[user_phase_index] = user_info.spent_amount[0].clone();
                    info.max_count[user_phase_index] = user_info.max_count[0].clone();
                }
                self.upgradable_user_map.save(deps.storage, &(info.address.to_string()), &info)?;
                index += 1;
                continue;
            }
           
            self.upgradable_user_map.save(deps.storage, &(user_info.address.to_string()), &user_info)?;
            index += 1;
        }
        Ok(Response::new()
            .add_attribute("action", "add_upgradable_list")
            .add_attribute("sender", info.sender)
        )
     }
    fn add_white_list(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        white_list:Vec<WhiteListInfo>
     ) -> Result<Response<C>, ContractError> {

        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }

        let size = white_list.len() as u32;
        let mut index = 0;
        while index < size {
            let white_info = white_list[index as usize].clone();
            let original_info = self.wl_map.load(deps.storage, &white_info.address.to_string());
            if original_info.is_ok() {
                let mut info = original_info?;
                let wl_size = info.phase_type.len();
                let mut user_wl_index = 1000;
                for wl_index in 0..wl_size {
                    if info.phase_type[wl_index] == white_info.phase_type[0] {
                        user_wl_index = wl_index;
                    }
                }
                if user_wl_index == 1000 {
                    info.phase_type.push(white_info.phase_type[0].clone());
                    info.spent_amount.push(white_info.spent_amount[0].clone());
                    info.max_count.push(white_info.max_count[0].clone());
                    info.limit_time.push(white_info.limit_time[0].clone());
                    info.price.push(white_info.price[0].clone())
                }else{
                    info.phase_type[user_wl_index] = white_info.phase_type[0].clone();
                    info.spent_amount[user_wl_index] = white_info.spent_amount[0].clone();
                    info.max_count[user_wl_index] = white_info.max_count[0].clone();
                    info.limit_time[user_wl_index] = white_info.limit_time[0].clone();
                    info.price[user_wl_index] = white_info.price[0].clone();
                }
                self.wl_map.save(deps.storage, &(info.address.to_string()), &info)?;
                index += 1;
                continue;
            }
           
            self.wl_map.save(deps.storage, &(white_info.address.to_string()), &white_info)?;
            index += 1;
        }
        let mut config = self.config.load(deps.storage)?;
        config.wl_count = index;
        self.config.save(deps.storage, &config)?;

        Ok(Response::new()
            .add_attribute("action", "add_white_list")
            .add_attribute("sender", info.sender)
        )
    }
    fn set_mint_active(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        is_active:bool
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        let mut config = self.config.load(deps.storage)?;
        config.is_mint_active = is_active;
        self.config.save(deps.storage, &config)?;
        Ok(Response::new()
            .add_attribute("action", "set_mint_active")
            .add_attribute("sender", info.sender))
    }
    fn set_config(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        new_minter:Addr,
        total_supply: u64,
        max_mint: u32,
        native_token:String,
        base_url:String,
        logo_url: String,
        mint_wallet: Addr,
        royalty_wallet: Vec<Royalty>,
    ) -> Result<Response<C>, ContractError> {
        let minter = self.minter.load(deps.storage)?;
    
        if info.sender != minter {
            return Err(ContractError::Unauthorized {});
        }
        self.minter.save(deps.storage, &new_minter)?;
        
        let mut config = self.config.load(deps.storage)?;

        config.total_supply = total_supply;
        config.native_token = native_token;
        config.base_url = base_url;
        config.logo_url = logo_url;
        config.max_mint = max_mint;
        self.config.save(deps.storage, &config)?;

        let mut wallet = self.wallet.load(deps.storage)?;
        wallet.mint_wallet = mint_wallet;
        wallet.royalty_wallet = royalty_wallet;
        self.wallet.save(deps.storage, &wallet)?;
        Ok(Response::new()
            .add_attribute("action", "set_config")
            .add_attribute("sender", info.sender))
    }
    
    pub fn _transfer_nft(
        &self,
        deps: DepsMut,
        env: &Env,
        info: &MessageInfo,
        recipient: &str,
        token_id: &str,
    ) -> Result<TokenInfo<T>, ContractError> {
        let mut token = self.tokens.load(deps.storage, token_id)?;
        // ensure we have permissions
        self.check_can_send(deps.as_ref(), env, info, &token)?;
        // set owner and remove existing approvals
        token.owner = deps.api.addr_validate(recipient)?;
        token.approvals = vec![];
        self.tokens.save(deps.storage, token_id, &token)?;
        Ok(token)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn _update_approvals(
        &self,
        deps: DepsMut,
        env: &Env,
        info: &MessageInfo,
        spender: &str,
        token_id: &str,
        // if add == false, remove. if add == true, remove then set with this expiration
        add: bool,
        expires: Option<Expiration>,
    ) -> Result<TokenInfo<T>, ContractError> {
        let mut token = self.tokens.load(deps.storage, token_id)?;
        // ensure we have permissions
        self.check_can_approve(deps.as_ref(), env, info, &token)?;

        // update the approval list (remove any for the same spender before adding)
        let spender_addr = deps.api.addr_validate(spender)?;
        token.approvals = token
            .approvals
            .into_iter()
            .filter(|apr| apr.spender != spender_addr)
            .collect();

        // only difference between approve and revoke
        if add {
            // reject expired data as invalid
            let expires = expires.unwrap_or_default();
            if expires.is_expired(&env.block) {
                return Err(ContractError::Expired {});
            }
            let approval = Approval {
                spender: spender_addr,
                expires,
            };
            token.approvals.push(approval);
        }

        self.tokens.save(deps.storage, token_id, &token)?;

        Ok(token)
    }

    /// returns true iff the sender can execute approve or reject on the contract
    pub fn check_can_approve(
        &self,
        deps: Deps,
        env: &Env,
        info: &MessageInfo,
        token: &TokenInfo<T>,
    ) -> Result<(), ContractError> {
        // owner can approve
        if token.owner == info.sender {
            return Ok(());
        }
        // operator can approve
        let op = self
            .operators
            .may_load(deps.storage, (&token.owner, &info.sender))?;
        match op {
            Some(ex) => {
                if ex.is_expired(&env.block) {
                    Err(ContractError::Unauthorized {})
                } else {
                    Ok(())
                }
            }
            None => Err(ContractError::Unauthorized {}),
        }
    }

    /// returns true iff the sender can transfer ownership of the token
    pub fn check_can_send(
        &self,
        deps: Deps,
        env: &Env,
        info: &MessageInfo,
        token: &TokenInfo<T>,
    ) -> Result<(), ContractError> {
        // owner can send
        if token.owner == info.sender {
            return Ok(());
        }

        // any non-expired token approval can send
        if token
            .approvals
            .iter()
            .any(|apr| apr.spender == info.sender && !apr.is_expired(&env.block))
        {
            return Ok(());
        }

        // operator can send
        let op = self
            .operators
            .may_load(deps.storage, (&token.owner, &info.sender))?;
        match op {
            Some(ex) => {
                if ex.is_expired(&env.block) {
                    Err(ContractError::Unauthorized {})
                } else {
                    Ok(())
                }
            }
            None => Err(ContractError::Unauthorized {}),
        }
    }
    pub fn transfer_token_message(
        &self,
        denom: Denom,
        amount: Uint128,
        receiver: Addr
    ) -> Result<CosmosMsg<C>, ContractError> {
    
        match denom.clone() {
            Denom::Native(native_str) => {
                return Ok(BankMsg::Send {
                    to_address: receiver.clone().into(),
                    amount: vec![Coin{
                        denom: native_str,
                        amount
                    }]
                }.into());
            },
            Denom::Cw20(native_token) => {
                return Ok(CosmosMsg::Wasm(WasmMsg::Execute {
                    contract_addr: native_token.clone().into(),
                    funds: vec![],
                    msg: to_binary(&Cw20ExecuteMsg::Transfer {
                        recipient: receiver.clone().into(),
                        amount
                    })?,
                }));
            }
        }
    }
    pub fn get_token_amount(
        &self,
        querier: QuerierWrapper,
        denom: Denom,
        contract_addr: Addr
    ) -> Result<Uint128, ContractError> {
    
        match denom.clone() {
            Denom::Native(native_str) => {
                let native_response: NativeBalanceResponse = querier.query(&QueryRequest::Bank(BankQuery::Balance {
                    address: contract_addr.clone().into(),
                    denom: native_str
                }))?;
                return Ok(native_response.amount.amount);
            },
            Denom::Cw20(native_token) => {
                let balance_response: CW20BalanceResponse = querier.query(&QueryRequest::Wasm(WasmQuery::Smart {
                    contract_addr: native_token.clone().into(),
                    msg: to_binary(&Cw20QueryMsg::Balance {address: contract_addr.clone().into()})?,
                }))?;
                return Ok(balance_response.balance);
            }
        }
    }
    pub fn get_active_phase_type(
        &self,
        deps: Deps,
        env: &Env,
    ) -> Result<String, ContractError> {
        let config = self.config.load(deps.storage)?;
        if !config.is_mint_active {
            return Err(ContractError::NotStarted {});
        }
        let mint_phase: StdResult<Vec<MintPhase>> = self
            .mint_phase_map
            .range(deps.storage, None, None, Order::Ascending)
            .take(config.mint_phase_count as usize)
            .map(|item| item.map(|(_, info)| info))
            .collect();
        match mint_phase {
            Ok(mint_phase_list) => {
                let size = mint_phase_list.len();
                let current_time = env.block.time.seconds();
                if size > 0 {
                    let mut index = 0;
                    while index < size {
                        let phase_info = mint_phase_list[index].clone();
                        if current_time >= phase_info.start_time {
                            if current_time <= phase_info.end_time {
                                return Ok(phase_info.mint_type);
                            }
                        }
                       
                        index += 1;
                    }
                }
                Ok("".to_owned())
            }
            Err(_err) => {Ok("".to_owned())}
        }
    }
    fn all_tokens(
        &self,
        deps: Deps,
    ) -> Result<Vec<String>, ContractError> {

        let tokens: StdResult<Vec<String>> = self
            .tokens
            .range(deps.storage, None, None, Order::Ascending)
            .map(|item| item.map(|(k, _)| k))
            .collect();
        match tokens {
            Ok(token_list) => {
                Ok(token_list)
            }
            Err(_err) => {Ok(Vec::new())}
        }
    }
    fn get_random_ids( &self, deps: Deps, total: u64, amount: usize, _seed: String) -> Vec<String> {
        let mut valid_ids: Vec<String> = Vec::new();
        let excluded_buffer = self.all_tokens(deps).unwrap();
        for id in 1..=total {
            let id_str = id.to_string();
            if !excluded_buffer.contains(&id_str) {
                valid_ids.push(id_str);
            }
        }
    
        if valid_ids.is_empty() || amount > valid_ids.len() {
            return Vec::new(); // In case there are no valid IDs
        }
        
        let mut random_ids: Vec<String> = Vec::new();
        let mut index = 0;
        while random_ids.len() < amount {
            let random_index: usize = self.get_random_number(index, valid_ids.len() as u32) as usize;
            let random_id = valid_ids[random_index].clone();
    
            if !random_ids.contains(&random_id) {
                random_ids.push(random_id);
            }
            index += 1;
        }
    
        random_ids
    }
    fn get_random_number(&self, input_value: u32, limit: u32) -> u32 {
        let mut hasher = DefaultHasher::new();
        input_value.hash(&mut hasher);
        let hash = hasher.finish();
        let random_number = hash % (limit as u64);
        random_number as u32
    }
}
