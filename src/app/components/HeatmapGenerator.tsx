'use client';

import React, { useState } from 'react';
import Heatmap from 'heatmap.js';
import { saveAs } from 'file-saver';
import { generateFilename } from '../utils/generateFilename';

const HeatmapGenerator: React.FC = () => {
  const [image, setImage] = useState<string | ArrayBuffer | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [relevanceOptions, setRelevanceOptions] = useState<string[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<string>('');
  const [existingHeatmap, setExistingHeatmap] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setExistingHeatmap(null); // Resetar o heatmap existente ao carregar nova imagem
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        console.log('JSON Data:', { hits: jsonData.hits.hits[0].fields['deepstream-msg'] }); // Log para verificar o JSON carregado

        // Navegar na estrutura do JSON para encontrar 'deepstream-msg'
        let deepstreamMessages = null;
        if (jsonData['hits'] && Array.isArray(jsonData['hits']['hits'])) {
          deepstreamMessages = jsonData['hits']['hits'][0]?.fields?.['deepstream-msg'];
        }

        if (!deepstreamMessages) {
          console.error('JSON does not contain deepstream-msg');
          return;
        }

        // Extração das opções de relevância
        const relevanceSet = new Set<string>();
        deepstreamMessages.forEach((msg: string) => {
          const parts = msg.split('|');
          const object = parts[5];
          relevanceSet.add(object);
        });
        setRelevanceOptions(Array.from(relevanceSet));

        const points = deepstreamMessages.map((msg: string) => {
          const parts = msg.split('|');
          const xMin = parseFloat(parts[1]);
          const yMin = parseFloat(parts[2]);
          const xMax = parseFloat(parts[3]);
          const yMax = parseFloat(parts[4]);
          const x = (xMin + xMax) / 2;
          const y = (yMin + yMax) / 2;
          return { x, y, value: 1, object: parts[5] };
        });
        setHeatmapData(points);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
  };

  const generateHeatmap = async () => {
    if (!image || !selectedRelevance) return;

    const filename = generateFilename(heatmapData, selectedRelevance);

    console.log(`Checking if file exists: ${filename}`);

    const res = await fetch(`/api/checkFileExists?filename=${filename}`);
    const data = await res.json();

    if (data.exists) {
      console.log(`File ${filename} exists on the server.`);
      setExistingHeatmap(`/images/${filename}`);
    } else {
      console.log(`File ${filename} does not exist on the server. Generating new heatmap.`);
      const filteredData = heatmapData.filter(data => data.object === selectedRelevance);

      const heatmapInstance = Heatmap.create({
        container: document.querySelector('#heatmapContainer') as HTMLElement
      });
      heatmapInstance.setData({
        max: 1,
        data: filteredData
      });

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      canvas.toBlob((blob) => {
        if (blob) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            if (fileReader.result) {
              setExistingHeatmap(fileReader.result as string);
            }
          };
          fileReader.readAsDataURL(blob);
        }
      });
    }
  };

  return (
    <div>
      <h1>Heatmap Generator</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <input type="file" accept="application/json" onChange={handleJSONUpload} />
      {image && (
        <div style={{ marginTop: '20px' }}>
          <h2>Image Preview</h2>
          <img src={image.toString()} alt="Uploaded" style={{ width: '500px', height: 'auto' }} />
        </div>
      )}
      {relevanceOptions.length > 0 && (
        <select onChange={(e) => setSelectedRelevance(e.target.value)} value={selectedRelevance}>
          <option value="">Select Relevance</option>
          {relevanceOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}
      <button onClick={generateHeatmap} style={{ marginTop: '20px' }}>Generate Heatmap</button>
      <div id="heatmapContainer" style={{ width: '500px', height: '500px', position: 'relative', marginTop: '20px' }}>
        {existingHeatmap && (
          <>
            <h2>Heatmap</h2>
            <img src={existingHeatmap} alt="Heatmap" style={{ width: '80%', height: '80%' }} />
            <button onClick={() => saveAs(existingHeatmap, 'heatmap.png')} style={{ marginTop: '10px' }}>Download Heatmap</button>
          </>
        )}
      </div>
    </div>
  );
};

export default HeatmapGenerator;
