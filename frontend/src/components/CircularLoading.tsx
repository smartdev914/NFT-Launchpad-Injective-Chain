import { ClipLoader,  } from 'react-spinners';


const CircularLoading = () => {
  return (
    <div className="z-40 fixed bottom-20 right-10">
      <ClipLoader size={60} color="#07bc0c" />
      {/* <div className="fixed bottom-20 right-10">Loading</div> */}
    </div>
  );
};

export default CircularLoading;