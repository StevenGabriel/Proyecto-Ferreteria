import React from "react";
import { Link } from "react-router-dom";

function RegisterClient() {
  return (
    <div className="bg-white px-10 py-20 rounded-3xl border-2 border-gray-100">
      <h1 className="text-5xl font-semibold">Registrate</h1>
      <p className="font-medium text-lg text-gray-500 mt-4 ">
        Por favor ingrese sus datos
      </p>
      <div className="mt-8">
        <div>
          <label className="text-lg font-medium">Correo</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su correo"
          />
        </div>
        <div>
          <label className="text-lg font-medium">Contraseña</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su contraseña"
            type="password"
          />
        </div>
        <div>
          <label className="text-lg font-medium">Nombre</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su nombre"
          />
        </div>
        <div>
          <label className="text-lg font-medium">Primer Apellido</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su primer apellido"
          />
        </div>
        <div>
          <label className="text-lg font-medium">Segundo Apellido</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su segundo apellido"
          />
        </div>
        <div>
          <label className="text-lg font-medium">Teléfono</label>
          <input
            className="w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent"
            placeholder="Ingrese su teléfono"
          />
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-y-4">
        <button className="active:scale-[.98] active:duration-75 hover:scale-[1.01] ease-in-out transition-all mt-8 bg-gradient-to-r from-gray-900 to-cyan-400 text-white px-6 py-4 rounded-xl font-medium">
          Registrarse
        </button>
      </div>
      <div className="mt-8 flex justify-center items-center">
        <Link
          to="/loginClie"
          className="text-cyan-700 text-base font-medium ml-2"
        >
          Volver?
        </Link>
      </div>
    </div>
  );
}

export default RegisterClient;
