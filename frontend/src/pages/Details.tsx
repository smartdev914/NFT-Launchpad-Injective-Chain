import { useLocation } from "react-router-dom";
import ContinueBtn from "../components/ContinueBtn";
import InputBox from "../components/Input/InputBox";
import InputBoxMax from "../components/Input/InputBoxMax";
import UploadContainer from "../components/Input/UploadContainer";
import useWallet from "../hooks/useWallet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { BigNumberInWei, BigNumberInBase } from '@injectivelabs/utils';
import { todayInSeconds, nFormatter, isValidateAddress, pinFileToIPFS, isValidateCID, JWT, copyClipboard } from "../utils/utils";
import { toast } from "react-toastify";
import { getCollectionConfig, getWalletConfig, getMintPhaseConfig, getFeeEstimate, writeCollectionConfigMsg, writeMintPhaseConfigMsg, writeMintActiveMsg } from "../utils/messages";
import { useAppStore } from "../store/app";
import Phase from "../components/phase/Phase";
import useWindowSize from "../hooks/use-window-size";
import axios from "axios";
import FormData from "form-data";
import Progress from "../components/Progress";
import WLEdit from "./WLEdit";
import PreMint from "./PreMint";

export default function Details() {
    const location = useLocation();
    const { collection } = location.state;
    // const [contract_address, setContractAddress] = useState<string>("inj1mhrwx2emvqr5dtln83ed6ag5svagzwvzy2cv7t");
    const wallet = useWallet()
    const navigate = useNavigate();
    const { simulate } = useShuttle();
    const { broadcast } = useShuttle();
    const app = useAppStore((state: any) => (state))
    const { isMobile } = useWindowSize();
    const [progress, setProgress] = useState<number>(0);

    const [minter, setMinter] = useState<string>("");

    const [logo_url, setLogoUrl] = useState<string>("")
    const [token_base_url, setTokenBaseUrl] = useState<string>("")
    const [art_base_CID, setArtBaseCID] = useState<string>("")

    const [fee_token, setFeeToken] = useState<string>("inj");
    const [mint_fee_wallet, setMintFeeWallet] = useState<string>("");
    const [first_royalty_wallet, _setFirstRoyaltyWallet] = useState<RoyaltyWallet>({ percent: 300, wallet: "inj1qmd55hzngt4trleudqffez5myj6c37lsdfq3kz" });
    const [second_royalty_wallet, setSecondRoyaltyWallet] = useState<RoyaltyWallet>({ percent: 1, wallet: "" });
    const [totalSupply, setTotalSupply] = useState<number>(1000);
    const [isMintActive, setMintActive] = useState<boolean>(false);

    const [isUploadTokenUrlCheck, setUploadTokenUrl] = useState<boolean>(true)
    const [isUploadArtCheck, setUploadArt] = useState<boolean>(true)
    const [isUploadLogoCheck, setUploadLogo] = useState<boolean>(true)
    const [isExtraSpecialWallet, setExtraSpecialWallet] = useState<boolean>(true);
    const [phase_data, setPhaseData] = useState<MintPhaseConfig[]>([]);
    const [max_mint, setMaxMint] = useState<number>(10);

    const [isOpen, setModalOpen] = useState<boolean>(false);
    const [isPreMintOpen, setPreMintOpen] = useState<boolean>(false);
    const [selectPhase, setSelectPhase] = useState<MintPhaseConfig>({mint_type: "1",
                                                                        mint_name: "First",
                                                                        price: "1",
                                                                        start_time: todayInSeconds(),
                                                                        end_time: todayInSeconds(),});

    const pinJsonBufferToIPFS = async (name: string, jsonBuffer: []) => {
        try {
            const data = new FormData();
            let count = 0;
            const promises = jsonBuffer.map(async (json, index) => {
                const filename = `metadata/${index + 1}.json`;
                const jsonString = JSON.stringify(json);
                const blob = new Blob([jsonString], { type: 'application/json' });
                await new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        //@ts-ignore
                        data.append('file', new File([reader.result!], filename, { type: blob.type }));
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });
                count++;
            });

            await Promise.all(promises);

            setTotalSupply(count);
            const metadata = JSON.stringify({
                name: name,
            });
            data.append('pinataMetadata', metadata);
            const options = JSON.stringify({
                cidVersion: 0,
            })
            data.append('pinataOptions', options);

            const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
                maxContentLength: Infinity,
                headers: {
                    'Content-Type': `multipart/form-data`,
                    Authorization: `Bearer ${JWT}`
                },
                onUploadProgress: data => {
                    //Set the progress value to show the progress bar
                    setProgress(Math.round((100 * data.loaded) / data.total))
                },
            });
            console.log("upload tokenUrl", res.data);
            return res.data.IpfsHash;
        } catch (error) {
            console.log("upload tokenUrl", error);
            return "";
        }

    }

    const pinArtToIPFS = async (art_name: string, file: FileList) => {
        const formData = new FormData();

        Array.from(file).forEach((file) => {
            formData.append("file", file)
        })

        const metadata = JSON.stringify({
            name: art_name,
        });
        formData.append('pinataMetadata', metadata);

        const options = JSON.stringify({
            cidVersion: 0,
        })
        formData.append('pinataOptions', options);

        try {
            const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
                maxContentLength: Infinity,
                headers: {
                    'Content-Type': `multipart/form-data`,
                    Authorization: `Bearer ${JWT}`
                },
                onUploadProgress: data => {
                    //Set the progress value to show the progress bar
                    console.log("progress", Math.round((100 * data.loaded) / data.total))
                    setProgress(Math.round((100 * data.loaded) / data.total))
                },
            });
            console.log("upload Art", res.data);
            return res.data.IpfsHash;
        } catch (error) {
            console.log("upload Art failed", error);
            return "";
        }
    }

    const handleUploadArt = async (file: FileList) => {
        app.setLoading(true);
        console.log("upload Art files info", file);
        let cid = await pinArtToIPFS(collection.contract_address + "_media", file);
        if (!isValidateCID(cid)) {
            app.setLoading(false);
            toast.error("ART CID is invalid");
            return;
        }
        setArtBaseCID(cid);
        localStorage.setItem(collection.contract_address + "_media", cid);
        app.setLoading(false);
    };

    const handleUploadTokenUrl = async (file: File) => {
        if (art_base_CID == "Qm...") {
            toast.error("Please set the CID of ART");
            return;
        }
        console.log("upload token uri info", file);
        if (file) {
            const reader = new FileReader();

            reader.onload = async () => {
                app.setLoading(true);
                const fileContent = reader.result as string;
                const replacedString = fileContent.replace(/["']/g, '').replace(/,/g, '');
                const rows = replacedString.split('\r\n');
                const csvData = rows.map((row) => row.split(';'));
                const headers = csvData[0];
                const jsonData: any = [];
                csvData.forEach((item, index) => {
                    if (index == 0 || item.length < 2) {
                        return;
                    }
                    const rowData: { [key: string]: string } = {};
                    headers.forEach((header, index) => {
                        if (header.toLowerCase() == "filename" || (header.toLowerCase() == "media") || (header.toLowerCase() == "image")) {
                            rowData["media"] = `ipfs://${art_base_CID}/${item[index]}`;
                        } else {
                            rowData[header] = item[index];
                        }
                    });
                    jsonData.push(rowData);
                })
                console.log("CSV DATA", jsonData);
                let cid = await pinJsonBufferToIPFS(collection.contract_address, jsonData);
                if (!isValidateCID(cid)) {
                    app.setLoading(false);
                    toast.error("Token Base CID is invalid");
                    return;
                }
                setTokenBaseUrl(cid);
                localStorage.setItem(collection.contract_address + "_tokenBase", cid);
                app.setLoading(false);
            };

            reader.readAsText(file);
        }
        // await pinJSONToIPFS();
    };
    const handleUploadLogoFile = async (file: File) => {
        console.log("upload file info", file);
        app.setLoading(true);
        let cid = await pinFileToIPFS(wallet.account.address, file);
        if (!isValidateCID(cid)) {
            app.setLoading(false);
            toast.error("Logo CID is invalid");
            return;
        }
        setLogoUrl(cid);
        localStorage.setItem(collection.contract_address + "_logoUrl", cid);
        app.setLoading(false);
    };

    useEffect(() => {
        if (!wallet) {
            navigate("/")
            console.log("wallet null")
        }
    }, [wallet])
    const setCollectionConfig = async (address: string) => {
        try {
            let config = await getCollectionConfig(address);
            if (config != null) {
                setMinter(config.minter);
                setTotalSupply(config.total_supply);
                setMaxMint(config.max_mint);
                setMintActive(config.is_mint_active);
                setFeeToken(config.native_token);
                if (config.base_url == "") {
                    let saved_base_url = localStorage.getItem(collection.contract_address + "_tokenBase");
                    if (saved_base_url != null) {
                        setTokenBaseUrl(saved_base_url);
                    }
                } else {
                    setTokenBaseUrl(config.base_url);
                }
                if (config.logo_url == "") {
                    let saved_logo_url = localStorage.getItem(collection.contract_address + "_logoUrl");
                    if (saved_logo_url != null) {
                        setLogoUrl(saved_logo_url);
                    } else {
                        if (collection.logo_url != "") {
                            setLogoUrl(collection.logo_url);
                        }
                    }
                } else {
                    setLogoUrl(config.logo_url);
                }
                let saved_art_cid = localStorage.getItem(collection.contract_address + "_media");
                if (saved_art_cid != null) {
                    setArtBaseCID(saved_art_cid);
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
    const setMintPhaseConfig = async (address: string) => {
        try {
            console.log("setMintPhaseConfig");
            let mintPhaseInfo = await getMintPhaseConfig(address);
            if (mintPhaseInfo != null) {
                let mint_phase: MintPhaseConfig[] = [];
                for (let phase of mintPhaseInfo.mint_phase) {
                    let temp: MintPhaseConfig = { ...phase }
                    temp.start_time = temp.start_time + app.time_diff;
                    temp.end_time = temp.end_time + app.time_diff;
                    temp.price = new BigNumberInWei(temp.price).toBase().toNumber().toString(),
                        mint_phase.push(temp);
                }
                if (mint_phase.length == 0) {
                    let new_phase = {
                        mint_type: "1",
                        mint_name: "First",
                        price: "1",
                        start_time: todayInSeconds(),
                        end_time: todayInSeconds(),
                    }
                    mint_phase.push(new_phase);
                }

                setPhaseData(mint_phase)
            }
        } catch (error) {
            console.log(error)
        }
    }
    const setWalletConfig = async (address: string) => {
        try {
            let walletInfo = await getWalletConfig(address);
            if (walletInfo != null) {
                setMintFeeWallet(walletInfo.mint_wallet);

                for (let index = 0; index < walletInfo.royalty_wallet.length; index++) {
                    if (index == 0) {
                        // setFirstRoyaltyWallet(walletInfo.royalty_wallet[index]);
                    } else if (index == 1) {
                        setSecondRoyaltyWallet(walletInfo.royalty_wallet[index]);
                        setExtraSpecialWallet(true);
                    }
                }
            }

        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        (async () => {
            if (collection) {
                setCollectionConfig(collection.contract_address)
                setMintPhaseConfig(collection.contract_address)
                setWalletConfig(collection.contract_address)
            }
        })();
    }, [collection])

    const handleConfigSave = async () => {
        if (wallet && wallet.account && !app.loading) {
            if (!isValidateAddress(minter) || !isValidateAddress(mint_fee_wallet)) {
                toast.error("Please confirm again");
                return;
            }
            app.setLoading(true);
            let royalty_wallet: RoyaltyWallet[] = [];
            if (isValidateAddress(first_royalty_wallet.wallet)) {
                royalty_wallet.push(first_royalty_wallet);
            }
            if (isExtraSpecialWallet && isValidateAddress(second_royalty_wallet.wallet)) {
                royalty_wallet.push(second_royalty_wallet);
            }
            let config = {
                minter: minter,
                total_supply: totalSupply,
                max_mint: max_mint,
                native_token: fee_token,
                base_url: token_base_url,
                logo_url: logo_url,
                mint_wallet: mint_fee_wallet,
                royalty_wallet: royalty_wallet
            }
            const msgs = writeCollectionConfigMsg(wallet, config, collection.contract_address)
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then(() => {
                    app.setLoading(false);
                    app.setRefresh();
                    toast.success("Save Successed")
                })
                .catch((error: any) => {
                    app.setLoading(false);
                    console.log(error)
                    toast.error("Save Failed")

                })
        }
    }
    const handleMintPhaseSave = async () => {
        if (wallet && wallet.account && !app.loading) {
            app.setLoading(true);
            if (phase_data.length == 0) {
                app.setLoading(false);
                toast.success("Please add the phase");
                return;
            }
            let mint_phase: MintPhaseConfig[] = [];
            for (let phase of phase_data) {
                let temp = { ...phase };
                temp.start_time = temp.start_time - app.time_diff;
                temp.end_time = temp.end_time - app.time_diff;
                temp.price = new BigNumberInBase(temp.price).toWei().toFixed(),
                mint_phase.push(temp);
            }
            const msgs = writeMintPhaseConfigMsg(wallet, mint_phase, collection.contract_address)
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then(() => {
                    app.setLoading(false);
                    app.setRefresh();
                    toast.success("Save Successed")

                })
                .catch((error: any) => {
                    app.setLoading(false);
                    toast.error("Save Failed")
                    console.log(error)
                })
        }
    }

    const handleExtraWalletChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setExtraSpecialWallet(event.target.checked);
    };
    const handleFirstRoyaltyWallet = (_value: string) => {
        // setFirstRoyaltyWallet({ percent: first_royalty_wallet.percent, wallet: value })
    }
    const handleFirstRoyaltyPercent = (_value: number) => {
        // setFirstRoyaltyWallet({ percent: Number(value) * 10, wallet: first_royalty_wallet.wallet })
    }
    const handleSecondRoyaltyWallet = (value: string) => {
        setSecondRoyaltyWallet({ percent: second_royalty_wallet.percent, wallet: value })
    }
    const handleSecondRoyaltyPercent = (value: number) => {
        setSecondRoyaltyWallet({ percent: Number(value) * 10, wallet: second_royalty_wallet.wallet })
    }
    const handleSetPhase = (data: MintPhaseConfig) => {
        let new_phase_state: MintPhaseConfig[] = [];
        let new_mint_type = 1;
        for (let index = 0; index < phase_data.length; index++) {
            let old_phase = phase_data[index];
            let new_phase: MintPhaseConfig = { ...old_phase }
            if (new_phase.mint_type === data.mint_type) {
                if (data.start_time == 0) {
                    continue;
                } else {
                    new_phase = { ...data };
                }
            }
            new_phase.mint_type = new_mint_type.toString();
            new_phase_state.push(new_phase);
            new_mint_type++;
        }
        setPhaseData(new_phase_state);
        console.log("1111", new_phase_state);
    }

    const handleAddPhase = () => {
        let newPhase = {
            mint_type: (phase_data.length + 1).toString(),
            mint_name: "New",
            price: "1",
            start_time: todayInSeconds(),
            end_time: todayInSeconds(),
        }
        const updatedPhaseData = [...phase_data, newPhase];
        setPhaseData(updatedPhaseData);
        console.log("new phase", phase_data);
    }
    const handlePhaseActive = async () => {
        if (wallet && wallet.account && !app.loading) {
           
            app.setLoading(true)
            const msgs = writeMintActiveMsg(wallet, !isMintActive, collection.contract_address)
            if (!isMintActive) {
                if (phase_data.length == 0) {
                    app.setLoading(false);
                    toast.success("Please add the phase");
                    return;
                }
                let mint_phase: MintPhaseConfig[] = [];
                for (let phase of phase_data) {
                    let temp = { ...phase };
                    temp.start_time = temp.start_time - app.time_diff;
                    temp.end_time = temp.end_time - app.time_diff;
                    temp.price = new BigNumberInBase(temp.price).toWei().toFixed(),
                    mint_phase.push(temp);
                }
                const msgs2 = writeMintPhaseConfigMsg(wallet, mint_phase, collection.contract_address)
                msgs.push(msgs2[0]);
            }
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then(() => {
                    app.setLoading(false)
                    app.setRefresh();
                    setMintActive(!isMintActive);
                    toast.success("Successed")

                })
                .catch((error: any) => {
                    console.log(error)
                    app.setLoading(false)
                    toast.error("Failed")
                })
        }
    }
    const handleWLEdit = async(phase_type:MintPhaseConfig) => {

        setSelectPhase(phase_type);
        setModalOpen(true);
    }
    const handlePresale = async () => {
        setPreMintOpen(true);
    }
    return (
        <div className={`flex w-full justify-center px-8 lg:px-16 mx-auto pt-8 mb-8 relative pb-14 ${isMobile && "px-1"} max-h-[calc(100vh-150px)]  overflow-y-auto`}>
            <div className="space-y-6 md:col-span-9">
                <section aria-labelledby="plan-heading">
                    <div className="gap-y-3 mt-3">
                        <div className="card border group border-gray-300 dark:border-gray-600 grow items-center !pt-2 p-0 sm:p-5">
                            <div className="w-full lg:max-w-4xl card-body">
                                {/* ----------------------------------------------------------- */}
                                <h3 className="text-3xl text-center mt-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">Edit NFT Info</h3>
                                <div className="gap-3 my-4 w-full grid md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <label className="text-sm block mb-1 font-medium text-gray-900 dark:text-gray-300">Contract Address</label>
                                        <span className="address cursor-pointer text-right text-sm font-sans text-ellipsis overflow-hidden" onClick={() => copyClipboard(collection.contract_address)} title="Click to copy address to clipboard.">
                                            {collection.contract_address}
                                        </span>
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputBox label="Owner" placeholder="inj..." value={minter} setValue={setMinter} />
                                    </div>
                                    <div>
                                        <InputBoxMax label="Total supply" tag={nFormatter(totalSupply, 2)} value={totalSupply.toString()} setValue={setTotalSupply} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputBox label="Minting fees destination address" placeholder="inj..." value={mint_fee_wallet} setValue={setMintFeeWallet} />
                                    </div>
                                    <div>
                                        <InputBoxMax label="Max Mint(wallet)" tag={nFormatter(max_mint, 2)} value={max_mint.toString()} setValue={setMaxMint} />
                                    </div>
                                    <div className="flex items-center gap-5 md:col-span-2 mt-2">
                                        <label className="text-sm block font-medium text-gray-900 dark:text-gray-300">Royalty destination address</label>
                                        <label className="flex items-center space-x-2">
                                            <input className="form-switch h-5 w-10 rounded-full bg-slate-300 before:rounded-full before:bg-slate-50 checked:!bg-emerald-600 checked:before:bg-white dark:bg-navy-900 dark:before:bg-navy-300 dark:checked:before:bg-white" type="checkbox" checked={isExtraSpecialWallet} onChange={handleExtraWalletChanged} />
                                            <span>Additional wallet</span>
                                        </label>
                                    </div>
                                    <div className="mt-2">
                                        <label className="text-sm block font-medium text-gray-900 dark:text-gray-300">Royalty Percent</label>
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputBox label="" placeholder="inj..." value={first_royalty_wallet.wallet} setValue={handleFirstRoyaltyWallet} />
                                    </div>
                                    <div>
                                        <InputBoxMax label="" tag="%" value={(first_royalty_wallet.percent / 10).toString()} setValue={handleFirstRoyaltyPercent} />
                                    </div>
                                    {isExtraSpecialWallet && <>
                                        <div className="md:col-span-2">
                                            <InputBox label="" placeholder="inj..." value={second_royalty_wallet.wallet} setValue={handleSecondRoyaltyWallet} />
                                        </div>
                                        <div>
                                            <InputBoxMax label="" tag="%" value={(second_royalty_wallet.percent / 10).toString()} setValue={handleSecondRoyaltyPercent} />
                                        </div>
                                    </>}
                                </div>
                                <div className="gap-x-3 mt-6 mx-auto grid md:grid-cols-2">
                                    <UploadContainer type="LOGO" isCheck={isUploadLogoCheck} setCheck={setUploadLogo} url={logo_url} handleUrl={setLogoUrl} handleUploadFile={handleUploadLogoFile} />
                                </div>
                                <div className="gap-x-3 mt-6 mx-auto grid md:grid-cols-2">
                                    <UploadContainer type="ART" isCheck={isUploadArtCheck} setCheck={setUploadArt} url={art_base_CID} handleUrl={setArtBaseCID} handleUploadFile={handleUploadArt} />
                                </div>
                                <div className="gap-x-3 mt-6 mx-auto grid md:grid-cols-2">
                                    <UploadContainer type="NFT" isCheck={isUploadTokenUrlCheck} setCheck={setUploadTokenUrl} url={token_base_url} handleUrl={setTokenBaseUrl} handleUploadFile={handleUploadTokenUrl} />
                                </div>
                                <div className="w-full flex justify-end gap-20 items-center pb-3 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex w-full">
                                        {progress ? <Progress minted={progress}/> : <></>}
                                    </div>
                                    <ContinueBtn title="Save" handleClick={handleConfigSave} />
                                </div>

                                {/* ----------------------------------------------------------- */}
                                <h3 className="text-3xl text-center mt-9 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">Edit Mint Phase Info</h3>
                                {phase_data.map((phase: MintPhaseConfig) => (
                                    <Phase key={phase.start_time} phase_data={phase} setPhase={handleSetPhase} isActive={isMintActive} handleWLEdit={handleWLEdit}/>
                                ))}
                                {/* <div className="flex items-end mb-3">
                                    <label className="flex items-center space-x-2">
                                        <input className="form-switch h-5 w-10 rounded-full bg-slate-300 before:rounded-full before:bg-slate-50 checked:!bg-emerald-600 checked:before:bg-white dark:bg-navy-900 dark:before:bg-navy-300 dark:checked:before:bg-white" type="checkbox" checked={isMintActive} onChange={handleMintActiveChanged} />
                                        <span>{isMintActive ? "Enable" : "Disable"}</span>
                                    </label>
                                </div> */}
                                <div className="w-full flex justify-center">
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300" id="email-error">Note: when input Public phase, name must be "public"</p>
                                </div>
                                <div className="w-full flex flex-wrap justify-end gap-5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                                        onClick={handleAddPhase}>
                                        <span>New phase</span>
                                    </button>
                                    <ContinueBtn title="Save" handleClick={handleMintPhaseSave} />                                    
                                    <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                                        onClick={handlePhaseActive}>
                                        {isMintActive ? <span>STOP</span> : <span>START</span>}
                                    </button>
                                    <ContinueBtn title="Presale" handleClick={handlePresale} />  
                                </div>
                            </div>
                        </div>
                    </div>
                    <WLEdit isOpen={isOpen} setOpen={setModalOpen} collection={collection} phase_data={selectPhase}/>
                    <PreMint isOpen={isPreMintOpen} setOpen={setPreMintOpen} collection={collection} metadataCID={token_base_url}/>
                </section>
            </div >
            
        </div >
    )
}