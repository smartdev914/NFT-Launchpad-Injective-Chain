export default function CollectionInfoLine({title, value}:{title:string, value:string}){
    return (
        <div className="flex justify-between mt-4">
            <span className="font-medium text-slate-400 block mb-1">{title}</span>
            <span className="font-medium block">{value}</span>
        </div>
    )
}