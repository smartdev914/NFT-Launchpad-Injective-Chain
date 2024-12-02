import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; 


export default function TippyTooltip(){
    return(
        <Tippy content={<span>This is a tooltip</span>}>
            <button>Tooltip trigger</button>
        </Tippy>
    )
}
