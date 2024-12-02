import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeIcon from "../../assets/icons/HomeIcon";
import DetailIcon from "../../assets/icons/DetailIcon";
import CreateIcon from "../../assets/icons/CreateIcon";
import AdminIcon from "../../assets/icons/AdminIcon";
import { useAppStore } from "../../store/app";

export default function NavHome({ title, active, link }: { title: string, active: boolean, link: string }) {
    const navigate = useNavigate()
    const app = useAppStore((state) => state)
    const [menu, setMenu] = useState<boolean>(true);
    const handleDisconnect = () => {
        navigate(link)
    }
    useEffect(() => {
        console.log("navbar active", active);
    }, [active])
    useEffect(() => {
        if (!menu) {
            setTimeout(() => {
                setMenu(app.menu);
            }, 300);
        }else{
            setMenu(app.menu);
        }
    }, [app.menu])
    const getImage = () => {
        if (title == "Launch List") {
            return <HomeIcon width="16px" height="16px" color={active ? "#4cd964" : "#ffffff"} />
        } else if (title == "Edit Collection") {
            return <DetailIcon width="18px" height="18px" color={active ? "#4cd964" : "#ffffff"} />
        } else if (title == "Create Collection") {
            return <CreateIcon width="18px" height="18px" color={active ? "#4cd964" : "#ffffff"} />
        } else {
            return <AdminIcon width="18px" height="18px" color={active ? "#4cd964" : "#ffffff"} />
        }
    }
    return (
        <div className={`items-center text-base rounded-md cursor-pointer flex h-10 mb-2 ${app.menu ? "justify-between" : "justify-center"} px-3 select-none dark:hover:text-emerald-400 dark:hover:bg-gray-700/50 ${active ? "text-[#4cd964] bg-gray-700/50" : "dark:text-gray-200"}`} onClick={handleDisconnect}>
            <div className="flex gap-2 items-center justify-center">
                {getImage()}
                {menu && <div className="whitespace-nowrap text-sm">{title}</div>}
            </div>
        </div>
    )
}