import { useEffect, useRef } from "react"

export default function MintedProgress({minted, total_supply}:{minted:number, total_supply:number}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (ref.current) {
        ref.current.style.width = `${minted*100/total_supply}%`
        if (minted == 0) {
          ref.current.style.width = '0px'
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ minted, total_supply ])

  return (
    <div className="airdrop-progress relative flex w-full">
      <div className="bg-bar absolute top-0 left-0"></div>
      <div className="fill-bar absolute top-0 left-0" ref={ref}></div>
      <div className="text">{`${minted} / ${total_supply}`}</div>
    </div>
  )
}