import React from "react";
import RegisterAdmin from '../../components/Login/Administrator/RegisterAdmin';

function LoginAdm() {
  return (
    <div className="flex w-full min-h-screen">
      <div className="w-full flex items-center justify-center lg:w-1/2 bg-gray-200">
        <RegisterAdmin />
      </div>
      <div className="hidden relative lg:flex min-h-full w-1/2 items-center justify-center bg-gray-300">
        <div className="w-80 h-80 bg-gradient-to-tr from-gray-900 to-cyan-400 rounded-full animate-bounce" />
        <div className="w-full h-1/2 absolute bottom-0 bg-white/10 backdrop-blur-lg" />
      </div>
    </div>
  );
}

export default LoginAdm;
