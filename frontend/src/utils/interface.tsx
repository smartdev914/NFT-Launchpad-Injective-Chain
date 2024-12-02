
interface Factory_Config {
    owner_one: string,
    owner_two: string,
    enable: boolean,
    fee_wallet: string,
    create_fee: number,
    native_token: string,
    special_offer_wallet: any,
    wl_limit_time: number,
    wl_price: number,
    max_count_per_wl: number,
}

interface CreateContractConfig {
    name: string,
    symbol: string,
    minter: string,
    code_id: number,
    logo_url: string,
}

interface CollectionConfig {
    minter:string,
    total_supply: number,
    max_mint: number,
    is_mint_active: boolean,
    native_token:string,
    base_url:string,
    logo_url:string,
    mint_wallet: String,
    royalty_wallet: any,
}

interface MintPhaseConfig {
    mint_type: string,
    mint_name: string,
    price: string,
    start_time: number,
    end_time: number,
}
interface RoyaltyWallet {
    percent: number,
    wallet: string,
}

interface WhiteListInfo {
    address: string,
    limit_time: number[],
    max_count: number[],
    spent_amount: number[],
    phase_type:string[],
    price: string[],
}

interface UIWhiteListInfo {
    address: string,
    limit_time: number,
    max_count: number,
    spent_amount: number,
    price: string,
}

interface CollectionTotalInfo {
    address: string,
    name: string,
    symbol: string,
    collection_config: CollectionConfig,
    active_phase: MintPhaseConfig,
}
interface PreMintUser {
    address: string,
    token_ids: string,
}