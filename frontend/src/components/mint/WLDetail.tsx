import ContinueBtn from "../ContinueBtn";
import { toast } from "react-toastify";

export default function WLDetail({wl_price, wl_limit_time, count_per_wl, max_count, spent_wl, user_wl_limit_time, isSpecialActive, handleBuy}:
        {wl_price:number,wl_limit_time:number, count_per_wl:number, max_count:number, spent_wl:number, user_wl_limit_time: string, isSpecialActive:boolean, handleBuy:Function}) {
    const handleSpcialOffer = () => {
        if (!isSpecialActive){
            toast.error("Special offer closed");
        }else{
            handleBuy()
        }
    }
    return (
        <ul className="text-sm">
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-lg">CardInfo</h2>
                {isSpecialActive ? <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">Opened</h2> :
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">Closed</h2>}
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">WL Card Price</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{wl_price}</h2>
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">Avaiable Duration</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{wl_limit_time}</h2>
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">NFT / Card</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{count_per_wl}</h2>
            </li>
            <div className="flex justify-end">
                <ContinueBtn title="Buy Card" handleClick={handleSpcialOffer}/>
            </div>
            
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-lg">My Info</h2>
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">Max available nft</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{max_count}</h2>
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">Minted nft</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{spent_wl}</h2>
            </li>
            <li className="flex flex-col md:flex-row space-y-2 justify-between md:space-y-0 mb-3 pb-2 border-b border-gray-100 dark:border-gray-600">
                <h2 className="text-gray-900 dark:text-white">Limit date</h2>
                <h2 className="flex space-x-1 font-semibold text-gray-700 dark:text-gray-400 uppercase">{user_wl_limit_time}</h2>
            </li>
        </ul>
    )
}