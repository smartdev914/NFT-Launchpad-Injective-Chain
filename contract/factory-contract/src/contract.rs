#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{attr, to_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, 
    Response, StdResult, Uint128, CosmosMsg, WasmMsg, Order, SubMsg, ReplyOn, Reply,
    SubMsgResult, SubMsgResponse, StdError};

use cw2::set_contract_version;
use cw20::Denom;
use cw_utils::must_pay;
use cw_utils::parse_instantiate_response_data;

use cw_storage_plus::Bound;

use crate::util;
use crate::error::ContractError;
use crate::msg::{
    ExecuteMsg, 
    InstantiateMsg, 
    QueryMsg, 
    ConfigResponse,
    CollectionResponse,
    AllCollectionResponse,
    AllWLResponse,
    NftInstantiateMsg,
    OwnerResponse,
    WLResponse,
    ActiveResponse
};
use crate::state::{
    Config, 
    CONFIG,
    ContractInfo,
    CONTRACT_MAP,
    TEMP_USER,
    WhiteListInfo,
    WL_MAP,
    ACTIVE_COLLECTION,
};

const CONTRACT_NAME: &str = "crates.io:factory";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const DEFAULT_LIMIT: u32 = 10;
const MAX_LIMIT: u32 = 30;
const INSTANTIATE_COLLECTION_REPLY_ID: u64 = 1;
const MAX_SPECIAL_OFFER:u32 = 2;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let enable = msg.enable;
    let owner = msg.owner;
    let config = Config {
        owner_one: owner.clone(),
        owner_two: owner.clone(),
        fee_wallet: owner.clone(), 
        native_token:"inj".to_owned(),
        create_fee: Uint128::from(0_u64),
        special_offer_wallet: Vec::new(),
        wl_limit_time: 30 * 24 * 60 * 60,
        wl_price: Uint128::from(750000000000000000u128),        
        is_special_offer_active: false,
        max_count_per_wl: 10,
        enabled: enable,
    };

    CONFIG.save(deps.storage, &config)?;
    
    Ok(Response::default())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::UpdateConfig { 
            owner_one,
            owner_two,
            enable,
            fee_wallet ,
            create_fee,
            native_token,
            special_offer_wallet,
            wl_limit_time,
            wl_price,
            max_count_per_wl,
        } => execute_update_config(
            deps,
            env,
            info,
            owner_one,
            owner_two,
            enable,
            fee_wallet,
            create_fee,
            native_token,
            special_offer_wallet,
            wl_limit_time,
            wl_price,
            max_count_per_wl,
        ),        
        ExecuteMsg::CreateContract { 
            name,
            symbol,
            minter, 
            code_id,
            logo_url
        } => execute_create_contract(
            deps,
            env,
            info, 
            name,
            symbol,
            minter,
            code_id,
            logo_url
        ),
        ExecuteMsg::AddWhiteList {  } => execute_add_white_list(deps, env, info),
        ExecuteMsg::SpecialActive { is_active } => execution_special_active(deps, env, info, is_active),
        ExecuteMsg::Withdraw {
            amount,
        } => execute_withdraw(
            deps, 
            env, 
            info, 
            amount,
        ),
        ExecuteMsg::ActiveCollection {
            address,
        } => execute_active_collection(
            deps,
            env,
            info,
            address,
        ),
    }
}

pub fn execute_active_collection (
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String
) -> Result<Response, ContractError> {
    util::check_owner(deps.storage, info.sender.clone())?;
    let active_address = deps.api.addr_validate(&address)?;
    ACTIVE_COLLECTION.save(deps.storage, &active_address)?;
    Ok(Response::new()
        .add_attribute("action", "update_config")
        .add_attribute("sender", info.sender.to_string().clone())
    )
}

