use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("BatchMint count not match")]
    CountNotMatch {},

    #[error("token_id already claimed")]
    Claimed {},

    #[error("Cannot set approval that is already expired")]
    Expired {},

    #[error("Approval not found for: {spender}")]
    ApprovalNotFound { spender: String },

    #[error("not enough fee")]
    NotEnoughFee {},

    #[error("please set mint_wallet")]
    NoMintWallet {},

    #[error("please set wl_wallet")]
    NoWLWallet {},

    #[error("please set royalty_wallet")]
    NoRoyaltyWallet {},

    #[error("not mint start")]
    NotStarted {},

    #[error("WL expired")]
    WLExpired {},

    #[error("not enough wl")]
    NotEnoughWL {},

    #[error("not purchase wl")]
    NotPurchaseWL {},

    #[error("end mint phase")]
    EndPhase {},

    #[error("Insufficient Cw20")]
    InsufficientCw20 {},

    #[error("limit max mint")]
    LimitMaxMint {},

    #[error("not enough upgrade")]
    NotEnoughUpgrade
}
