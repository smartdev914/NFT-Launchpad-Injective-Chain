import { useEffect, useState } from "react";
import NFTCard from "../components/NFTCard";
import { useAppStore } from "../store/app";

export default function Main (){
    const app = useAppStore();
    const [collections, setCollections] = useState<any>([]);
    useEffect(() => {
        const foundCollections = app.allCollections;
        setCollections(foundCollections);
        app.setLoading(false);
    }, [app.allCollections])
    return (
        <main>
            <div className="flex justify-center w-full mx-auto p-5 mb-8 relative pb-14 max-h-[calc(100vh-150px)]  overflow-y-auto">
                <div className="grid 2xl:grid-cols-4 xl:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-10">
                    {collections.map((collection: any) => (
                        <NFTCard key={collection.contract_address} type="mint" collection={collection}/>
                    ))}
                </div>
            </div>
        </main>
    )
}