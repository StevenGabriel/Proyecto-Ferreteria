import React, { useEffect, useState } from 'react';
import axios from 'axios';

function DataComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/marcas')
      .then(response => {
        setData(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the data!', error);
      });
  }, []);

  return (
    <div>
          <div className="container mx-auto">
      <h1 className="text-4xl font-bold text-center">Welcome to My App</h1>
      <button className="text-gray-900 bg-gradient-to-r from-lime-200 via-lime-400 to-lime-500 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-lime-300 dark:focus:ring-lime-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
        Click Me
      </button>
    </div>
      <h1>Data from SQL Server</h1>
      <ul>
        {data.map(marca => (
          <li key={marca.MarcaID}>{marca.Nombre}</li>
        ))}
      </ul>

    </div>
  );
}

export default DataComponent;
