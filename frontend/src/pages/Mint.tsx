import INJECTIVE_IMG from "../assets/images/injective.png"
import DEFAULT_IMG from "../assets/images/empty-nft.png"
import { useLocation } from "react-router-dom";

import useWallet from "../hooks/useWallet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils';
import { getDays, todayInSeconds, getMinutes, getHours, getSeconds, IPFSCLOUDSERVER, IPFS_ACCESS_TOKEN } from "../utils/utils";
import { toast } from "react-toastify";
import {
    getUserWLConfig, getFeeEstimate, writeBuyWLConfigMsg, getMintedTokens, writeBatchMsg, getUserFactoryWLConfig, getActiveMintPhase, getMintPhaseConfig, getUserTokenIds,
} from "../utils/messages";
import { useAppStore } from "../store/app";
import MintedProgress from "../components/mint/MintedProgress";
import { useAccountStore } from "../store/account";
import NFTImage from "../components/mint/NFTImage";
import Tooltip from "../components/mint/Tooltip";
import useWindowSize from "../hooks/use-window-size";
import Modal from 'react-modal';

export default function Mint() {
    const location = useLocation();
    const { collection } = location.state;
    // const [contract_address, setContractAddress] = useState<string>("inj1lz9pf2qw724trsr4j22c5q89cn87luzqvsekcp");
    const { isMobile, isDesktop } = useWindowSize();
    const wallet = useWallet()
    const navigate = useNavigate();
    const { simulate } = useShuttle();
    const { broadcast } = useShuttle();
    const app = useAppStore((state: any) => (state))
    const account = useAccountStore((state) => state)

    const [mintedCount, setMintedCount] = useState<number>(0)
    const [owner, setOwner] = useState<string>("")
    const [totalSupply, setTotalSupply] = useState<number>(0)
    const [name, setName] = useState<string>("")
    // const [max_mint, setMaxmint] = useState<number>(0)
    const [base_url, setBaseUrl] = useState<string>("")

    const [mint_end_time, setMintEndTime] = useState<number>(0)
    const [isMintActive, setMintActive] = useState<boolean>(false)
    const [mint_price, setMintPrice] = useState<string>("0");
    const [mint_name, setMintName] = useState<string>("");
    // const [mint_type, setMintType] = useState<string>("");
    const [logo_url, setLogoUrl] = useState<string>("");

    const [isSpecialActive, setSpecialActive] = useState<boolean>(false)
    const [wl_limit_days, setWLLimitDays] = useState<number>(0);
    const [wl_price, setWLPrice] = useState<number>(0);
    // const [max_count_per_wl, setMaxCountPerWL] = useState<number>(0);

    const [user_max_wl, setUserMaxWLCount] = useState<number>(0);
    const [is_buyed, setBuyed] = useState<boolean>(false);
    // const [spent_wl, setSpentWL] = useState<number>(0)
    const [user_wl_limit_time, setUserWLLimitTime] = useState<number>(0);

    const [mint_amount, setMintAmount] = useState<number>(0);
    // const [wl_include, setWLInclude] = useState<boolean>(true);

    const [remain_time, setRemainTime] = useState<number>(0);

    const [isOpen, setOpen] = useState<boolean>(false);

    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoad, setLoaded] = useState<boolean>(false);
    const [tokenIds, setTokenIds] = useState<string[]>([]);
    const [justMintArray, setJustMintArray] = useState<string[]>([]);

    const [timeRestart, setTimeRestart] = useState<boolean>(false);
    const [phase_data, setPhaseData] = useState<MintPhaseConfig[]>([]);

    useEffect(() => {
        if (!wallet) {
            navigate("/")
            toast.error("please connect the wallet");
        }
    }, [wallet])
    useEffect(() => {
        if (mint_amount > user_max_wl) {
            setMintAmount(user_max_wl);
        }
    }, [mint_amount])

    let mint_name_temp: string = "";
    let max_mint_temp: number = 0;
    let mint_type_temp: string = "";
  
    const setCollectionBaseConfig = async (address: string) => {
        let config: CollectionTotalInfo = app.allCollectionInfos.get(address);
        setName(config.name);
        // setSymbol(config.symbol);
    }
    const setCollectionConfig = async (address: string) => {
        let config: CollectionConfig = app.allCollectionInfos.get(address).collection_config;
        setOwner(config.minter);
        setTotalSupply(config.total_supply);
        setMintActive(config.is_mint_active);
        setBaseUrl(config.base_url);
        if (config.logo_url == "") {
            setLogoUrl(collection.logo_url);
        } else {
            setLogoUrl(config.logo_url);
        }
        let token_nums = await getMintedTokens(address);
        if (token_nums != null) {
            setMintedCount(token_nums.count);
        }
        // setMaxmint(config.max_mint);
        max_mint_temp = config.max_mint;
    }
    const setMintPhaseConfig = async (address: string) => {
        let mint_phase: MintPhaseConfig[] = [];
        try {
            let mintPhaseInfo = await getMintPhaseConfig(address);
            if (mintPhaseInfo != null) {                
                for (let phase of mintPhaseInfo.mint_phase) {
                    let temp: MintPhaseConfig = { ...phase }
                    temp.start_time = temp.start_time + app.time_diff;
                    temp.end_time = temp.end_time + app.time_diff;
                    temp.price = new BigNumberInWei(temp.price).toBase().toNumber().toString(),
                        mint_phase.push(temp);
                }

                setPhaseData(mint_phase)
            }
        } catch (error) {
            console.log(error)
        }

        let mintPhaseInfo: MintPhaseConfig = await getActiveMintPhase(address);//app.allCollectionInfos.get(address).active_phase;
        if (mintPhaseInfo != null){
            // setMintType(mintPhaseInfo.mint_type);
            mint_type_temp = mintPhaseInfo.mint_type;
            setMintName(mintPhaseInfo.mint_name);
            mint_name_temp = mintPhaseInfo.mint_name;
            setMintPrice(new BigNumberInWei(mintPhaseInfo.price).toBase().toNumber().toString());
        }
        setMintEndTime(getUntilNextPhaseTimeByCurrent(mint_phase));

        let token_newIds: [] = await getUserTokenIds(address, wallet);
        if (token_newIds){
            setTokenIds(token_newIds);
        }
        setTimeRestart(!timeRestart);
    }
    const getUntilNextPhaseTimeByCurrent = (mint_phase: MintPhaseConfig[]) => {
        for (let phase_index = 0; phase_index < mint_phase.length; phase_index ++) {
            let now = todayInSeconds();
            
            if (now >= mint_phase[phase_index].start_time) {
                if (now <= mint_phase[phase_index].end_time){
                    if ((phase_index + 1) < mint_phase.length) {
                        return mint_phase[phase_index + 1].start_time;
                    }else{
                        return mint_phase[phase_index].end_time;
                    }
                }else{
                    continue;
                }
            }else{
                return mint_phase[phase_index].start_time;
            }

        }
        return todayInSeconds();
    }
    const setSpecialOfferConfig = async () => {
        let app_config = app.factory_info;
        setWLLimitDays(getDays(app_config.wl_limit_time));
        setWLPrice(app_config.wl_price);
        // setMaxCountPerWL(app_config.max_count_per_wl);
        setSpecialActive(app.is_special_offer_active);
    }
    const setUserWLInfo = async (address: string) => {
        try {
            let limit_time = 0;
            let wl_info = await getUserWLConfig(address, mint_type_temp, wallet);
            if (wl_info != null && wl_info.limit_time != 0) {
                limit_time = wl_info.limit_time + app.time_diff;
                // setUserWLLimitTime(limit_time);
                // setSpentWL(wl_info.spent_amount);
                console.log("limit_days", getDays(limit_time - todayInSeconds()))
                let buyed = limit_time > todayInSeconds();
                setBuyed(buyed);
                if (mint_name_temp.toLowerCase() != "public") {
                    if (buyed) {                        
                        setUserMaxWLCount(wl_info.max_count - wl_info.spent_amount);
                    }else {
                        setUserMaxWLCount(0);
                    }
                } else {
                    setUserMaxWLCount(wl_info.max_count - wl_info.spent_amount);
                }
                setUserWLLimitTime(buyed? getDays(limit_time - todayInSeconds()) + 1 : 0);
                setMintPrice(new BigNumberInWei(wl_info.price).toBase().toNumber().toString());
            } else {
                if (mint_name_temp.toLowerCase() == "public") {
                    setUserMaxWLCount(max_mint_temp);
                } else {
                    setUserMaxWLCount(0);
                }
            }
            
            if (limit_time < todayInSeconds()) {
                wl_info = await getUserFactoryWLConfig(import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT, wallet);
                if (wl_info != null) {
                    limit_time = wl_info.limit_time + app.time_diff;
                    if ( limit_time > todayInSeconds()) {
                        // setUserWLLimitTime(limit_time);
                        // setSpentWL(wl_info.spent_amount);
                        let buyed = limit_time > todayInSeconds();
                        setBuyed(buyed);
                        
                        setUserWLLimitTime(buyed? getDays(limit_time - todayInSeconds()) + 1 : 0);
                        // return;
                    }
                }
            }
            
            // setWLInclude(true);
        } catch (error) {
            console.log(error)
        }
    }
    const handleBuySpecialOffer = async () => {
        if (wallet && wallet.account && !app.loading && isSpecialActive) {
            if (user_max_wl > 0) {
                toast.error("You are already white member.")
                return;
            }
            app.setLoading(true)
            let fee = wl_price;
            // if (wallet.account.address == owner) {
            //     fee = 0;
            // }
            const msgs = writeBuyWLConfigMsg(wallet, fee)
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then(() => {
                    app.setLoading(false);
                    account.fetchBalance();
                    toast.success("Save Successed")
                })
                .catch((error: any) => {
                    app.setLoading(false)
                    toast.error("Save Failed")
                    console.log(error)
                })
        } else {
            toast.error("Sorry, can't buy now");
        }
    }
    const mintRefresh = async () => {
        let token_nums = await getMintedTokens(collection.contract_address);
        if (token_nums != null) {
            setMintedCount(token_nums.count);
        }
        await setMintPhaseConfig(collection.contract_address);
    }
    const isAvailableMint = () => {
        if (isMintActive && (mint_end_time > todayInSeconds()) && (mint_name.toLowerCase() == "public" || is_buyed )){
            return true;
        }
        return false;
    }

    const handleBatchMint = async () => {
        if (mint_amount > totalSupply - mintedCount) {
            toast.error("Insufficient NFT")
            return;
        }
        if (wallet && wallet.account && isAvailableMint()) {
            if (mint_amount <= 0) {
                toast.error("Please input mint amount");
                return;
            }
            app.setLoading(true)
            let extensions = {}
            
            let fee = new BigNumberInBase(new BigNumberInWei(mint_price).toBase().toNumber() * mint_amount).toWei().toFixed();
            if (wallet.account.address == owner) {
                fee = "0";
            }
            const msgs = writeBatchMsg(collection.contract_address, wallet, mint_amount, wallet.account.address, extensions, fee);
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then((message) => {
                    let justArray:string[] = [];
                    for (let log of message.response.logs[0].events) {
                        if (log.type === "wasm") {
                            for (let attribute of log.attributes) {
                                if (attribute.key === "token_ids") {
                                    console.log("New Contract address", attribute.value);                                    
                                    let original_ids:string[] = [...tokenIds]
                                    justArray = attribute.value.split(',');
                                    original_ids.push(...justArray);
                                    setJustMintArray(justArray);
                                    setTokenIds(original_ids);
                                }
                            }
                        }
                    }
                    app.setLoading(false);
                    account.fetchBalance();                    
                    setOpen(true);
                    let new_amount = mintedCount + justArray.length;
                    let new_mintable_amount = user_max_wl - justArray.length;
                    setMintedCount(new_amount);
                    setUserMaxWLCount(new_mintable_amount);
                    setMintAmount(0);
                    toast.success("Mint Successed")
                })
                .catch((error: any) => {
                    app.setLoading(false)
                    toast.error("Mint Failed")
                    console.log(error)
                })
        } else {
            toast.error("Sorry, can't mint now");
        }
    }
    
    useEffect(() => {
        (async () => {
            app.setLoading(true)
            if (collection.contract_address && app.allCollectionInfos.size != undefined && app.allCollectionInfos.get(collection.contract_address) != undefined) {
                setCollectionBaseConfig(collection.contract_address)
                await setMintPhaseConfig(collection.contract_address)

                setCollectionConfig(collection.contract_address)
                
                setSpecialOfferConfig()
                setUserWLInfo(collection.contract_address)
            }
            app.setLoading(false)
        })();
    }, [collection, app.allCollectionInfos])
    useEffect(() => {
        const interval = setInterval(() => {
            let duration = getDurationUntilNext();  
            setRemainTime(duration);

            if (mint_name.toLowerCase() == "public") {
                setRemainTime(0);
                clearInterval(interval);
                return;
            }

            if (duration == 0){
                clearInterval(interval);
                if (phase_data.length == 0) {
                    return;
                }
                setTimeout(()=>{
                    mintRefresh();
                }, 3000);
            }
            // if (duration % 3 == 0) {
            //     setTimeout(()=>{
            //         getMintedTokens(collection.contract_address).then((token_nums:any) => {
            //             if (token_nums != null) {
            //                 setMintedCount(token_nums.count);
            //             }
            //         })
            //     }, 0);
            // }
            
        }, 1000);
        return () => clearInterval(interval);
    }, [timeRestart])
    const getDurationUntilNext = () => {
        let limit = mint_end_time - todayInSeconds();
        if (limit < 0) {
            limit = 0;
        }
        return limit;
    }
    const handleMintCount = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isNaN(Number(event.target.value))) {
            setMintAmount(Number(event.target.value));
        } else {
            setMintAmount(0);
        }
    };
    const setHidden = () => {
        setJustMintArray([]);
        setOpen(false); 
    }
    useEffect(() => {
        if (logo_url != "") {
            let imageUrl = `https://${IPFSCLOUDSERVER}/ipfs/${logo_url}?pinataGatewayToken=${IPFS_ACCESS_TOKEN}`;
            let image = new Image()
            image.src = imageUrl
            console.log("image load", imageUrl);
            image.onload = () => {
                setImageUrl(imageUrl);
                setLoaded(true)
            }
        }
    }, [logo_url])
    return (
        <main className="flex flex-col mb-20 max-h-[calc(100vh-150px)]  overflow-y-auto">
            <Modal isOpen={isOpen} onRequestClose={() => setOpen(false)} ariaHideApp={false} className="flex w-full h-full justify-center items-center">
                <div className="flex flex-col max-w-4xl justify-center items-center bg-[#1f2937] rounded-xl gap-10 p-10">
                    <div className="flex flex-wrap max-h-[calc(100vh-250px)] overflow-y-auto gap-3 justify-center">
                        {justMintArray.map((token_id) => (
                            <NFTImage key={token_id} token_uri={`ipfs://${base_url}/${token_id}.json`} />
                        ))}
                    </div>
                    <button className="w-[17rem] h-[2.5rem] dark:bg-black rounded-lg text-2xl" onClick={setHidden}>OK</button>
                </div>
            </Modal>
            <div className="flex flex-col items-center justify-center mt-10">
                <h1 className={`${isDesktop ? "text-[6rem]" : "text-5xl"} font-bold`}>INJMARKET</h1>
                <p className={`${isDesktop ? "text-2xl" : "text-xl"}`}>AOI X MIB</p>
            </div>
            <div className="w-full items-center justify-center flex flex-wrap mt-10 gap-5">
                <div className="flex flex-col items-center gap-5">
                    <div className="flex flex-row flex-wrap justify-center gap-5">
                        <div className="max-w-[400px]">
                            {isLoad ? <img className="w-[17rem] h-full object-cover rounded-xl" src={imageUrl} /> :
                                <img className="w-[20rem] h-full object-cover rounded-xl" src={DEFAULT_IMG} />}
                        </div>
                        <div className={`flex items-center ${isMobile ? "p-2" : "p-5"} flex-col gap-5 dark:bg-gray-800 border dark:border-gray-700 rounded-xl`}>
                            <h3 className="text-2xl">{name}</h3>
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <button className="w-[2.5rem] h-[2.5rem] dark:bg-black rounded-lg hover:dark:bg-gray-900" onClick={() => (mint_amount && setMintAmount(mint_amount - 1))}>-</button>
                                    <input className="rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-lg text-center hover:dark:bg-gray-900" type="text" value={mint_amount.toString()} onChange={handleMintCount}></input>
                                    <button className="w-[2.5rem] h-[2.5rem] dark:bg-black rounded-lg hover:dark:bg-gray-900" onClick={() => (setMintAmount(mint_amount + 1))}>+</button>
                                </div>
                                {isMintActive && remain_time > 0 ? <p className="font-bold">{`${getDays(remain_time) > 0 ? getDays(remain_time) + " D " + getHours(remain_time) + " H " + getMinutes(remain_time) + " M ": 
                                        getHours(remain_time) + " H " + getMinutes(remain_time) + " M " + getSeconds(remain_time) + " S " } UNTIL NEXT PHASE`}</p>
                                        : mint_name.toLowerCase() != "public" && <p className="font-bold">Now mint is not available</p>}
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm">Max mint Amount: {user_max_wl}</p>
                                <div className="flex items-center gap-1">
                                    <p className="text-xl">PRICE: {mint_price}</p>
                                    <img src={INJECTIVE_IMG} className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button className={`${isDesktop ? "w-[21rem]" : "w-[17rem]"} h-[2.5rem] ${isAvailableMint() ? "dark:bg-black hover:dark:bg-gray-900 text-white" : "dark:bg-gray-700/70 text-slate-400"} rounded-lg text-2xl`} onClick={handleBatchMint}>MINT</button>
                                {mint_name.toLowerCase() != "public" && <p className="text-sm">(WL PHASE)</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col w-2/3 items-center gap-2">
                        <MintedProgress minted={mintedCount} total_supply={totalSupply} />
                        <p className="text-sm">MINTED NFTS</p>
                    </div>
                </div>
                {isSpecialActive && 
                <div className="flex flex-col gap-3 relative">
                    <div className="flex items-center p-5 flex-col gap-3 dark:bg-gray-800 border dark:border-gray-700 rounded-xl">
                        <div className="relative flex w-full justify-center">
                            <h5 className="text-2xl font-bold">SUBSCRIPTION</h5>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-lg">GET EXCLUSIVE BENEFITS</p>
                            <p className="text-lg">FOR UPCOMING MINTS</p>
                        </div>
                        {is_buyed ?
                            <div className="flex flex-col justify-center items-center dark:bg-green-700 px-4 rounded-lg">
                                <p className="text-2xl text-green-200">Purchased</p>
                                <p className="text-md bold text-green-200">{user_wl_limit_time}days left</p>
                            </div> :
                            <button className={`flex px-5 gap-1 h-[2.5rem] ${isSpecialActive? "dark:bg-black hover:dark:bg-gray-900" : "dark:bg-gray-700/70"} rounded-lg text-2xl justify-center items-center`} onClick={handleBuySpecialOffer}>
                                <p className={`text-2xl ${isSpecialActive? "text-white" : "text-slate-400"}`}>BUY</p>
                                <p className={`text-sm text-center ml-2 ${isSpecialActive? "text-white" : "text-slate-400"}`}>{wl_price}</p>
                                <img src={INJECTIVE_IMG} className="w-3 h-3" />
                            </button>
                        }
                        <p className="text-sm">(SUBSCRIPTION VALID FOR {wl_limit_days} FROM PURCHASE)</p>

                    </div>
                    <div className="absolute right-2 top-2 w-full">
                        <Tooltip
                            tooltipText={`${tooltip1}${wl_price}${tooltip2}`} position="top">
                            <div className="flex w-full justify-end">
                                <button className="w-[2rem] h-[2rem] p-1 dark:bg-gray-800 border dark:border-gray-700 rounded-full items-center hover:dark:bg-gray-900">?</button>
                            </div>
                        </Tooltip>
                    </div>
                </div>}
            </div>

        </main>

    )
}
const tooltip1 = "Buying the Injmarket Subscription for "
const tooltip2 = " INJ will grant you the chance to receive exclusive wl spots for upcoming mints! Weekly raffles and Exclusive mint discounts. Even if you have bought the Subscription we do not guarantee that you will get whitelisted on any projects, we do not guarantee you will win any raffles, and we do not guarantee you will get any discounted mints. This purchase is non-refundable."