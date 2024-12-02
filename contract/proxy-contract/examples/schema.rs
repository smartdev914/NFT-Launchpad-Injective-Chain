use std::env::current_dir;
use std::fs::create_dir_all;

use cosmwasm_schema::{export_schema, remove_schemas, schema_for};

use nft_launch_pad::msg::{
    ExecuteMsg, 
    MintMsg,
    BatchMintMsg,
    InstantiateMsg, 
    QueryMsg,
    MinterResponse,
    ConfigResponse,
    PhaseResponse,
    WalletResponse,
    WLInfoResponse,
    AllWLInfoResponse,
};

fn main() {
    let mut out_dir = current_dir().unwrap();
    out_dir.push("schema");
    create_dir_all(&out_dir).unwrap();
    remove_schemas(&out_dir).unwrap();

    export_schema(&schema_for!(InstantiateMsg), &out_dir);
    export_schema(&schema_for!(ExecuteMsg<()>), &out_dir);
    export_schema(&schema_for!(MintMsg<()>), &out_dir);
    export_schema(&schema_for!(BatchMintMsg<()>), &out_dir);
    export_schema(&schema_for!(MinterResponse), &out_dir);
    export_schema(&schema_for!(PhaseResponse), &out_dir);
    export_schema(&schema_for!(QueryMsg), &out_dir);
    export_schema(&schema_for!(ConfigResponse), &out_dir);
    export_schema(&schema_for!(WalletResponse), &out_dir);
    export_schema(&schema_for!(WLInfoResponse), &out_dir);
    export_schema(&schema_for!(AllWLInfoResponse), &out_dir);
}
