export default function InputBoxMax({label, tag, value, setValue}:{label:string, tag:string, value:string, setValue:Function}) {
    const handleChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    };
    return (
        <>
            {label != "" && <label className="text-sm block mb-2 font-medium text-gray-900 dark:text-gray-300">{label}</label>}
            <div className="relative rounded-md shadow-sm">
                <input id="code" name="code" type="text" className="border block w-full focus:outline-none focus:ring-1 appearance-none transition-colors duration-300 bg-white border-gray-300 text-gray-900  rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-900 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white py-2 text-sm pl-2 pr-12" value={value} onChange={handleChanged}/>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {tag}
                </div>
            </div>
        </>
    )
}