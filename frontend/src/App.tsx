import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Main from "./pages/Main"
import Details from "./pages/Details"
import Admin from "./pages/Admin"

import "./App.css"
import "react-toastify/dist/ReactToastify.min.css";
import { useAppStore } from "./store/app";
import NavBar from "./components/NavBar";
import TopBar from "./components/TopBar";
import MyCollection from "./pages/MyCollection";
import CreateCollection from "./pages/CreateCollection";
import Mint from "./pages/Mint";
import Footer from "./components/Footer";
import CircularLoading from "./components/CircularLoading"

function App() {
  const app = useAppStore((state: any) => (state))
  
  return (
  <>
    <ToastContainer />

    <section className="main__content">
      <div className="relative flex flex-auto min-w-0">
        <NavBar/>
        <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <TopBar/>
          <div className="h-full flex flex-auto flex-col justify-between">
            <Routes>
              <Route path="/" element={<Main />}></Route>
              <Route path="/me" element={<MyCollection />}></Route>
              <Route path="/detail" element={<Details />}></Route>
              <Route path="/create" element={<CreateCollection />}></Route>
              <Route path="/admin" element={<Admin />}></Route>
              <Route path="/mint" element={<Mint/>}></Route>
            </Routes>
            <Footer/>
          </div>
        </div>
      </div>
    </section>

    { app.loading && <CircularLoading /> }
  </>
  );
}

export default App;