pub fn execute_update_config (
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    owner_one: String,
    owner_two: String,
    enable: bool,
    fee_wallet: String,
    create_fee: Uint128,
    native_token: String,
    special_offer_wallet: Vec<Addr>,
    wl_limit_time: u64,
    wl_price: Uint128,
    max_count_per_wl: u32,
) -> Result<Response, ContractError> {
    util::check_owner(deps.storage, info.sender.clone())?;
    let mut cfg = CONFIG.load(deps.storage)?;
    cfg.owner_one = deps.api.addr_validate(&owner_one)?;
    cfg.owner_two = deps.api.addr_validate(&owner_two)?;
    cfg.enabled = enable;
    cfg.fee_wallet = deps.api.addr_validate(&fee_wallet)?;
    cfg.create_fee = create_fee;
    cfg.native_token = native_token;
    cfg.special_offer_wallet = special_offer_wallet;
    cfg.wl_limit_time = wl_limit_time;
    cfg.wl_price = wl_price;
    cfg.max_count_per_wl = max_count_per_wl;
    CONFIG.save(deps.storage, &cfg)?;
    Ok(Response::new()
        .add_attribute("action", "update_config")
        .add_attribute("sender", info.sender.to_string().clone())
    )
}

pub fn execute_create_contract (
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    name: String,
    symbol: String,
    minter: String,
    code_id: u64,
    logo_url: String
) -> Result<Response, ContractError> {
    util::check_enabled(deps.storage)?;
    let cfg = CONFIG.load(deps.storage)?;
    let _minter = deps.api.addr_validate(&minter)?;
    let mut msgs:Vec<SubMsg> = vec![];
    let mut fee_msgs:Vec<CosmosMsg> = vec![];
    if (info.sender != cfg.owner_one) && (info.sender != cfg.owner_two) && (u128::from(cfg.create_fee) > 0) {
        let native_token = cfg.native_token.clone();
        let fee_wallet = cfg.fee_wallet;
        let receive_fee = match must_pay(&info, &native_token) {
            Ok(it) => it,
            Err(_err) => return Err(ContractError::NotEnoughFee {}),
        }.u128();

        if receive_fee >= u128::from(cfg.create_fee) {
            let fee_msg = util::transfer_token_message(Denom::Native(native_token.clone()), cfg.create_fee, fee_wallet.clone())?;
            fee_msgs.push(fee_msg);
        } else {
            return Err(ContractError::NotEnoughFee {});
        }
    }
    let temp_user = ContractInfo {
        minter: _minter.clone(),
        address: _minter.clone(),
        name:name.clone(),
        symbol:symbol.clone(),
        logo_url:logo_url.clone()
    };
    TEMP_USER.save(deps.storage, &temp_user)?;
    msgs.push(SubMsg {
        id: INSTANTIATE_COLLECTION_REPLY_ID,
        msg: WasmMsg::Instantiate {
            admin: None,
            code_id,
            msg: to_binary(&NftInstantiateMsg {
                name,
                symbol,
                minter: _minter.to_string()
            })?,
            funds: vec![],
            label: "NFTMintContract".to_string(),
        }
        .into(),
        gas_limit: None,
        reply_on: ReplyOn::Success,
    });
    
    Ok(Response::new()
        .add_submessages(msgs)
        .add_messages(fee_msgs)
        .add_attribute("action", "create_contract")
        .add_attribute("minter", _minter.to_string().clone())
    )
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn reply(deps: DepsMut, _env: Env, msg: Reply) -> Result<Response, ContractError> {
    match msg {
        Reply {
            id: INSTANTIATE_COLLECTION_REPLY_ID,
            result:
                SubMsgResult::Ok(SubMsgResponse {
                    data: Some(data), ..
                }),
        } => {
            let init_response = parse_instantiate_response_data(data.as_slice())
                .map_err(|e| StdError::generic_err(format!("{e}")))?;

            let nft_contract = deps.api.addr_validate(&init_response.contract_address)?;
            let temp_user = TEMP_USER.load(deps.storage)?;
            let contract = ContractInfo{
                minter:temp_user.minter,
                address:nft_contract.clone(),
                name: temp_user.name,
                symbol: temp_user.symbol,
                logo_url:temp_user.logo_url,
            };

            CONTRACT_MAP.save(deps.storage, nft_contract.to_string(), &contract)?;

            Ok(Response::new().add_attributes(vec![
                attr("action", "register"),
                attr("contract_addr", nft_contract),
            ]))
        }
        _ => Err(ContractError::FailedToParseReply {}),
    }
}

pub fn execute_add_white_list (
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {

    let addr = info.sender.to_string();
    
    let config = CONFIG.load(deps.storage)?;
    if !config.is_special_offer_active {
        return Err(ContractError::NotStarted {});
    }
    if u128::from(config.wl_price) == 0 {
        let white_info = WhiteListInfo {
            address: addr.clone(),
            limit_time: env.block.time.seconds() + config.wl_limit_time,
            max_count: config.max_count_per_wl,
            spent_amount: 0,
        };
        WL_MAP.save(deps.storage, addr, &white_info)?;

        return Ok(Response::new()
            .add_attribute("action", "add_white_list")
            .add_attribute("sender", info.sender)
        );
    }
    let native_token = config.native_token.clone();
    let receive_fee = match must_pay(&info, &native_token) {
        Ok(it) => it,
        Err(_err) => return Err(ContractError::NotEnoughFee {}),
    }.u128();

    let mut msgs:Vec<CosmosMsg> = vec![];
    if receive_fee >= u128::from(config.wl_price) {
        
        let mut size = config.special_offer_wallet.len() as u32;
        size = std::cmp::min(MAX_SPECIAL_OFFER, size );
        if size != 0 {
            let send_amount = config.wl_price / Uint128::from(size);
            let mut index = 0;
            while index < size {
                let receiver = config.special_offer_wallet[index as usize].clone();
                let fee_msg = util::transfer_token_message(Denom::Native(native_token.clone()), send_amount, receiver)?;
                msgs.push(fee_msg);
                index += 1;
            }
        }
        let white_info = WhiteListInfo {
            address: addr.clone(),
            limit_time: env.block.time.seconds() + config.wl_limit_time,
            max_count: config.max_count_per_wl,
            spent_amount: 0,
        };
        WL_MAP.save(deps.storage, addr, &white_info)?;

        Ok(Response::new()
            .add_messages(msgs)
            .add_attribute("action", "add_white_list")
            .add_attribute("sender", info.sender)
        )

    }else{
        return Err(ContractError::NotEnoughFee {});
    }
}
pub fn execution_special_active (
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    is_active: bool,
) -> Result<Response, ContractError> {
    util::check_owner(deps.storage, info.sender.clone())?;
    let mut cfg = CONFIG.load(deps.storage)?;
    cfg.is_special_offer_active = is_active;
    CONFIG.save(deps.storage, &cfg)?;
    Ok(Response::new()
        .add_attribute("action", "update_special_active")
        .add_attribute("sender", info.sender.to_string().clone())
    )
}
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetConfig {} => to_binary(&query_config(deps, env)?),
        QueryMsg::GetCollection { address } => to_binary(&query_collection(deps, address)?),
        QueryMsg::GetAllCollection {start_after, limit} => to_binary(&query_all_collection(deps, env, start_after, limit)?),
        QueryMsg::AllWLInfo {start_after, limit} => to_binary(&query_all_wl_info(deps, env, start_after, limit)?),
        QueryMsg::IsOwner { address } => to_binary(&query_is_owner(deps, env, address)?),
        QueryMsg::WLInfo { user } => to_binary(&get_wl_info(deps, env, user)?),
        QueryMsg::GetActiveCollection{} => to_binary(&query_active_collection(deps, env)?),
    }
}

