import { useEffect, useState } from "react";
import { getCollectAllWLInfo } from "../utils/messages"
import WhiteInfoDetail from "../components/white/WhiteInfoDetail";
import ContinueBtn from "../components/ContinueBtn";
import { todayInSeconds, isValidateAddress, getDaysCeil, getDayToSeconds } from "../utils/utils";
import { useNavigate } from "react-router-dom";
import useWallet from "../hooks/useWallet";
import { useAppStore } from "../store/app";
import { getFeeEstimate, writeWhiteListMsg } from "../utils/messages";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { toast } from "react-toastify";
import Modal from 'react-modal';
import ExitIcon from "../assets/icons/ExitIcon";
import { BigNumberInWei } from '@injectivelabs/utils';
import { BigNumberInBase } from "@injectivelabs/utils";

export default function WLEdit({isOpen, setOpen, collection, phase_data}:{isOpen:boolean, setOpen:Function, collection: any, phase_data:MintPhaseConfig}) {
    const [wl_collection, setWLCollectionInfo] = useState<UIWhiteListInfo[]>([]);
    const wallet = useWallet()
    const navigate = useNavigate();
    const app = useAppStore((state: any) => (state))
    const { simulate } = useShuttle();
    const { broadcast } = useShuttle();

    useEffect(() => {
        if (!wallet) {
            navigate("/")
            console.log("wallet null")
        }

    }, [wallet])
    useEffect(() => {
        console.log("phase", phase_data.mint_type);
        (async () => {
            try {
                app.setLoading(true)
                if (collection.contract_address) {
                    let all_wl_info: WhiteListInfo[] = await getCollectAllWLInfo(collection.contract_address, phase_data.mint_type);
                    let all_wl: UIWhiteListInfo[] = [];
                    if (all_wl_info != null) {                   
                        for (let wl_info of all_wl_info){
                            let index = 1000;
                            for (let type_index = 0; type_index < wl_info.phase_type.length; type_index ++){
                                if (wl_info.phase_type[type_index] == phase_data.mint_type) {
                                    index = type_index;
                                    break;
                                }
                            }
                            
                            if (index != 1000) {
                                let limit_time = wl_info.limit_time[index] + app.time_diff;
                                if (limit_time < todayInSeconds()) {
                                    continue;
                                }
                                all_wl.push({address: wl_info.address, limit_time: limit_time, max_count: wl_info.max_count[index],
                                    spent_amount: wl_info.spent_amount[index], price: new BigNumberInWei(wl_info.price[index]).toBase().toNumber().toString()});
                            }
                            
                        }
                        setWLCollectionInfo(all_wl)
                    }
                }
                app.setLoading(false)
            } catch (error) {
                app.setLoading(false)
                console.log(error)
            }
        })();
    }, [phase_data])
    const handleWLCollectionData = (data: UIWhiteListInfo, original_address: string) => {
        let new_white_list: UIWhiteListInfo[] = [];
        for (let index = 0; index < wl_collection.length; index++) {
            let old_white_info = wl_collection[index];
            let new_white_info: UIWhiteListInfo = { ...old_white_info }
            if ((new_white_info.address === data.address) && (data.address != original_address)) {
                toast.error("Wallet address already exist");
                return;
            }
            if (new_white_info.address === original_address) {
                new_white_info = { ...data };
            }
            new_white_list.push(new_white_info);
        }
        setWLCollectionInfo(new_white_list);
    }
    
    const handleAddWhiteInfo = () => {
        let find = wl_collection.some((info) => (info.address == ""));
        if (find) {
            return;
        }
        let new_white_info: UIWhiteListInfo = {
            address: "",
            limit_time: todayInSeconds() + 30 * 24 * 60 * 60 + 10,   //30days because delta secons when calc.
            max_count: 10,
            spent_amount: 0,
            price: phase_data.price,
        }
        const updatedWhiteListData = [...wl_collection, new_white_info];
        setWLCollectionInfo(updatedWhiteListData);
        console.log("new white info", updatedWhiteListData);
    }
    const handleWLCollectionSave = async () => {
        if (wallet && wallet.account && !app.loading) {
            app.setLoading(true);
            let white_data: WhiteListInfo[] = [];
            for (let white_info of wl_collection) {               
                if (isValidateAddress(white_info.address)) {
                    let temp:WhiteListInfo={
                        address: white_info.address,
                        limit_time: [Number(white_info.limit_time - app.time_diff)],
                        max_count: [Number(white_info.max_count)],
                        spent_amount: [Number(white_info.spent_amount)],
                        phase_type: [phase_data.mint_type],
                        price: [new BigNumberInBase(white_info.price).toWei().toFixed()]
                    }
                    white_data.push(temp);
                }else{
                    console.log("error address", white_info.address);
                }
            }
            if (white_data.length == 0){
                app.setLoading(false);
                toast.error("Invalid address or empty")
                return;
            }
            const msgs = writeWhiteListMsg(wallet, white_data, collection.contract_address)
            const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
            broadcast({
                wallet,
                messages: msgs,
                feeAmount: feeEstimate?.fee?.amount,
                gasLimit: feeEstimate?.gasLimit,
            })
                .then(() => {
                    app.setLoading(false);
                    app.setRefresh()
                    toast.success("Save Successed")

                })
                .catch((error: any) => {
                    app.setLoading(false);
                    toast.error("Save Failed")
                    console.log(error)
                })
        }
    }
    
    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = async () => {
                app.setLoading(true);
                const fileContent = reader.result as string;
                const replacedString = fileContent.replace(/["']/g, '').replace(/,/g, '');
                const rows = replacedString.split('\r\n');
                const csvData = rows.map((row) => row.split(';'));
                const headers = csvData[0];
                let all_wl: UIWhiteListInfo[] = [];
                    
                csvData.forEach((item, index) => {
                    if (index == 0 || item.length < 2) {
                        return;
                    }
                    let new_white_info: UIWhiteListInfo = {
                        address: "",
                        limit_time: todayInSeconds() + 30 * 24 * 60 * 60 + 10,   //30days because delta secons when calc.
                        max_count: 10,
                        spent_amount: 0,
                        price: phase_data.price,
                    }
                    const rowData: { [key: string]: string } = {};
                    headers.forEach((header, index) => {
                        rowData[header] = item[index];
                    });
                    new_white_info.address = rowData['wallet'];
                    new_white_info.max_count = Number(rowData['mintlimit']);
                    new_white_info.limit_time = todayInSeconds() + getDayToSeconds(Number(rowData['limitTime']));
                    if (rowData['price']) {
                        new_white_info.price = rowData['price'];
                    }
                    all_wl.push(new_white_info);
                })
                setWLCollectionInfo(all_wl)
                console.log("CSV DATA", csvData);
                

                app.setLoading(false);
            };

            reader.readAsText(file);
        }
    };
    const handleExportCSV = () => {
        if (wl_collection.length == 0) {
            return;
        }
        app.setLoading(true);
        const separator: string = ";"
        let columHearders: string[] = ["No", "wallet", "mintlimit", "price", "limitTime"]
        const csvContent =
          "sep=,\n" +
          columHearders.join(separator) +
          '\r\n' +
          wl_collection.map((wl_info, index) => {
            return `${index+1};${wl_info.address};${wl_info.max_count};${wl_info.price};${getDaysCeil(wl_info.limit_time - todayInSeconds()).toString()}`
          }).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${collection.name}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        app.setLoading(false);
    
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={() => setOpen(false)} ariaHideApp={false} className="h-full overflow-y-auto">
            <div className="flex justify-center px-2 lg:px-16 mx-auto pt-[5rem] mb-8 relative pb-14">
                <div className="space-y-6 lg:px-0 md:col-span-9">
                        <div className="card border group border-gray-300 dark:border-gray-600 grow items-center !pt-2 p-2 sm:p-3">
                            <div className="lg:max-w-4xl card-body w-full">
                                {/* ----------------------------------------------------------- */}
                                <div className="relative flex flex-row justify-center items-center mb-6">
                                    <h3 className="w-full text-3xl text-center pb-3 border-b border-gray-100 dark:border-gray-700">White List</h3>
                                    <button className="absolute w-full h-full flex justify-end items-center" onClick={()=>setOpen(false)}>
                                        <ExitIcon width="30px" height="30px" color="#fff"/>
                                    </button>
                                </div>
                                
                                <ul className="text-sm max-h-[500px] overflow-y-auto">
                                    <li className="flex md:flex-row space-y-2 justify-between md:space-y-0 mb-1 pb-1 border-b border-gray-100 dark:border-gray-600">
                                        <div className="gap-3 w-full grid grid-cols-6">
                                            <label className="col-span-2 rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Wallet Address</label>
                                            <label className="rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Price</label>
                                            <label className="rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Spent Amount</label>
                                            <label className="rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Max Amount</label>
                                            <label className="rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Limit Days</label>
                                        </div>
                                    </li>
                                    {wl_collection.map((white_info: UIWhiteListInfo) => (
                                        <WhiteInfoDetail key={white_info.address} white_info={white_info} setWhiteInfo={handleWLCollectionData} />
                                    ))}
                                </ul>
                                <div className="w-full flex flex-wrap justify-center gap-5 mt-5">
                                    <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                                        onClick={handleAddWhiteInfo}>
                                        <span>Add User</span>
                                    </button>
                                    <label className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold">
                                        <input type="file" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" onChange={handleImportCSV}/>
                                        <span>Import CSV</span>
                                    </label>
                                    <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                                        onClick={handleExportCSV}>
                                        <span>Export CSV</span>
                                    </button>
                                    <ContinueBtn title="Save" handleClick={handleWLCollectionSave} />
                                </div>
                            </div>                            
                            
                        </div>
                </div>

            </div>
        </Modal>
    )
}