import Menu from '../assets/images/menu.svg'
import useWallet from "../hooks/useWallet";
import { useShuttle } from "@delphi-labs/shuttle-react";
import { useAccountStore } from "../store/account";
import { copyClipboard, getHours } from "../utils/utils";
import { useEffect, useState } from "react";
import WalletModal from './WalletModal';
import { useAppStore } from "../store/app";

export default function TopBar() {
    const wallet = useWallet()
    const account = useAccountStore((state) => state)
    const app = useAppStore((state: any) => (state))
    const [walletOpen, setOpen] = useState<boolean>(false)

    useEffect(() => {
        app.fetchAllCollections()
        console.log("Init App Config");
        if (wallet && wallet.account) {
            app.fetchAdmin(wallet.account.address);
            app.setLoading(false);
            console.log("Get Factory Config", getHours(app.time_diff));
        }
    }, [app.refresh])

    const handleOpen = () => {
        setOpen(true)
    }
    const handleClose = () => {
        setOpen(false)
    }

    useEffect(() => {
        if (wallet && wallet.account){
            app.fetchAdmin(wallet.account.address);
            account.setAddress(wallet.account.address)
            account.fetchBalance()
            handleClose()
        }else{
            account.setAddress("")
            account.setBalance("")
        }
    }, [wallet])

    const { disconnectWallet } = useShuttle()
    const handleDisconnect = () => {
        disconnectWallet(wallet)
    }
    
    const showUserInfo = (address: string, balance: string) => {
        if (!address) {
            return "";
        }
        let res = address.substring(0, 6) + "..." + address.substring(address.length - 4, address.length)
        res += ` (${balance}inj)`
        return res
    }
    const handleMenu = () => {
        app.setMenu();
    }

    return (
        <header className="bg-white dark:bg-gray-800 flex sticky top-0 w-full z-20 border-b border-gray-200 dark:border-gray-700 app__menu">
            <div className="h-14 item items-center flex justify-between py-0 px-4 w-full">
                <div className="flex justify-center" onClick={handleMenu}>
                    <div className="rouded-full cursor-pointer mx-1 p-2">
                        <div>
                            <img src={Menu}></img>
                        </div>
                    </div>
                </div>
                <div className="flex items-center text-xs">
                    <div className="flex flex-row gap-2 justify-end items-center w-[200px] lg:flex-nowrap">
                        <span className="address cursor-pointer text-right" onClick={() => copyClipboard(account.address)} title="Click to copy address to clipboard.">
                            {showUserInfo(account.address, account.balance)}
                        </span>
                        {wallet ? <div className="dashboardbutton" onClick={handleDisconnect}>Disconnect</div> :
                            <div className="dashboardbutton" onClick={handleOpen}>Connect</div>}
                    </div>
                </div>
            </div>
            <WalletModal
                isOpen={walletOpen}
                onClose={handleClose} />
        </header>
    )
}