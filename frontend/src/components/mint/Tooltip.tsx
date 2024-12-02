import { ReactNode } from 'react';
import '../../styles/components/tooltips.css';


export default function Tooltip({
    children,
    tooltipText="Tooltip Text",
    position="bottom",
}:{children: ReactNode, tooltipText: string, position: string}){
    return(
        <div className="tooltip-trigger ">
            {children}
            <div className={`text-[12px] text-left dark:bg-gray-600 tooltip tooltip-${position}`}>
                {tooltipText}
            </div>
        </div>
    )
}
