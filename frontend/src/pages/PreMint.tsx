import { useEffect, useState } from "react";
import { writePresaleMsg } from "../utils/messages"
import ContinueBtn from "../components/ContinueBtn";
import { isValidateAddress} from "../utils/utils";
import { useNavigate } from "react-router-dom";
import useWallet from "../hooks/useWallet";
import { useAppStore } from "../store/app";
import { getFeeEstimate } from "../utils/messages";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { toast } from "react-toastify";
import Modal from 'react-modal';
import ExitIcon from "../assets/icons/ExitIcon";
import PremintInfoDetail from "../components/white/PremintInfoDetail";

export default function PreMint({isOpen, setOpen, collection, metadataCID}:{isOpen:boolean, setOpen:Function, collection: any, metadataCID: string}) {
    const [users, setUsers] = useState<PreMintUser[]>([]);
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
    const handleUsersData = (data: PreMintUser, original_address: string) => {
        let new_users: PreMintUser[] = [];
        for (let index = 0; index < users.length; index++) {
            let old_user_info = users[index];
            let new_user_info: PreMintUser = { ...old_user_info }
            if ((new_user_info.address === data.address) && (data.address != original_address)) {
                toast.error("Wallet address already exist");
                return;
            }
            if (new_user_info.address === original_address) {
                new_user_info = { ...data };
            }
            new_users.push(new_user_info);
        }
        setUsers(new_users);
    }
    
    const handleAddUserInfo = () => {
        let find = users.some((info) => (info.address == ""));
        if (find) {
            return;
        }
        let new_white_info: PreMintUser = {
            address: "",
            token_ids: "",
        }
        const updatedUserData = [...users, new_white_info];
        setUsers(updatedUserData);
        console.log("new user info", updatedUserData);
    }
    const handleWLCollectionSave = async () => {
        if (wallet && wallet.account && !app.loading) {
            app.setLoading(true);
            let owner = [];
            let token_id = [];
            let token_uri = [];
            let extension = [];
            for (let presale_user of users) {               
                if (isValidateAddress(presale_user.address)) {
                    let tokens_string = presale_user.token_ids.replace(/["']/g, '').replace(/\s/g, '');
                    let tokenIds = tokens_string.split(",");
                    for (let id of tokenIds) {
                        owner.push(presale_user.address);
                        token_id.push(id);
                        token_uri.push(`ipfs://${metadataCID}/${id}.json`);
                        extension.push({});
                    }
                }else{
                    console.log("error address", presale_user.address);
                }
            }
            if (owner.length == 0){
                app.setLoading(false);
                toast.error("Invalid address or empty")
                return;
            }
            const msgs = writePresaleMsg(wallet, owner, token_id, token_uri, extension, collection.contract_address)
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
                const replacedString = fileContent.replace(/["'\[\]]/g, '');
                const rows = replacedString.split('\r\n');
                const csvData = rows.map((row) => row.split(';'));
                const headers = csvData[0];
                let all_users: PreMintUser[] = [];
                    
                csvData.forEach((item, index) => {
                    if (index == 0 || item.length < 2) {
                        return;
                    }
                    let new_user_info: PreMintUser = {
                        address: "",
                        token_ids: "",
                    }
                    const rowData: { [key: string]: string } = {};
                    headers.forEach((header, index) => {
                        rowData[header] = item[index];
                    });
                    new_user_info.address = rowData['wallet'];
                    new_user_info.token_ids = rowData['tokens'];
                    all_users.push(new_user_info);
                })
                setUsers(all_users)
                console.log("CSV DATA", csvData);
                app.setLoading(false);
            };
            reader.readAsText(file);
        }
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
                                            <label className="col-span-4 rounded-md bg-white dark:bg-gray-900 dark:text-white w-full py-2 text-sm pl-2 pr-2 text-center">Token Ids</label>
                                        </div>
                                    </li>
                                    {users.map((presale: PreMintUser) => (
                                        <PremintInfoDetail key={presale.address} users={presale} setUserInfo={handleUsersData} />
                                    ))}
                                </ul>
                                <div className="w-full flex flex-wrap justify-center gap-5 mt-5">
                                    <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                                        onClick={handleAddUserInfo}>
                                        <span>Add User</span>
                                    </button>
                                    <label className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold">
                                        <input type="file" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" onChange={handleImportCSV}/>
                                        <span>Import CSV</span>
                                    </label>
                                    <ContinueBtn title="Presale" handleClick={handleWLCollectionSave} />
                                </div>
                            </div>                            
                            
                        </div>
                </div>

            </div>
        </Modal>
    )
}