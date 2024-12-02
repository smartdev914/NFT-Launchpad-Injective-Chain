import NFTCard from "../components/NFTCard";
import useWallet from "../hooks/useWallet";
import { useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/app";


export default function MyCollection() {
    const wallet = useWallet()
    const app = useAppStore();
    const navigate = useNavigate();
    const [collections, setCollections] = useState<any>([]);
    useEffect(() => {
        if (!wallet) {
            navigate("/")
            console.log("wallet null")
            return;
        }
        if (app.allCollectionInfos != undefined && app.allCollectionInfos.size != undefined) {
            const foundCollections = app.allCollections.filter((info: any) => app.allCollectionInfos.get(info.contract_address)?.collection_config.minter === wallet.account.address);
            setCollections(foundCollections);
        }
        app.setLoading(false);
    }, [wallet, app.allCollectionInfos])

    return (
        <main>
           {wallet &&
                <div className="flex justify-center w-full mx-auto p-5 mb-8 relative pb-14 max-h-[calc(100vh-150px)]  overflow-y-auto">
                    <div className="grid 2xl:grid-cols-4 xl:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-10">
                        {collections.map((collection: any) => (
                            <NFTCard key={collection.contract_address} type="detail" collection={collection}/>
                        ))}
                    </div>
                </div>
            }
        </main>
    )
}