import AVARTAR_IMG from "../assets/images/avatar.jpg"
import NavHome from "./Nav/NavHome"
import { useAppStore } from "../store/app";
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from "react";
import useWindowSize from "../hooks/use-window-size";
import ExitIcon from "../assets/icons/ExitIcon";
export default function NavBar() {
    const app = useAppStore((state) => state)
    const [pathname, setPathname] = useState<string>("/");
    const location = useLocation();
    const [menu, setMenu] = useState<boolean>(true);
    const { isMobile } = useWindowSize();

    useEffect(() => {
        let path = location.pathname;
        console.log("navigate path", path);
        if (path == "/" || path == "/me" || path == "/create" || path == "/admin") {
            setPathname(path);
        }
        if (menu && isMobile){
            app.setMenu();
        }
    }, [location])
    useEffect(() => {
        setTimeout(() => {
            setMenu(app.menu);
        }, 300);
    }, [app.menu])
    return (
        <div className={`bg-[#111827ec] h-full top-0 flex-auto flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${app.menu ? "w-[252px]" : isMobile ? "w-[0px]" : "w-[90px]"} ${!isMobile ? "z-0 flex" : "z-40 absolute hidden"}}`}>
            <div className={`flex w-full ${menu ? "p-5" : "p-3"} mb-5 items-center justify-between`}>
                <img src={AVARTAR_IMG} className={`rounded-xl ${menu && isMobile ? "w-1/5" : isMobile? "w-1/5" : "w-full"}`}></img>
                {isMobile && app.menu && <div className="flex">
                    <button className="flex"
                        onClick={() => app.setMenu()}>
                        <ExitIcon width="25px" height="25px" color="#fff"/> 
                    </button>
                </div>}
            </div>
            <div className="group w-full overflow-y-hidden">
                <nav className="px-2 pb-4">
                    <div>
                        <ul>
                            <NavHome title="Launch List" active={pathname == "/"} link="/"></NavHome>
                            {app.is_admin && <NavHome title="Edit Collection" active={pathname == "/me"} link="/me"></NavHome>}
                            {app.is_admin && <NavHome title="Create Collection" active={pathname == "/create"} link="/create"></NavHome>}
                            {app.is_admin && <NavHome title="Admin" active={pathname == "/admin"} link="/admin"></NavHome>}
                        </ul>
                    </div>
                </nav>
            </div>
        </div>
    )
}