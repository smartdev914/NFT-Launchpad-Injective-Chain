import {timestampToDateTimeLocal} from "../../utils/utils";
import { useState } from "react";

export default function({label, startTime, setStartTime}:{label:string, startTime:number, setStartTime:Function}) {
    const [time, setTime] = useState<number>(startTime);
    const handleChangeTime = (e: any) => {
        let time = Math.ceil(new Date(e.currentTarget.value).getTime() / 1000)
        setStartTime(time);
        setTime(time)
    }
    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                {label}
            </label>
            <input type="datetime-local" defaultValue={time ? timestampToDateTimeLocal(time) : undefined} onInput={handleChangeTime}
                className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-900 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white border block w-full focus:outline-none focus:ring-1 appearance-none py-2 text-sm pl-2 pr-2"/>
            <div className="vc-popover-content-wrapper is-interactive"></div>
        </div>
    )
}