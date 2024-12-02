use serde::de::DeserializeOwned;
use serde::Serialize;

use cosmwasm_std::{to_binary, Addr, Binary, BlockInfo, Deps, Env, Order, StdError, StdResult, Uint128};

use cw721::{
    AllNftInfoResponse, ApprovalResponse, ApprovalsResponse, ContractInfoResponse, CustomMsg,
    Cw721Query, Expiration, NftInfoResponse, NumTokensResponse, OperatorsResponse, OwnerOfResponse,
    TokensResponse,
};
use cw_storage_plus::Bound;
use cw_utils::maybe_addr;

use crate::msg::{MinterResponse, ConfigResponse, PhaseResponse, WalletResponse, WLInfoResponse, AllWLInfoResponse, QueryMsg, ActiveMintPhaseResponse, UpgradePhaseResponse, UpgradeUserResponse, UpgradeAllUserResponse};
use crate::state::{Approval, Cw721Contract, TokenInfo, WhiteListInfo, MintPhase, UpgradablePhase, UpgradableInfo};


const DEFAULT_LIMIT: u32 = 10;
const MAX_LIMIT: u32 = 300;

impl<'a, T, C> Cw721Query<T> for Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    fn contract_info(&self, deps: Deps) -> StdResult<ContractInfoResponse> {
        self.contract_info.load(deps.storage)
    }

    fn num_tokens(&self, deps: Deps) -> StdResult<NumTokensResponse> {
        let count = self.token_count(deps.storage)?;
        Ok(NumTokensResponse { count })
    }

    fn nft_info(&self, deps: Deps, token_id: String) -> StdResult<NftInfoResponse<T>> {
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(NftInfoResponse {
            token_uri: info.token_uri,
            extension: info.extension,
        })
    }

    fn owner_of(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        include_expired: bool,
    ) -> StdResult<OwnerOfResponse> {
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(OwnerOfResponse {
            owner: info.owner.to_string(),
            approvals: humanize_approvals(&env.block, &info, include_expired),
        })
    }

    /// operators returns all operators owner given access to
    fn operators(
        &self,
        deps: Deps,
        env: Env,
        owner: String,
        include_expired: bool,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<OperatorsResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start_addr = maybe_addr(deps.api, start_after)?;
        let start = start_addr.map(|addr| Bound::exclusive(addr.as_ref()));

        let owner_addr = deps.api.addr_validate(&owner)?;
        let res: StdResult<Vec<_>> = self
            .operators
            .prefix(&owner_addr)
            .range(deps.storage, start, None, Order::Ascending)
            .filter(|r| {
                include_expired || r.is_err() || !r.as_ref().unwrap().1.is_expired(&env.block)
            })
            .take(limit)
            .map(parse_approval)
            .collect();
        Ok(OperatorsResponse { operators: res? })
    }

    fn approval(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        spender: String,
        include_expired: bool,
    ) -> StdResult<ApprovalResponse> {
        let token = self.tokens.load(deps.storage, &token_id)?;
        let filtered: Vec<_> = token
            .approvals
            .into_iter()
            .filter(|t| t.spender == spender)
            .filter(|t| include_expired || !t.is_expired(&env.block))
            .map(|a| cw721::Approval {
                spender: a.spender.into_string(),
                expires: a.expires,
            })
            .collect();

        if filtered.is_empty() {
            return Err(StdError::not_found("Approval not found"));
        }
        // we expect only one item
        let approval = filtered[0].clone();

        Ok(ApprovalResponse { approval })
    }

    /// approvals returns all approvals owner given access to
    fn approvals(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        include_expired: bool,
    ) -> StdResult<ApprovalsResponse> {
        let token = self.tokens.load(deps.storage, &token_id)?;
        let approvals: Vec<_> = token
            .approvals
            .into_iter()
            .filter(|t| include_expired || !t.is_expired(&env.block))
            .map(|a| cw721::Approval {
                spender: a.spender.into_string(),
                expires: a.expires,
            })
            .collect();

        Ok(ApprovalsResponse { approvals })
    }

    fn tokens(
        &self,
        deps: Deps,
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<TokensResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let owner_addr = deps.api.addr_validate(&owner)?;
        let tokens: Vec<String> = self
            .tokens
            .idx
            .owner
            .prefix(owner_addr)
            .keys(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|x| x.map(|addr| addr.to_string()))
            .collect::<StdResult<Vec<_>>>()?;

        Ok(TokensResponse { tokens })
    }

    fn all_tokens(
        &self,
        deps: Deps,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<TokensResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let tokens: StdResult<Vec<String>> = self
            .tokens
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(k, _)| k))
            .collect();

        Ok(TokensResponse { tokens: tokens? })
    }

    fn all_nft_info(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        include_expired: bool,
    ) -> StdResult<AllNftInfoResponse<T>> {
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(AllNftInfoResponse {
            access: OwnerOfResponse {
                owner: info.owner.to_string(),
                approvals: humanize_approvals(&env.block, &info, include_expired),
            },
            info: NftInfoResponse {
                token_uri: info.token_uri,
                extension: info.extension,
            },
        })
    }
}

impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    pub fn minter(&self, deps: Deps) -> StdResult<MinterResponse> {
        let minter_addr = self.minter.load(deps.storage)?;
        Ok(MinterResponse {
            minter: minter_addr.to_string(),
        })
    }

    pub fn query(&self, deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
        match msg {
            QueryMsg::Minter {} => to_binary(&self.minter(deps)?),
            QueryMsg::ContractInfo {} => to_binary(&self.contract_info(deps)?),
            QueryMsg::NftInfo { token_id } => to_binary(&self.nft_info(deps, token_id)?),
            QueryMsg::OwnerOf {
                token_id,
                include_expired,
            } => {
                to_binary(&self.owner_of(deps, env, token_id, include_expired.unwrap_or(false))?)
            }
            QueryMsg::AllNftInfo {
                token_id,
                include_expired,
            } => to_binary(&self.all_nft_info(
                deps,
                env,
                token_id,
                include_expired.unwrap_or(false),
            )?),
            QueryMsg::AllOperators {
                owner,
                include_expired,
                start_after,
                limit,
            } => to_binary(&self.operators(
                deps,
                env,
                owner,
                include_expired.unwrap_or(false),
                start_after,
                limit,
            )?),
            QueryMsg::NumTokens {} => to_binary(&self.num_tokens(deps)?),
            QueryMsg::Tokens {
                owner,
                start_after,
                limit,
            } => to_binary(&self.tokens(deps, owner, start_after, limit)?),
            QueryMsg::AllTokens { start_after, limit } => {
                to_binary(&self.all_tokens(deps, start_after, limit)?)
            }
            QueryMsg::Approval {
                token_id,
                spender,
                include_expired,
            } => to_binary(&self.approval(
                deps,
                env,
                token_id,
                spender,
                include_expired.unwrap_or(false),
            )?),
            QueryMsg::Approvals {
                token_id,
                include_expired,
            } => {
                to_binary(&self.approvals(deps, env, token_id, include_expired.unwrap_or(false))?)
            },
            QueryMsg::Config {} => to_binary(&self.get_config(deps, env)?),
            QueryMsg::MintPhase {start_after, limit} => to_binary(&self.get_mint_phase(deps, env, start_after, limit)?),
            QueryMsg::Wallet {} => to_binary(&self.get_wallet(deps, env)?),
            QueryMsg::AllWLInfo {phase_type, start_after, limit} => to_binary(&self.get_all_wl_info(deps, env, phase_type, start_after, limit)?),
            QueryMsg::WLInfo {user, phase_type} => to_binary(&self.get_wl_info(deps, env, user, phase_type)?),
            QueryMsg::ActiveMintPhase {} => to_binary(&self.get_active_mint_phase(deps, env)?),
               
        }
    }
    pub fn get_active_mint_phase(&self, deps:Deps, env: Env) -> StdResult<ActiveMintPhaseResponse> {
        let current_mint_type = self.get_active_phase_type(deps, &env);
        match current_mint_type {
            Ok(mint_type) => {
                if mint_type == "" {
                    return Err(StdError::not_found("Active mint not found"));
                }
                let mint_phase = self.mint_phase_map.load(deps.storage, &mint_type)?;
                Ok(ActiveMintPhaseResponse { 
                    mint_type: mint_phase.mint_type, 
                    mint_name: mint_phase.mint_name,
                    price: mint_phase.price,
                    start_time: mint_phase.start_time,
                    end_time: mint_phase.end_time
                })
            }
            Err(_err) => {Err(StdError::not_found("Active mint not found"))}
        } 
    }
    pub fn get_config(&self, deps: Deps, _env: Env) -> StdResult<ConfigResponse> {
        let config = self.config.load(deps.storage)?;
        let minter = self.minter.load(deps.storage)?;
        Ok(ConfigResponse {
            minter: minter.clone(),
            total_supply: config.total_supply,
            is_mint_active: config.is_mint_active,
            native_token: config.native_token,
            base_url: config.base_url,
            logo_url: config.logo_url,
            wl_count: config.wl_count,
            max_mint: config.max_mint,
        })
    }
    pub fn get_mint_phase(&self, deps: Deps, _env: Env, start_after: Option<String>, limit: Option<u32>) -> StdResult<PhaseResponse> {
        let mut limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let config = self.config.load(deps.storage)?;
        limit = limit.min(config.mint_phase_count as usize);
        let start = start_after.map(Bound::exclusive);

        let mint_phase: StdResult<Vec<MintPhase>> = self
            .mint_phase_map
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, info)| info))
            .collect();

        Ok(PhaseResponse { mint_phase: mint_phase? })
    }
    pub fn get_upgrade_phase(&self, deps: Deps, _env: Env, start_after: Option<String>, limit: Option<u32>) -> StdResult<UpgradePhaseResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let upgrade_phase: StdResult<Vec<UpgradablePhase>> = self
            .upgradable_phase_map
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, info)| info))
            .collect();

        Ok(UpgradePhaseResponse { upgrade_phase: upgrade_phase? })
    }
    pub fn get_wallet(&self, deps: Deps, _env: Env) -> StdResult<WalletResponse> {
        let wallet = self.wallet.load(deps.storage)?;
        Ok(WalletResponse {
            mint_wallet: wallet.mint_wallet,
            royalty_wallet: wallet.royalty_wallet,
        })
    }
    pub fn get_wl_info(&self, deps: Deps, _env: Env, user: Addr, phase_type: String) -> StdResult<WLInfoResponse> {
        let white_list = self.wl_map.load(deps.storage, &(user.to_string()))?;
        let size = white_list.phase_type.len();
        for index in 0..size {
            if white_list.phase_type[index] == phase_type {
                return  Ok(WLInfoResponse {
                    address: user.to_string(),
                    limit_time: white_list.limit_time[index],
                    spent_amount: white_list.spent_amount[index],
                    max_count: white_list.max_count[index],
                    price: white_list.price[index],
                });
            }
        }
        return  Ok(WLInfoResponse {
            address: user.to_string(),
            limit_time: 0,
            spent_amount: 0,
            max_count: 0,
            price: Uint128::zero(),
        });
    }
    pub fn get_upgrade_info(&self, deps: Deps, _env: Env, user: Addr) -> StdResult<UpgradeUserResponse> {
        let upgrade_info = self.upgradable_user_map.load(deps.storage, &(user.to_string()))?;
        return  Ok(UpgradeUserResponse {
            address: user.to_string(),
            spent_amount: upgrade_info.spent_amount,
            max_count: upgrade_info.max_count,
            phase_type: upgrade_info.phase_type
        });
    }
    pub fn get_all_wl_info(&self, deps: Deps, _env: Env, phase_type: String, start_after: Option<String>, limit: Option<u32>) -> StdResult<AllWLInfoResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let users: StdResult<Vec<WhiteListInfo>> = self
            .wl_map
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, info)| info))
            .filter(|item| {
                let phase = item.as_ref().unwrap().phase_type.clone();
                for index in 0..phase.len() {
                    if phase[index] == phase_type {
                       return true;
                    }
                }
                return false;
            })
            .collect();

        Ok(AllWLInfoResponse { users: users? })
    }
    pub fn get_all_upgrade_info(&self, deps: Deps, _env: Env, phase_type: String, start_after: Option<String>, limit: Option<u32>) -> StdResult<UpgradeAllUserResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let users: StdResult<Vec<UpgradableInfo>> = self
            .upgradable_user_map
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(_, info)| info))
            .filter(|item| {
                let phase = item.as_ref().unwrap().phase_type.clone();
                for index in 0..phase.len() {
                    if phase[index] == phase_type {
                       return true;
                    }
                }
                return false;
            })
            .collect();

        Ok(UpgradeAllUserResponse { users: users? })
    }
}

fn parse_approval(item: StdResult<(Addr, Expiration)>) -> StdResult<cw721::Approval> {
    item.map(|(spender, expires)| cw721::Approval {
        spender: spender.to_string(),
        expires,
    })
}

fn humanize_approvals<T>(
    block: &BlockInfo,
    info: &TokenInfo<T>,
    include_expired: bool,
) -> Vec<cw721::Approval> {
    info.approvals
        .iter()
        .filter(|apr| include_expired || !apr.is_expired(block))
        .map(humanize_approval)
        .collect()
}

fn humanize_approval(approval: &Approval) -> cw721::Approval {
    cw721::Approval {
        spender: approval.spender.to_string(),
        expires: approval.expires,
    }
}
