use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub owner_one: Addr,
    pub owner_two: Addr,
    pub fee_wallet: Addr,
    pub native_token: String,
    pub create_fee: Uint128,
    pub special_offer_wallet: Vec<Addr>,
    pub wl_limit_time: u64,
    pub wl_price: Uint128,
    pub is_special_offer_active: bool,
    pub max_count_per_wl: u32,
    pub enabled: bool,
}

#[cw_serde]
pub struct  ContractInfo {
    pub minter: Addr,
    pub address: Addr,
    pub name: String,
    pub symbol: String,
    pub logo_url: String,
}
#[cw_serde]
pub struct WhiteListInfo {
    pub address: String,
    pub limit_time: u64,
    pub max_count: u32,
    pub spent_amount: u32
}

pub const CONFIG_KEY: &str = "config";
pub const CONFIG: Item<Config> = Item::new(CONFIG_KEY);

pub const CONTRACT_LIST_PREFIX: &str = "contract_map";
pub const CONTRACT_MAP: Map<String, ContractInfo> = Map::new(CONTRACT_LIST_PREFIX); //key: contract's address
pub const TEMP_USER_PREFIX: &str= "user_map";
pub const TEMP_USER: Item<ContractInfo> = Item::new(TEMP_USER_PREFIX);
pub const WL_MAP_PREFIX: &str= "wl_map";
pub const WL_MAP: Map<String, WhiteListInfo> = Map::new(WL_MAP_PREFIX);

pub const ACTIVE_KEY: &str = "active_collection";
pub const ACTIVE_COLLECTION: Item<Addr> = Item::new(ACTIVE_KEY);

