import CollectionInfoLine from "./CollectionInfoLine";
const showUserInfo = (address: string) => {
    if (!address) {
        return "";
    }
    let res = address.substring(0, 6) + "..." + address.substring(address.length - 6, address.length)
    return res
}
export default function CollectionInfo ({owner, name, symbol, totalSupply}:
    { owner:string, name:string, symbol:string, totalSupply:string}){
    return (
        <div className="border mt-4 border-gray-200 dark:border-gray-700 p-4 rounded bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between">
                <span className="font-medium text-slate-400 block mb-1">Owner Address</span>
                <div className="flex item space-x-2">
                    <a href={`https://testnet.explorer.injective.network/contract/${owner}`} target="_blank" className="font-medium text-emerald-600 underline block">{showUserInfo(owner)}</a>
                </div>
            </div>
            <CollectionInfoLine title="Total Supply" value={totalSupply}></CollectionInfoLine>
            <CollectionInfoLine title="Token Name" value={name}></CollectionInfoLine>
            <CollectionInfoLine title="Token Symbol" value={symbol}></CollectionInfoLine>
            {/* <CollectionInfoLine title="Native Token" value={nativeToken}></CollectionInfoLine> */}
        </div>
    )
}