import ExitIcon from "../../assets/icons/ExitIcon";
import InputBox from "../Input/InputBox";
import InputBoxMax from "../Input/InputBoxMax";
import TimeSelector from "./TimeSelector";
import { isNumber } from "@injectivelabs/sdk-ts";
import { todayInSeconds } from "../../utils/utils";

export default function ({ phase_data, setPhase, isActive, handleWLEdit }: { phase_data: MintPhaseConfig, setPhase: Function, isActive: boolean, handleWLEdit:Function }) {

    const handleSetName = (name: string) => {
        let new_data: MintPhaseConfig = { ...phase_data };
        new_data.mint_name = name
        setPhase(new_data)
    }
    const handleSetPrice = (price: string) => {
        let new_data: MintPhaseConfig = { ...phase_data };
        if (price && isNumber(price)) {
            new_data.price = price;
        } else {
            new_data.price = "0";
        }

        setPhase(new_data)
    }
    const handleStartTime = (start_time: number) => {
        let new_data: MintPhaseConfig = { ...phase_data };
        new_data.start_time = start_time
        setPhase(new_data)
    }
    const handleEndTime = (end_time: number) => {
        let new_data: MintPhaseConfig = { ...phase_data };
        new_data.end_time = end_time
        setPhase(new_data)
    }
    const handleDelete = () => {
        let new_data: MintPhaseConfig = { ...phase_data };
        new_data.start_time = 0;
        setPhase(new_data)
    }
    const isActivePhase = () => {
        if (isActive) {
            if (phase_data.start_time <= todayInSeconds() && phase_data.end_time >= todayInSeconds()) {
                return true;
            }
        }
        return false;
    }
    const handleEditWL = () => {
        handleWLEdit(phase_data);
        return;
    }
    return (
        <div className={`animate-fade-up border ${isActivePhase() ? "border-green-600" : "border-gray-600"} bg-white/60 dark:bg-gray-700/30 rounded-md p-3 my-2`}>
            <div className='flex justify-between'>
                <label className="text-sx font-semibold text-emerald-500">Step {phase_data.mint_type}</label>
                <button className="flex"
                    onClick={handleDelete}>
                    <ExitIcon width="25px" height="25px" color="#fff" />
                </button>
            </div>


            <div className="gap-3 my-4 w-full grid md:grid-cols-2 ">
                <div className="w-full">
                    <InputBox label="Name" placeholder="test 1" value={phase_data.mint_name} setValue={handleSetName} />
                </div>
                <div className="w-full">
                    <InputBoxMax label="Mint price" tag="inj" value={phase_data.price} setValue={handleSetPrice} />
                </div>
                <div className="w-full">
                    <TimeSelector label="Start time" startTime={phase_data.start_time} setStartTime={handleStartTime} />
                </div>
                <div className="w-full">
                    <TimeSelector label="End time" startTime={phase_data.end_time} setStartTime={handleEndTime} />
                </div>                
            </div>
            <div className="flex w-full justify-end">
                <button type="button" className="btn disabled:pointer-events-none disabled:bg-gray-50/50 disabled:dark:bg-gray-700/50 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:dark:bg-gray-900 rounded-lg py-3 border border-gray-200 dark:border-gray-600 transition duration-200 text-gray-900 dark:text-white font-semibold"
                    onClick={handleEditWL}>
                    <span>Edit White List</span>
                </button>
            </div>
           
        </div>
    )
}