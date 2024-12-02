import ContinueBtn from "../components/ContinueBtn";
import InputBox from "../components/Input/InputBox";
import UploadContainer from "../components/Input/UploadContainer";
import useWallet from "../hooks/useWallet";
import { useNavigate} from "react-router-dom";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { useEffect, useState } from "react";
import { writeCreateCollectionConfigMsg, getFeeEstimate } from "../utils/messages";
import { toast } from "react-toastify";
import { useAppStore } from "../store/app";
import { isValidateCID, pinFileToIPFS, isValidateAddress } from "../utils/utils";
import { useAccountStore } from "../store/account";

export default function CreateCollection() {
    const wallet = useWallet()
    const navigate = useNavigate();
    const { simulate } = useShuttle();
    const { broadcast } = useShuttle()
    const app = useAppStore((state: any) => (state))
    const account = useAccountStore((state) => state)

    const [name, setName] = useState<string>("");
    const [symbol, setSymbol] = useState<string>("");
    const [minter, setMinter] = useState<string>("");
    const [logo_url, setLogoUrl] = useState<string>("");
    const [isCheck, setCheck] = useState<boolean>(true)

    const handleUploadFile = async (file:File) => {
        console.log("upload file info", file);
        app.setLoading(true);
        let cid = await pinFileToIPFS(wallet.account.address, file);
        if (!isValidateCID(cid)) {
            app.setLoading(false);
            toast.error("Logo CID is invalid");
            return;
        }
        setLogoUrl(cid);
        app.setLoading(false);
    };
    
    const handleWalletConnect = () => {
        toast.error("Please connect wallet")
    }
    const handleCreateBtn = async () => {
        if (wallet && wallet.account && !app.loading) {
            if (name == "" || symbol == "" || !isValidateAddress(minter)) {
                toast.error("Please confirm again");
                return;
            }
            
            app.setLoading(true);
            
            let config: CreateContractConfig = {
                name: name,
                symbol: symbol,
                minter: minter,
                code_id: Number(import.meta.env.VITE_PUBLIC_CONTRACT_CODE_ID),
                logo_url: logo_url,
            }
            let factory_config = app.factory_info;
            let create_fee = factory_config.create_fee;
            if (app.is_admin) {
                create_fee = 0;
            }
            const msgs = writeCreateCollectionConfigMsg(wallet, config, create_fee)
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
            .then((res: any) => {
                console.log("asdf", res);
                let find = false;
                app.setLoading(false);
                for (let log of res.response.logs[0].events) {
                    if (log.type === "wasm") {
                        for (let attribute of log.attributes) {
                            if (attribute.key === "contract_addr") {
                                console.log("New Contract address", attribute.value);
                                account.fetchBalance();
                                app.setRefresh()
                                let collection = {
                                    contract_address: attribute.value,
                                    minter: minter,
                                    logo_url: logo_url,
                                    name: name,
                                    symbol: symbol
                                }
                                navigate("/detail", { state: { collection: collection }});
                                find = true;
                                break;
                            }
                        }
                        if (find) {
                            break;
                        }
                    }
                }
            })
            .catch((error: any) => {
                app.setLoading(false);
                console.log(error)
                toast.error("Create Failed")                
            })
        }
    }
    useEffect (()=>{
        if (wallet && wallet.account) {
            setMinter(wallet.account.address);
        }
        setLogoUrl("");
        app.setLoading(false);
    }, [wallet,])

    return (
        <div className="flex px-2 lg:px-16 mx-auto pt-8 mb-8 min-h-[calc(100vh-358px)] relative pb-14 max-h-[calc(100vh-150px)]  overflow-y-auto">
            <div className="space-y-6 sm:px-6 lg:px-0 md:col-span-9">
                <section aria-labelledby="plan-heading">
                    <div className="gap-y-3 mt-6">
                        <div className="card border group border-gray-300 dark:border-gray-600 grow items-center !pt-2 p-4 sm:p-5">
                            <div className="lg:max-w-4xl card-body">
                                <h3 className="text-3xl text-center mt-6 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">Create NFT Launchpad</h3>
                                <div className="gap-3 my-4 w-full grid md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <InputBox label="NFT Name" placeholder="" value={name} setValue={setName}/>
                                    </div>
                                    <div>
                                        <InputBox label="NFT Symbol" placeholder="" value={symbol} setValue={setSymbol}/>
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputBox label="Owner address" placeholder="inj..." value={minter} setValue={setMinter}/>
                                    </div>
                                </div>
                                <div className="gap-x-3 mt-6 mx-auto grid md:grid-cols-2">
                                    <UploadContainer type="LOGO" isCheck = {isCheck} setCheck={setCheck} url={logo_url} handleUrl={setLogoUrl} handleUploadFile = {handleUploadFile}/>
                                </div>
                                <div className="w-full flex justify-end mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    {wallet?<ContinueBtn title="Create and Edit" handleClick={handleCreateBtn}/>
                                    :
                                    <ContinueBtn title="Connect Wallet To Continue" handleClick={handleWalletConnect}/>}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}