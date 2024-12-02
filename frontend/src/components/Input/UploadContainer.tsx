declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        // extends React's HTMLAttributes
        directory?: string;
        webkitdirectory?: string;
    }
}
export default function UploadContainer({ type, isCheck, setCheck, url, handleUrl, handleUploadFile }: { type: string, isCheck: boolean, setCheck: Function, url: string, handleUrl: Function, handleUploadFile: Function }) {
    const handleCheckChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheck(event.target.checked);
    };
    const handleFileChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        handleUploadFile(file)
    };
    const handleFolderChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files;
        handleUploadFile(file)
    }
    const handleUrlChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleUrl(event.target.value);
    };

    return (
        <>
            <div>
                <label className="text-sm block mb-2 font-medium text-gray-900 dark:text-gray-300">
                    <div className="flex">
                        <span className="mr-3">{type == "NFT" ? "NFT Token Base Url(CID)" : type == "LOGO" ? "NFT Token Logo CID" : "NFT Art Base Url(CID)"}</span>
                        <label className="inline-flex items-center space-x-2">
                            <input className="form-switch h-5 w-10 rounded-full bg-slate-300 before:rounded-full before:bg-slate-50 checked:!bg-emerald-600 checked:before:bg-white dark:bg-navy-900 dark:before:bg-navy-300 dark:checked:before:bg-white" type="checkbox" checked={isCheck} onChange={handleCheckChanged} />
                            <span>Upload to server</span>
                        </label>
                    </div>
                </label>
                <input name="code" className="bg-white border-gray-300 text-gray-900  rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-900 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white border block w-full focus:outline-none  focus:ring-1 appearance-none py-2 text-sm pl-2 pr-2" type="text" placeholder="Qm..." value={url} onChange={handleUrlChanged} />
                {type == "LOGO" && <small className="mt-1 text-gray-600 dark:text-gray-300" id="email-error">Supports png, jpeg, svg or gif</small>}
            </div>
            <div className="flex items-center align-middle">
                <span className="mr-3 text-base font-medium">{type == "NFT" ? "Upload CSV" : "Upload"}</span>
                <div className="items-center justify-center overflow-hidden rounded-full inline-flex ml-3">
                    {isCheck ?
                        <label className="bg-info hover:bg-info-focus  hover:shadow-info/20 focus:bg-info-focus active:bg-info-focus/90 absolute btn h-9 w-9 rounded-full p-0 font-medium text-white hover:shadow-lg">
                            {type == "NFT" || type == "LOGO" ?
                                <input type="file" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" onChange={handleFileChanged} />
                                :
                                <input type="file" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" onChange={handleFolderChanged} directory="" webkitdirectory="" />
                            }

                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path>
                            </svg>
                        </label>
                        :
                        <label className="hover:bg-info-focus  hover:shadow-info/50 focus:bg-info-focus active:bg-info-focus/90 absolute btn h-9 w-9 rounded-full p-0 font-medium text-white hover:shadow-lg">
                            <input className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path>
                            </svg>
                        </label>}
                </div>
            </div>
        </>
    )
}