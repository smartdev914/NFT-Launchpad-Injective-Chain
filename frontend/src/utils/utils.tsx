import axios from "axios";
import FormData from "form-data";

// import streamToBlob from 'stream-to-blob';

export const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlYzM5YmQ2YS03NDc0LTRkN2QtOGUwZC1iMTgxODE4Mzc0M2QiLCJlbWFpbCI6ImFsaWVuc29uaW5qQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI0NDlhNTcwMDllODU4NDNjZTBjNyIsInNjb3BlZEtleVNlY3JldCI6ImQ1ZGU1MmQ0NDA1MDA2OWE4MjNiZTZlNzI4MGMzNWI1NjJhNDI0ZjBiNzljOGM3YTgyYzllNGI4Yzc1ZTA0YTMiLCJpYXQiOjE2OTgwNzY2MzV9.Z0XNUxhb_wS8L6RCgLDXRWq-gjDfVHsX7UMGwPfhcRA'
export const IPFSCLOUDSERVER = "injmarketlaunchpad.mypinata.cloud";
export const IPFS_ACCESS_TOKEN = "gc4ijN4VkZuNLMofa_WeR20djYh1SSAClPrbGEwVOwTKtKDHr9huXOWWiiHuFFNv";

export function convertToFixedDecimals(amount: number) {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  if (amount > 0.01) {
    return amount.toFixed(2)
  } else return String(amount)
}

export function convertToWei(amount: number) {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  if (amount > 0.01) {
    return amount.toFixed(2)
  } else return String(amount)
}

export const changeBackgroundUrl = (url: string) => {
  document.documentElement.style.setProperty('--background-url', url);
}

export const copyClipboard = (data: string) => {
  navigator.clipboard.writeText(data)
    .then(() => {
      console.log('Text copied to clipboard');
    })
    .catch((error) => {
      console.error('Failed to copy text:', error)
    });
}

export const getDays = (seconds: number) => {
  let days: number = Math.floor(seconds / (60 * 60 * 24))
  return days;
}

export const getDaysCeil = (seconds: number) => {
  let days: number = Math.ceil(seconds / (60 * 60 * 24))
  return days;
}

export const getHours = (seconds: number) => {
  let hours: number = Math.floor(seconds / (60 * 60))
  return (hours % 24);
}

export const getMinutes = (seconds: number) => {
  let minutes: number = Math.floor(seconds / 60)
  return (minutes % 60);
}

export const getSeconds = (seconds: number) => {
  return (seconds % 60);
}

export const getDayToSeconds = (day: number) => {
  return (day * 24 * 60 * 60);
}
export const todayInSeconds = (): number => {
  return Math.floor(Date.now() / 1000)
}
export const secondToDate = (second: number) => {
  let date = new Date(second * 1000);
  return date.toLocaleString();
}

export const nFormatter = (num: number, digits?: number): string => {
  if (!num) return "0";
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits || 1).replace(rx, "$1") + item.symbol
    : "0";
}
export const isValidateAddress = (address: string) => {
  const ADDRESS_RE = /^[0-9a-z]{42}$/i

  if (!ADDRESS_RE.test(address)) {
    return false;
  }
  return true;
}
export const isValidateCID = (cid: string) => {
  const ADDRESS_RE = /^[0-9a-z]{46}$/i

  if (!ADDRESS_RE.test(cid)) {
    return false;
  }
  return true;
}
export const timestampToDateTimeLocal = (timestamp: number): string => {
  const t = new Date(timestamp * 1000)
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset())
  return t.toISOString().slice(0, 16)
}

export const pinFileToIPFS = async (file_name: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file)

  const pinataMetadata = JSON.stringify({
    name: file_name,
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  })
  formData.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxContentLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data`,
        'Authorization': `Bearer ${JWT}`
      }
    });
    console.log("Upload file", res.data);
    return res.data.IpfsHash;
  } catch (error) {
    console.log("Upload file error", error);
    return "";
  }
}

export const getRandomIds = (total: number, excludedBuffer: number[], amount: number): number[] => {
  const validIds: number[] = [];

  for (let id = 1; id <= total; id ++) {
    if (!excludedBuffer.includes(id)) {
      validIds.push(id);
    }
  }

  if (validIds.length === 0 || amount > validIds.length) {
    return []; // In case there are no valid IDs
  }
  const randomIds: number[] = [];

  while (randomIds.length < amount) {
    const randomIndex: number = Math.floor(Math.random() * validIds.length);
    const randomId: number = validIds[randomIndex];

    if (!randomIds.includes(randomId)) {
      randomIds.push(randomId);
    }
  }

  return randomIds;
}
