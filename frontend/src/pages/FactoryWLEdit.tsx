import { useEffect, useState } from "react";
import { getFactoryCollectAllWLInfo } from "../utils/messages"
import WhiteInfoDetail from "../components/white/WhiteInfoDetail";
import { todayInSeconds, getDaysCeil } from "../utils/utils";
import { useNavigate } from "react-router-dom";
import useWallet from "../hooks/useWallet";
import { useAppStore } from "../store/app";
import { toast } from "react-toastify";
import Modal from 'react-modal';
import ExitIcon from "../assets/icons/ExitIcon";

export default function FactoryWLEdit({isOpen, setOpen}:{isOpen:boolean, setOpen:Function}) {
    const [wl_collection, setWLCollectionInfo] = useState<UIWhiteListInfo[]>([]);
    const wallet = useWallet()
    const navigate = useNavigate();
    const app = useAppStore((state: any) => (state))

    useEffect(() => {
        if (!wallet) {
            navigate("/")
            console.log("wallet null")
        }

    }, [wallet])
    useEffect(() => {
        (async () => {
            try {
                app.setLoading(true)
                let factory_all_wl_info = await getFactoryCollectAllWLInfo(import.meta.env.VITE_PUBLIC_FACTORY_CONTRACT);
                if (factory_all_wl_info != null) {
                    let all_info: UIWhiteListInfo[] = [];
                    for (let wl_info of factory_all_wl_info){
                        wl_info.limit_time = wl_info.limit_time + app.time_diff;
                        if (wl_info.limit_time < todayInSeconds()) {
                            continue;
                        }
                        all_info.push(wl_info);
                    }
                    setWLCollectionInfo(all_info);
                }
                app.setLoading(false)
            } catch (error) {
                app.setLoading(false)
                console.log(error)
            }
        })();
    }, [])
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
            link.setAttribute('download', `WhiteList.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        app.setLoading(false);
    
    };
    return (
		<Modal isOpen={isOpen} onRequestClose={() => setOpen(false)} ariaHideApp={false} className="h-full overflow-y-auto">
			<div className="flex justify-center px-2 lg:px-16 mx-auto pt-8 mb-8 relative pb-14">
				<div className="space-y-6 lg:px-0 md:col-span-9">
					<div className="card border group border-gray-300 dark:border-gray-600 grow items-center !pt-2 p-2 sm:p-3">
						<div className="lg:max-w-4xl card-body w-full">
							{/* ----------------------------------------------------------- */}
							<div className="relative flex flex-row justify-center items-center mb-6">
								<h3 className="w-full text-3xl text-center pb-3 border-b border-gray-100 dark:border-gray-700">Special Offer List</h3>
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
								{wl_collection.map((white_info: any) => (
									<WhiteInfoDetail key={white_info.address} white_info={white_info} setWhiteInfo={handleWLCollectionData} />
								))}
							</ul>
							<div className="w-full flex justify-center gap-5 mt-5">
								<button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
									onClick={handleExportCSV}>
									<span>Export CSV</span>
								</button>
							</div>
						</div>						
					</div>
				</div>

			</div>
		</Modal>
    )
}