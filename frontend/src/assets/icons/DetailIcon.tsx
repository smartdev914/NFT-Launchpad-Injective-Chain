function DetailIcon({width, height, color} : {width:string, height:string, color:string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="2 0 100 100"><path d="M40.24951,70.9917,29.01691,59.74188c-3.99854-.153-10.07123,1.834-13.2602,5.02222C6.41315,74.10541,12.897,87.105,5,95c6.56152-.22211,19.45471-1.08533,28.79828-10.42657C36.979,81.39343,40.00067,74.76392,40.24951,70.9917Z" fill={color}/><path d="M81.43066,7.32813,32.42828,56.33051,43.66949,67.57172,92.67188,18.56934A7.94874,7.94874,0,1,0,81.43066,7.32813Z" fill={color}/></svg>
    );
}

export default DetailIcon;