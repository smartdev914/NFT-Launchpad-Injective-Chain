export default function Footer() {
    return (
        <footer className="flex flex-auto items-center h-12 max-h-12 px-4 sm:px-6 md:px-8 mt-10 bg-gray-200 dark:bg-gray-800">
            <div className="flex items-center justify-between flex-auto w-full text-xs">
                <span>Copyright © 2023 <span className="font-semibold">Best</span> All rights reserved.</span>
                <div className="flex items-center">
                    <a className="text-gray" href="">Term &amp; Conditions</a>
                    <span className="mx-2 text-muted"> | </span>
                    <a className="text-gray" href="">Privacy &amp; Policy</a>
                </div>
            </div>
        </footer>
    )
}