use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Disabled")]
    Disabled {},

    #[error("InvalidCw721Token")]
    InvalidCw721Token {},

    #[error("InvalidCw20Token")]
    InvalidCw20Token {},

    #[error("Invalid CW721 Receive Message")]
    InvalidCw721Msg {},

    #[error("Invalid CW20 Receive Message")]
    InvalidCw20Msg {},

    #[error("Please input fee wallet")]
    NoFeeWallet {},

    #[error("not enough fee")]
    NotEnoughFee {},

    #[error("Failed to parse or process reply message")]
    FailedToParseReply {},
    #[error("Special Offer don't get started")]
    NotStarted {},

    #[error("Insufficient Cw20")]
    InsufficientCw20 {},
}
