import { useEffect, useState } from "react";
import { isValidateAddress } from "../../utils/utils";
import InputBoxWL from "../Input/InputBoxWL";
import { toast } from "react-toastify";

export default function PremintInfoDetail({users, setUserInfo}:{users:PreMintUser, setUserInfo:Function}) {
    const [data, setData] = useState<PreMintUser>(users);
    useEffect(()=>{
        setData(users);
    }, [users])
    const handleChangeAddress = (address: string) => {
        let new_data = {...users};
        new_data.address = address
        if (!isValidateAddress(address)){
            toast.error("Please confirm address again")
        }
        setUserInfo(new_data, data.address);
    }
    const handleTokens = (value: string) => {
        let new_data = {...users};
        new_data.token_ids = value;
        setUserInfo(new_data, data.address)
    } 
    return (
        <>
            <li className="flex flex-row space-y-2 justify-between md:space-y-0 mb-1 pb-1 border-b border-gray-100 dark:border-gray-600">
                <div className="gap-3 w-full grid grid-cols-6">
                    <div className="col-span-2">
                        <InputBoxWL placeholder="inj..." value={data.address} setValue={handleChangeAddress}/>
                    </div>
                    <div className="col-span-4">
                        <InputBoxWL placeholder=" " value={data.token_ids} setValue={handleTokens}/>
                    </div>
                </div>
            </li>
        </>
    )
}