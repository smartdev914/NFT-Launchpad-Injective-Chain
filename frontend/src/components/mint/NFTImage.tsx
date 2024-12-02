import { useEffect, useState } from "react";
import DEFAULT_IMG from "../../assets/images/empty-nft.png"
import { IPFSCLOUDSERVER, IPFS_ACCESS_TOKEN } from "../../utils/utils";
export default function NftImage({ token_uri }: { token_uri: string }) {
    const [title, setTitle] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isLoaded, setLoaded] = useState(false)

    const loadImage = async () => {
        if (token_uri == "") return;
        let uri: string = token_uri.replace("ipfs://", `https://${IPFSCLOUDSERVER}/ipfs/`);
        let response:any;
        try {
            response = await fetch(`${uri}?pinataGatewayToken=${IPFS_ACCESS_TOKEN}`);
        } catch(error) {
            console.log(error);
        }
        const metadata = await response.json();
        setTitle(metadata.title);

        let imageUrl = metadata.media.replace("ipfs://", `https://${IPFSCLOUDSERVER}/ipfs/`)
        imageUrl = `${imageUrl}?pinataGatewayToken=${IPFS_ACCESS_TOKEN}`;
        let image = new Image()
        image.src = imageUrl;
        image.onload = () => {
            setImageUrl(imageUrl);
            setLoaded(true)
        }
        image.onerror = () => {
            setLoaded(false)
        }
    };

    useEffect(() => {
        if (token_uri) {
            loadImage();
        }
    }, [])
    return (
        <div className="flex justify-center">
            <div className="flex flex-col gap-1 rounded-xl bg-opacity-80 w-[120px] cursor-pointer items-center justify-center">
            {isLoaded ?
                <img src={imageUrl} className="rounded-xl transition-all duration-500 w-[100px] pointer-events-none"/> :
                <img src={DEFAULT_IMG} className="rounded-xl transition-all duration-500 w-[100px] pointer-events-none"/>
            }
            <p className="text-sm text-center">{title}</p>
            </div>
        </div>
    )

}