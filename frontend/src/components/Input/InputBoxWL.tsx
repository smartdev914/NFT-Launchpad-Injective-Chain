export default function InputBoxWL({placeholder, value, setValue} : {placeholder:string, value:string, setValue: Function}) {
    const handleChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    };
    return (
        <>
            <input name="code" className="bg-white border-gray-300 text-gray-900  rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-900 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white border block w-full focus:outline-none  focus:ring-1 appearance-none py-2 text-sm pl-2 pr-2 text-right" type="text" placeholder={placeholder} value={value} onChange={handleChanged}/>            
        </>
    )
}