use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{Binary, Uint128};
use cw721::Expiration;
use cosmwasm_std::Addr;
use crate::state::{WhiteListInfo, MintPhase, Royalty, UpgradableInfo, UpgradablePhase};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    /// Name of the NFT contract
    pub name: String,
    /// Symbol of the NFT contract
    pub symbol: String,

    /// The minter is the only one who can create new NFTs.
    /// This is designed for a base NFT that is controlled by an external program
    /// or contract. You will likely replace this with custom logic in custom NFTs
    pub minter: String,
}

/// This is like Cw721ExecuteMsg but we add a Mint command for an owner
/// to make this stand-alone. You will likely want to remove mint and
/// use other control logic in any contract that inherits this.
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg<T> {
    /// Transfer is a base message to move a token to another account without triggering actions
    TransferNft { recipient: String, token_id: String },
    /// Send is a base message to transfer a token to a contract and trigger an action
    /// on the receiving contract.
    SendNft {
        contract: String,
        token_id: String,
        msg: Binary,
    },
    /// Allows operator to transfer / send the token from the owner's account.
    /// If expiration is set, then this allowance has a time/height limit
    Approve {
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    },
    /// Remove previously granted Approval
    Revoke { spender: String, token_id: String },
    /// Allows operator to transfer / send any token from the owner's account.
    /// If expiration is set, then this allowance has a time/height limit
    ApproveAll {
        operator: String,
        expires: Option<Expiration>,
    },
    /// Remove previously granted ApproveAll permission
    RevokeAll { operator: String },

    /// Mint a new NFT, can only be called by the contract minter
    Mint(MintMsg<T>),
    // Edit(EditMsg<T>),
    BatchMint(BatchMintMsg<T>),
    BatchMintAll(MintMsgAll<T>),
    ChangeMinter {
        new_minter: Addr
    },
    AddWhiteList {
        white_list:Vec<WhiteListInfo>
    },

    AddUpgradableList {
        users:Vec<UpgradableInfo>
    },

    MintPhase {
        mint_phase:Vec<MintPhase>
    },

    Config {
        minter:Addr,
        total_supply: u64,
        max_mint: u32,
        native_token:String,
        base_url:String,
        logo_url: String,
        mint_wallet: Addr,
        royalty_wallet: Vec<Royalty>,
    },
    UpgradePhase {
        upgrade_phase: Vec<UpgradablePhase>
    },

    MintActive {
        is_active:bool
    },

    Withdraw {
        amount: Uint128
    },

    /// Burn an NFT the sender has access to
    Burn { token_id: String },
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct EditMsg<T> {
    pub token_id: String,
    /// Metadata JSON Schema
    pub token_uri: Option<String>,
    /// Any custom extension used by this contract
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MintMsg<T> {
    /// Unique ID of the NFT
    pub token_id: String,
    /// The owner of the newly minter NFT
    pub owner: String,
    /// Universal resource identifier for this NFT
    /// Should point to a JSON file that conforms to the ERC721
    /// Metadata JSON Schema
    pub token_uri: Option<String>,
    /// Any custom extension used by this contract
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct BatchMintMsg<T> {
    /// Start Unique ID of the NFT
    pub token_id: Vec<String>,
    /// The owner of the newly minter NFT
    pub owner: Vec<String>,
    /// Universal resource identifier for this NFT
    /// Should point to a JSON file that conforms to the ERC721
    /// Metadata JSON Schema
    pub token_uri: Vec<String>,
    /// Any custom extension used by this contract
    pub extension: Vec<T>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MintMsgAll<T> {
    pub token_count: u32,
    pub owner: String,
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    /// Return the owner of the given token, error if token does not exist
    /// Return type: OwnerOfResponse
    OwnerOf {
        token_id: String,
        /// unset or false will filter out expired approvals, you must set to true to see them
        include_expired: Option<bool>,
    },

    /// Return operator that can access all of the owner's tokens.
    /// Return type: `ApprovalResponse`
    Approval {
        token_id: String,
        spender: String,
        include_expired: Option<bool>,
    },

    /// Return approvals that a token has
    /// Return type: `ApprovalsResponse`
    Approvals {
        token_id: String,
        include_expired: Option<bool>,
    },

    /// List all operators that can access all of the owner's tokens
    /// Return type: `OperatorsResponse`
    AllOperators {
        owner: String,
        /// unset or false will filter out expired items, you must set to true to see them
        include_expired: Option<bool>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    /// Total number of tokens issued
    NumTokens {},

    /// With MetaData Extension.
    /// Returns top-level metadata about the contract: `ContractInfoResponse`
    ContractInfo {},
    /// With MetaData Extension.
    /// Returns metadata about one particular token, based on *ERC721 Metadata JSON Schema*
    /// but directly from the contract: `NftInfoResponse`
    NftInfo {
        token_id: String,
    },
    /// With MetaData Extension.
    /// Returns the result of both `NftInfo` and `OwnerOf` as one query as an optimization
    /// for clients: `AllNftInfo`
    AllNftInfo {
        token_id: String,
        /// unset or false will filter out expired approvals, you must set to true to see them
        include_expired: Option<bool>,
    },

    /// With Enumerable extension.
    /// Returns all tokens owned by the given address, [] if unset.
    /// Return type: TokensResponse.
    Tokens {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    /// With Enumerable extension.
    /// Requires pagination. Lists all token_ids controlled by the contract.
    /// Return type: TokensResponse.
    AllTokens {
        start_after: Option<String>,
        limit: Option<u32>,
    },

    Config {},

    MintPhase{
        start_after: Option<String>, 
        limit: Option<u32>
    },
    ActiveMintPhase{},

    Wallet {},

    AllWLInfo {
        phase_type: String,
        start_after: Option<String>, 
        limit: Option<u32>
    },

    WLInfo {user: Addr, phase_type: String},


    // Return the minter
    Minter {},
}

/// Shows who can mint these tokens
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct MinterResponse {
    pub minter: String,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct ConfigResponse {
    pub minter: Addr,
    pub total_supply: u64,
    pub is_mint_active: bool,
    pub native_token: String,
    pub base_url: String,
    pub logo_url: String,
    pub wl_count: u32,
    pub max_mint: u32,
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct PhaseResponse {
    pub mint_phase: Vec<MintPhase>,
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct UpgradePhaseResponse {
    pub upgrade_phase: Vec<UpgradablePhase>,
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct ActiveMintPhaseResponse {
    pub mint_type: String,
    pub mint_name: String,
    pub price: Uint128,
    pub start_time: u64,
    pub end_time: u64,
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct WalletResponse {
    pub mint_wallet: Addr,
    pub royalty_wallet: Vec<Royalty>,
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct WLInfoResponse {
    pub address: String,
    pub limit_time: u64,
    pub max_count: u32,
    pub spent_amount: u32,
    pub price: Uint128
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct AllWLInfoResponse {
    pub users: Vec<WhiteListInfo>
}
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct UpgradeUserResponse {
    pub address: String,
    pub max_count: Vec<u32>,
    pub spent_amount: Vec<u32>,
    pub phase_type: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct UpgradeAllUserResponse {
    pub users: Vec<UpgradableInfo>
}