import { useEffect, useRef } from "react"

export default function Progress({minted}:{minted:number}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (ref.current) {
        ref.current.style.width = `${minted}%`  
        if (minted == 0) {
          ref.current.style.width = '0px'
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ minted ])

  return (
    <div className="airdrop-progress relative flex w-full h-[1.5rem]">
      <div className="bg-bar absolute top-0 left-0"></div>
      <div className="fill-bar absolute top-0 left-0" ref={ref}></div>
      <div className="text text-sm">{`${minted} %`}</div>
    </div>
  )
}