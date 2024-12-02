import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/app";
import { IPFSCLOUDSERVER, IPFS_ACCESS_TOKEN, getDays, getHours, getMinutes, todayInSeconds } from "../utils/utils";
import INJECTIVE_IMG from "../assets/images/injective.png"
import DEFAULT_IMG from "../assets/images/empty-nft.png"

export default function NFTCard({ type, collection }: { type: string, collection: any }) {
  const navigate = useNavigate();
  const app = useAppStore((state: any) => (state))
  const [logo_url, setLogoUrl] = useState<string>("");
  const [is_active_phase, setActivePhase] = useState<boolean>(false);
  const [name, setName] = useState<string>(" ");
  const [symbol, setSymbol] = useState<string>(" ");
  const [phase_end_time, setActiveEndTime] = useState<number>(todayInSeconds());
  const [remain_time, setRemainTime] = useState<number>(0);
  const [price, setPrice] = useState<string>("0");

  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoad, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (logo_url != "") {
      let imageUrl = `https://${IPFSCLOUDSERVER}/ipfs/${logo_url}?pinataGatewayToken=${IPFS_ACCESS_TOKEN}`;
      let image = new Image()
      image.src = imageUrl
      console.log("image load", imageUrl);
      image.onload = () => {
        setImageUrl(imageUrl);
        setLoaded(true)
      }
    }
  }, [logo_url])

  const handleDetailClick = () => {
    console.log("collection_address:", collection.contract_address);
    navigate("/detail", { state: { collection: collection } });
  }
  const handleMintClick = () => {
    console.log("collection_address:", collection.contract_address);
    navigate("/mint", { state: { collection: collection } });
  }
  useEffect(() => {
    console.log("app.allCollectionInfos: ", app.allCollectionInfos)
    if (app.allCollectionInfos.size != undefined && app.allCollectionInfos.get(collection.contract_address) != undefined) {

      let collection_config: CollectionConfig = app.allCollectionInfos.get(collection.contract_address).collection_config
      if (collection_config.logo_url == "") {
        setLogoUrl(collection.logo_url);
      } else {
        setLogoUrl(collection_config.logo_url);
      }
      setName(collection.name);
      setSymbol(collection.symbol);
      let active_phase: MintPhaseConfig = app.allCollectionInfos.get(collection.contract_address).active_phase;
      setActivePhase(collection_config.is_mint_active);
      setActiveEndTime(active_phase.end_time);
      setPrice(active_phase.price);
    }
  }, [app.allCollectionInfos])
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainTime(getDurationUntilNext());
    }, 1000 * 2);
    return () => clearInterval(interval);
  }, [phase_end_time])
  const getDurationUntilNext = () => {
    let limit = phase_end_time - todayInSeconds();
    if (limit < 0) {
      limit = 0;
      setActivePhase(false)
    }
    return limit;
  }
  return (
    <div className="w-[330px] h-[500px] group relative overflow-hidden p-2 md:p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 hover:shadow-md dark:shadow-md hover:dark:shadow-gray-900 transition-all duration-500 hover:-mt-2">
      <div className="relative max-h-[300px] h-[300px] overflow-hidden rounded-xl">
        {isLoad ? <img src={imageUrl} className="rounded-xl transition-all duration-500 object-contain w-full h-full" /> :
          <img src={DEFAULT_IMG} className="rounded-xl transition-all duration-500 object-contain w-full h-full" />}
        <div className="absolute -bottom-20 group-hover:bottom-1/4 group-hover:trangray-y-1/2 right-0 left-0 mx-auto text-center transition-all duration-500">
          {type == "mint" ? <div className="btn btn-sm rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 dark:border-emerald-700 text-white" onClick={handleMintClick}>
            <i className="mdi mdi-lightning-bolt"></i>
            Mint Now
          </div> :
            <div className="btn btn-sm rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 dark:border-emerald-700 text-white" onClick={handleDetailClick}>
              <i className="mdi mdi-lightning-bolt"></i>
              Detail
            </div>}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex px-3 justify-between">
          <div className="flex items-center gap-2">
            {isLoad ?
              <img src={imageUrl} className="rounded-full h-8 w-8" alt="" /> :
              <img src={DEFAULT_IMG} className="rounded-full h-8 w-8" alt="" />}
            <div className="font-semibold dark:hover:text-emerald-300 hover:text-emerald-600">
              <div style={{ overflow: "hidden" }}>
                <span style={{ boxShadow: "transparent 0px 0px" }}>
                  <span data-attrs="[object Object]">
                    {name}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div>
            {is_active_phase ?
              <button className="badge space-x-1.5 font-semibold rounded-full bg-success/10 text-success border border-success dark:bg-success/15">
                <div className="h-2 w-2 rounded-full bg-current"></div>
                <span>Live</span>
              </button>
              :
              <button className="badge space-x-2.5 rounded-full bg-info/10 text-info border border-info dark:bg-info/15 border-[#0ea5e9] text-[#0ea5e9]">
                <div className="h-2 w-2 rounded-full bg-current"></div>
                <span>Ended</span>
              </button>}
          </div>
        </div><div className="p-3">
          <div className="font-semibold dark:hover:text-emerald-300 hover:text-emerald-600">
            <div style={{ overflow: "hidden" }}>
              <span style={{ boxShadow: "transparent 0px 0px" }}>
                <span data-attrs="[object Object]">
                  {symbol}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700">
          <div>
            <span className="text-[16px] font-medium text-gray-400 block">From</span>
            <div className="flex items-center gap-1">
              <span className="text-base font-semibold block">
                {price}
              </span>
              <img src={INJECTIVE_IMG} className="w-3 h-3" />
            </div>
          </div>
          <div>
            <span className="text-[16px] font-medium text-left text-gray-400 block">{is_active_phase ? "Ends In" : "NFT Presale"}</span>
            {is_active_phase ? <div className="flex space-x-1 text-center items-center">
              <span className="countdown font-mono font-semibold text-gray-600 dark:text-gray-200 text-base flex justify-center">
                <span>{getDays(remain_time)}</span>
              </span>
              <span className="font-semibold text-center">D:</span>
              <span className="countdown font-mono font-semibold text-gray-600 dark:text-gray-200 text-base flex justify-center">
                <span>{getHours(remain_time)}</span>
              </span>
              <span className="dotdot font-semibold">H:</span>
              <span className="countdown font-mono font-semibold text-gray-600 dark:text-gray-200 text-base flex justify-center">
                <span>{getMinutes(remain_time)}</span>
              </span>
              <span className="font-semibold text-center">M</span>
            </div> :
              <div className="flex space-x-1 text-center">
                <span className="countdown font-mono font-semibold text-gray-600 dark:text-[#ff3838] text-base flex justify-center">
                  <span>Has Ended</span>
                </span>
              </div>}
          </div>
        </div>
      </div>
    </div>
  )
}