pub fn query_active_collection(deps: Deps, _env: Env) -> StdResult<ActiveResponse> {
    let active_address = ACTIVE_COLLECTION.load(deps.storage)?;
    Ok(ActiveResponse {
        address: active_address.to_string(),
    })
}

pub fn get_wl_info(deps: Deps, _env: Env, user: Addr) -> StdResult<WLResponse> {
    let wl_info = WL_MAP.load(deps.storage, user.to_string())?;
    Ok(WLResponse {
        address: wl_info.address,
        limit_time: wl_info.limit_time,
        max_count: wl_info.max_count,
        spent_amount: wl_info.spent_amount
    })
}

pub fn query_is_owner(deps: Deps, env: Env, address: String) -> StdResult<OwnerResponse> {
    let config = CONFIG.load(deps.storage)?;
    let query_addr = deps.api.addr_validate(&address)?;
    let is_owner = config.owner_one == query_addr || config.owner_two == query_addr;
    let block_time = env.block.time.seconds();
    Ok(OwnerResponse {
        is_owner,
        block_time
    })
}
pub fn query_config(deps: Deps, _env: Env) -> StdResult<ConfigResponse> {
    let config: Config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        owner_one: config.owner_one.to_string(),
        owner_two: config.owner_two.to_string(),
        enabled: config.enabled,
        fee_wallet: config.fee_wallet.to_string(),
        create_fee: config.create_fee,
        native_token: config.native_token,
        special_offer_wallet: config.special_offer_wallet,
        wl_limit_time: config.wl_limit_time,
        wl_price: config.wl_price,
        max_count_per_wl: config.max_count_per_wl,
        is_special_offer_active: config.is_special_offer_active,
    })
}

