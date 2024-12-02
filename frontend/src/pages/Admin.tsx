import ContinueBtn from "../components/ContinueBtn";
import InputBox from "../components/Input/InputBox";
import InputBoxMax from "../components/Input/InputBoxMax";
import useWallet from "../hooks/useWallet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { writeFactoryConfigMsg, writeSpecialActiveMsg, getFeeEstimate, getActiveContractAddress, writeActiveCollection } from "../utils/messages";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { toast } from "react-toastify";
import { useAppStore } from "../store/app";
import { getDays, getDayToSeconds, isValidateAddress } from "../utils/utils";
import FactoryWLEdit from "./FactoryWLEdit";

export default function Admin() {
  const wallet = useWallet()
  const navigate = useNavigate();
  const { simulate } = useShuttle();
  const { broadcast } = useShuttle()
  const app = useAppStore((state: any) => (state))

  const [owner_one, setOwnerOne] = useState<string>("");
  const [owner_two, setOwnerTwo] = useState<string>("");
  const [fee_token, setFeeToken] = useState<string>("inj");
  const [fee_wallet, setFeeWallet] = useState<string>("");
  const [fee, setFee] = useState<number>(0);
  const [isEnable, setEnable] = useState<boolean>(true);
  const [first_wl_fee_wallets, setFirstWLFeeWallets] = useState<string>("");
  const [second_wl_fee_wallets, setSecondWLFeeWallets] = useState<string>("");
  const [wl_limit_day, setWLLimitDay] = useState<number>(0);
  const [wl_price, setWLPrice] = useState<number>(0);
  const [special_offer_active, setSpecialOfferActive] = useState<boolean>(false);
  const [max_per_wl, setMaxPerWL] = useState<number>(0);
  const [isExtraSpecialWallet, setExtraSpecialWallet] = useState<boolean>(false);
  const [active_collection, setActiveCollection] = useState<string>("");
  const [isOpen, setOpen] = useState<boolean>(false);
  useEffect(() => {
    if (!app.is_admin) {
      navigate("/")
    }
  }, [wallet])

  useEffect(() => {
    (async () => {
      try {
        if (!app.loading) {
          let factory_config: Factory_Config = app.factory_info
          setOwnerOne(factory_config.owner_one);
          setOwnerTwo(factory_config.owner_two);
          setFeeWallet(factory_config.fee_wallet);
          setFee(factory_config.create_fee);
          setFeeToken(factory_config.native_token);
          for (let index = 0; index < factory_config.special_offer_wallet.length; index++) {
            if (index == 0) {
              setFirstWLFeeWallets(factory_config.special_offer_wallet[index]);
            } else if (index == 1) {
              setSecondWLFeeWallets(factory_config.special_offer_wallet[index]);
              setExtraSpecialWallet(true);
            }
          }

          setWLLimitDay(getDays(factory_config.wl_limit_time));
          setWLPrice(factory_config.wl_price);
          setMaxPerWL(factory_config.max_count_per_wl);
          setSpecialOfferActive(app.is_special_offer_active);
          setEnable(factory_config.enable);
          let info = await getActiveContractAddress();
          setActiveCollection(info.address);
        }
      } catch (error) {
        console.log(error)
      }
    })();
  }, [app.factory_info])
  const handleCheckChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnable(event.target.checked);
  };
  const handleSaveBtn = async () => {
    if (app.is_admin && !app.loading) {
      app.setLoading(true)
      let special_offer_wallet = [];
      let wallet_count = 0;
      if (isValidateAddress(first_wl_fee_wallets)) {
        special_offer_wallet.push(first_wl_fee_wallets);
        wallet_count++;
      }
      if (isExtraSpecialWallet && isValidateAddress(second_wl_fee_wallets)) {
        special_offer_wallet.push(second_wl_fee_wallets);
        wallet_count++;
      }
      if (wallet_count == 0) {
        app.setLoading(false);
        toast.error("please input special wallet at least one.");
        return;
      }
      let config: Factory_Config = {
        owner_one: owner_one,
        owner_two: owner_two,
        enable: isEnable,
        fee_wallet: fee_wallet,
        create_fee: fee,
        native_token: fee_token,
        special_offer_wallet: special_offer_wallet,
        wl_limit_time: getDayToSeconds(wl_limit_day),
        wl_price: wl_price,
        max_count_per_wl: max_per_wl,
      }
      let msgs = [];
      if (isValidateAddress(active_collection)) {
        let tempMsg = writeActiveCollection(wallet, active_collection);
        msgs.push(tempMsg[0]);
      }
      const msg2 = writeFactoryConfigMsg(wallet, config);
      msgs.push(msg2[0]);
      const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
      broadcast({
        wallet,
        messages: msgs,
        feeAmount: feeEstimate?.fee?.amount,
        gasLimit: feeEstimate?.gasLimit,
      })
        .then(() => {
          app.setLoading(false)
          app.setRefresh()
          toast.success("Save Successed")
        })
        .catch((error: any) => {
          app.setLoading(false)
          console.log(error)
          toast.error("Save Failed")
        })
    }
  }
  const handleExtraWalletChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExtraSpecialWallet(event.target.checked);
  };
  const handleSpecialActive = async () => {
    if (app.is_admin && !app.loading && wallet && wallet.account) {
      if (!isValidateAddress(owner_one) || !isValidateAddress(fee_wallet)) {
        toast.error("Please confirm address again.")
        return;
      }
      app.setLoading(true)
      const msgs = writeSpecialActiveMsg(wallet, !special_offer_active)
      if (!special_offer_active) {
        let special_offer_wallet = [];
        let wallet_count = 0;
        if (isValidateAddress(first_wl_fee_wallets)) {
          special_offer_wallet.push(first_wl_fee_wallets);
          wallet_count++;
        }
        if (isExtraSpecialWallet && isValidateAddress(second_wl_fee_wallets)) {
          special_offer_wallet.push(second_wl_fee_wallets);
          wallet_count++;
        }
        if (wallet_count == 0) {
          app.setLoading(false);
          toast.error("please input special wallet at least one.");
          return;
        }
        let config: Factory_Config = {
          owner_one: owner_one,
          owner_two: owner_two,
          enable: isEnable,
          fee_wallet: fee_wallet,
          create_fee: fee,
          native_token: fee_token,
          special_offer_wallet: special_offer_wallet,
          wl_limit_time: getDayToSeconds(wl_limit_day),
          wl_price: wl_price,
          max_count_per_wl: max_per_wl,
        }
        if (isValidateAddress(active_collection)) {
          let tempMsg = writeActiveCollection(wallet, active_collection);
          msgs.push(tempMsg[0]);
        }
        const msg3 = writeFactoryConfigMsg(wallet, config);
        msgs.push(msg3[0]);
      }
      
      const feeEstimate: any = await getFeeEstimate(simulate, wallet, msgs)
      broadcast({
        wallet,
        messages: msgs,
        feeAmount: feeEstimate?.fee?.amount,
        gasLimit: feeEstimate?.gasLimit,
      })
        .then(() => {
          app.setLoading(false)
          app.setRefresh()
          setSpecialOfferActive(!special_offer_active);
          toast.success("Successed")

        })
        .catch((error: any) => {
          console.log(error)
          app.setLoading(false)
          toast.error("Failed")
        })
    }
  }

  return (
    <div className="flex w-full justify-center lg:px-16 mx-auto pt-8 mb-8 min-h-[calc(100vh-358px)] relative pb-14 max-h-[calc(100vh-150px)]  overflow-y-auto">
      <div className="space-y-6 sm:px-6 lg:px-0 md:col-span-9">
        <section aria-labelledby="plan-heading">
          <div className="gap-y-3 mt-6">
            <div className="card border group border-gray-300 dark:border-gray-600 grow items-center !pt-2 p-4 sm:p-5">
              <div className="lg:max-w-4xl card-body">
                <h3 className="text-3xl mt-6 mb-12 pb-3 border-b border-gray-100 dark:border-gray-700">Admin Panel</h3>
                <div className="gap-3 my-4 w-full grid md:grid-cols-3">
                  <div className="md:col-span-2">
                    <InputBox label="First owner address" placeholder="inj..." value={owner_one} setValue={setOwnerOne} />
                  </div>
                  <div className="md:col-span-2">
                    <InputBox label="Second owner address" placeholder="inj..." value={owner_two} setValue={setOwnerTwo} />
                  </div>
                  {/* <div>
                    <InputBox label="Fee Token" placeholder="inj" value={fee_token} setValue={setFeeToken} />
                  </div> */}
                  <div>
                    <InputBoxMax label="Creation Fee" tag={fee_token} value={fee.toString()} setValue={setFee} />
                  </div>
                  <div className="md:col-span-2">
                    <InputBox label="Collection creation fee destination address" placeholder="inj..." value={fee_wallet} setValue={setFeeWallet} />
                  </div>
                  <label className="flex justify-center items-center space-x-2 mt-5">
                    <input className="form-switch h-5 w-10 rounded-full bg-slate-300 before:rounded-full before:bg-slate-50 checked:!bg-emerald-600 checked:before:bg-white dark:bg-navy-900 dark:before:bg-navy-300 dark:checked:before:bg-white" type="checkbox" checked={isEnable} onChange={handleCheckChanged} />
                    <span>{isEnable ? "Enable" : "Disable"}</span>
                  </label>
                </div>

                <h3 className="text-3xl mt-6 mb-12 pb-3 pt-9 border-y border-gray-100 dark:border-gray-700">Special Offer Panel</h3>
                <div className="gap-3 my-4 w-full grid md:grid-cols-3">
                  <div>
                    <InputBoxMax label="WL Pass Duration" tag="days" value={wl_limit_day.toString()} setValue={setWLLimitDay} />
                  </div>
                  <div>
                    <InputBoxMax label="WL Pass Price" tag={fee_token} value={wl_price.toString()} setValue={setWLPrice} />
                  </div>
                  <div>
                    <InputBox label="WL Max Amount" placeholder="10" value={max_per_wl.toString()} setValue={setMaxPerWL} />
                  </div>
                  <div className="md:col-span-2">
                    <InputBox label="Active Collection Address" placeholder="inj..." value={active_collection} setValue={setActiveCollection} />
                  </div>
                  <div className="md:col-span-2">
                    <InputBox label="Special offer fee destination address" placeholder="inj..." value={first_wl_fee_wallets} setValue={setFirstWLFeeWallets} />
                  </div>
                  <div className="flex items-end mb-3">
                    <label className="flex items-center space-x-2">
                      <input className="form-switch h-5 w-10 rounded-full bg-slate-300 before:rounded-full before:bg-slate-50 checked:!bg-emerald-600 checked:before:bg-white dark:bg-navy-900 dark:before:bg-navy-300 dark:checked:before:bg-white" type="checkbox" checked={isExtraSpecialWallet} onChange={handleExtraWalletChanged} />
                      <span>Additional wallet</span>
                    </label>
                  </div>
                  {isExtraSpecialWallet && <div className="md:col-span-2">
                    <InputBox label="Special offer fee destination address" placeholder="inj..." value={second_wl_fee_wallets} setValue={setSecondWLFeeWallets} />
                  </div>}
                </div>
                
                <div className="w-full flex justify-end gap-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                      onClick={()=> setOpen(true)}>
                      <span>Export WL</span>
                  </button>
                  <ContinueBtn title="Save" handleClick={handleSaveBtn} />
                  <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                    onClick={handleSpecialActive}>
                    {special_offer_active ? <span>STOP</span> : <span>START</span>}
                  </button>
                </div>
              </div>
            </div>
            <FactoryWLEdit isOpen={isOpen} setOpen={setOpen}/>
          </div>
        </section>
      </div>
    </div>
  );
}