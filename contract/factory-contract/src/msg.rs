use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Uint128, Addr};
use crate::state::{
    ContractInfo,
    WhiteListInfo,
};

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: Addr,
    pub enable: bool
}

#[cw_serde]
pub enum ExecuteMsg {
    UpdateConfig {
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
    },
    CreateContract {
        name: String,
        symbol: String,
        minter: String,
        code_id: u64,
        logo_url: String
    },
    AddWhiteList {},
    SpecialActive {
        is_active: bool,
    },
    Withdraw {
        amount: Uint128
    },
    ActiveCollection {
        address: String,
    }
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(OwnerResponse)]
    IsOwner {
        address: String
    },
    #[returns(ConfigResponse)]
    GetConfig {
    },

    #[returns(CollectionResponse)]
    GetCollection {
        address: String
    },

    #[returns(AllCollectionResponse)]
    GetAllCollection {
        start_after: Option<String>,
        limit: Option<u32>
    },

    #[returns(WLResponse)]
    WLInfo { user: Addr },

    #[returns(AllWLResponse)]
    AllWLInfo {
        start_after: Option<String>, 
        limit: Option<u32>
    },
    #[returns(ActiveResponse)]
    GetActiveCollection {
    },
}

#[cw_serde]
pub struct ActiveResponse {
    pub address: String,
}
#[cw_serde]
pub struct WLResponse {
    pub address: String,
    pub limit_time: u64,
    pub max_count: u32,
    pub spent_amount: u32
}
#[cw_serde]
pub struct OwnerResponse {
    pub is_owner: bool,
    pub block_time: u64,
}
#[cw_serde]
pub struct ConfigResponse {
    pub owner_one: String,
    pub owner_two: String,
    pub enabled: bool,
    pub fee_wallet: String,
    pub create_fee: Uint128,
    pub native_token: String,
    pub special_offer_wallet: Vec<Addr>,
    pub wl_limit_time: u64,
    pub wl_price: Uint128,
    pub max_count_per_wl: u32,
    pub is_special_offer_active: bool,
}

#[cw_serde]
pub struct CollectionResponse {
    pub minter: String,
    pub address: String,
    pub logo_url: String,
    pub name: String,
    pub symbol: String,
}

#[cw_serde]
pub struct AllCollectionResponse {
    pub contracts: Vec<ContractInfo>,
}

#[cw_serde]
pub struct AllWLResponse {
    pub users: Vec<WhiteListInfo>,
}

#[cw_serde]
pub struct NftInstantiateMsg {
    /// Token name
    pub name: String,
    /// Token symbol
    pub symbol: String,
    /// The amount of decimals the token has
    pub minter: String,
}