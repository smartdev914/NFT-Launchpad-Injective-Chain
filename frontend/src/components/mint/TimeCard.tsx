export default function TimeCard ({value, label}:{value:string, label:string}){
    return (
        <div className="flex flex-col border border-gray-400 dark:border-gray-600 bg-white/60 dark:bg-gray-700/30 rounded-md p-1.5">
            <span className="countdown font-mono font-semibold text-gray-600 dark:text-gray-200 text-sm md:text-xl flex justify-center">
                <span>{value}</span>
            </span>
            <span>{label}</span>
        </div>
    )
}