pub fn query_collection(deps: Deps, address: String) -> StdResult<CollectionResponse> {

    let user_info = CONTRACT_MAP.load(deps.storage, address)?;
    Ok(CollectionResponse {
        minter: user_info.minter.to_string(),
        address: user_info.address.to_string(),
        logo_url: user_info.logo_url,
        name: user_info.name,
        symbol: user_info.symbol,
    })
}

pub fn query_all_collection(deps: Deps, _env: Env, start_after: Option<String>, limit: Option<u32>) -> StdResult<AllCollectionResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.map(Bound::exclusive);

    let contracts: StdResult<Vec<ContractInfo>> = CONTRACT_MAP
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, contract_info)| contract_info))
            .collect();

     Ok(AllCollectionResponse {
        contracts: contracts?
    })
}

pub fn query_all_wl_info(deps: Deps, env: Env, start_after: Option<String>, limit: Option<u32>) -> StdResult<AllWLResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.map(Bound::exclusive);

    let all_wl: StdResult<Vec<WhiteListInfo>> = WL_MAP
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, contract_info)| contract_info))
            .collect();
    let current_time = env.block.time.seconds();
    
    let filtered_wl: Vec<WhiteListInfo> = all_wl?
        .into_iter()
        .filter(|white_info| white_info.limit_time >= current_time)
        .collect();

    Ok(AllWLResponse {
        users: filtered_wl,
    })
    //  Ok(AllWLResponse {
    //     users: all_wl?
    // })
}
pub fn execute_withdraw (
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128
) -> Result<Response, ContractError> { 
    util::check_owner(deps.storage, info.sender.clone())?;

    let cfg = CONFIG.load(deps.storage)?;

    if util::get_token_amount(deps.querier, Denom::Native(cfg.native_token.clone()), env.clone().contract.address.clone())? < amount {
        return Err(crate::ContractError::InsufficientCw20 {  });
    }

    let msg = util::transfer_token_message(Denom::Native(cfg.native_token.clone()), amount.clone(), info.sender.clone())?;

    Ok(Response::new()
        .add_message(msg)
        .add_attribute("action", "execute_withdraw")
        .add_attribute("withdraw", amount.clone())
    )
}