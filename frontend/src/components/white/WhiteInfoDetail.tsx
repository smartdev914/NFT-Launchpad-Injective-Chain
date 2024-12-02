import { useEffect, useState } from "react";
import { getDaysCeil, getDayToSeconds, todayInSeconds, isValidateAddress } from "../../utils/utils";
import InputBoxWL from "../Input/InputBoxWL";
import InputBoxMax from "../Input/InputBoxMax";
import { toast } from "react-toastify";

export default function WhiteInfoDetail({white_info, setWhiteInfo}:{white_info:UIWhiteListInfo, setWhiteInfo:Function}) {
    const [data, setData] = useState<UIWhiteListInfo>(white_info);
    useEffect(()=>{
        setData(white_info);
    }, [white_info])
    const handleChangeAddress = (address: string) => {
        let new_data = {...white_info};
        new_data.address = address
        if (!isValidateAddress(address)){
            toast.error("Please confirm address again")
        }
        setWhiteInfo(new_data, data.address);
    }
    const handleMaxValue = (max: number) => {
        let new_data = {...white_info};
        new_data.max_count = Number(max);
        setWhiteInfo(new_data, data.address)
    } 
    const handleLimitTime = (duration: number) => {
        let new_data = {...white_info};
        new_data.limit_time = todayInSeconds() + getDayToSeconds(duration);
        setWhiteInfo(new_data, data.address)
    }
    const handlePrice = (price: string) => {
        let new_data = {...white_info};
        new_data.price = price
        setWhiteInfo(new_data, data.address)
    } 
    return (
        <>
            <li className="flex flex-row space-y-2 justify-between md:space-y-0 mb-1 pb-1 border-b border-gray-100 dark:border-gray-600">
                <div className="gap-3 w-full grid grid-cols-6">
                    <div className="col-span-2">
                        <InputBoxWL placeholder="inj..." value={data.address} setValue={handleChangeAddress}/>
                    </div>
                    <InputBoxWL placeholder=" " value={data.price} setValue={handlePrice}/>
                    <label className="appearance-none bg-white border-gray-300 text-gray-900  rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-900 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white border block w-full focus:outline-none  focus:ring-1 appearance-none py-2 text-sm pl-2 pr-2 text-right">{white_info.spent_amount}</label>
                    <InputBoxWL placeholder=" " value={data.max_count.toString()} setValue={handleMaxValue}/>
                    <InputBoxMax label="" tag="days" value={getDaysCeil(data.limit_time - todayInSeconds()).toString()} setValue={handleLimitTime}/>
                </div>
            </li>
        </>
    )
}