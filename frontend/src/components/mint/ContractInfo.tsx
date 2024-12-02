
export default function ContractInfo({ total, address }: { total: number, address: string }) {
    const showUserInfo = (address: string) => {
        if (!address) {
            return "";
        }
        let res = address.substring(0, 6) + "..." + address.substring(address.length - 6, address.length)
        return res
    }
    return (
        <div className="grid grid-cols-2 gap-x-5 mt-4 border border-gray-200 dark:border-gray-700 p-4 rounded bg-gray-100 dark:bg-gray-900">
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-300 uppercase text-xs">NFTs Minted</p>
                <h2 className="text-lg font-semibold text-black dark:text-white">{total}</h2>
            </div>
            <div className="flex justify-end">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-300 uppercase text-xs">NFT Contract</p>
                    <div className="flex items-center space-x-3">
                        <a href={`https://testnet.explorer.injective.network/contract/${address}`} target="_blank" className="text-lg font-semibold text-emerald-500 dark:text-emerald-500">{showUserInfo(address)}</a>
                    </div>
                </div>
            </div>
        </div>
    )
}