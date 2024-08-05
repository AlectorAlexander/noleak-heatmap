'use client';

import React, { useState } from 'react';
import Heatmap from 'heatmap.js';
import { saveAs } from 'file-saver';

const HeatmapGenerator: React.FC = () => {
  const [image, setImage] = useState<string | ArrayBuffer | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [relevanceOptions, setRelevanceOptions] = useState<string[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<string>('');

  // Função para carregar a imagem
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para carregar o JSON e processar os dados
  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Extração das opções de relevância
      const relevanceSet = new Set<string>();
      jsonData['deepstream-msg'].forEach((msg: string) => {
        const parts = msg.split('|');
        const object = parts[5];
        relevanceSet.add(object);
      });
      setRelevanceOptions(Array.from(relevanceSet));

      const points = jsonData['deepstream-msg'].map((msg: string) => {
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
    }
  };

  // Função para gerar o heatmap
  const generateHeatmap = () => {
    const filteredData = heatmapData.filter(data => data.object === selectedRelevance);

    const heatmapInstance = Heatmap.create({
      container: document.querySelector('#heatmapContainer') as HTMLElement
    });
    heatmapInstance.setData({
      max: 1,
      data: filteredData
    });
  };

  // Função para fazer o download do heatmap
  const downloadHeatmap = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, 'heatmap.png');
      }
    });
  };

  return (
    <div>
      <h1>Heatmap Generator</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <input type="file" accept="application/json" onChange={handleJSONUpload} />
      {relevanceOptions.length > 0 && (
        <select onChange={(e) => setSelectedRelevance(e.target.value)} value={selectedRelevance}>
          <option value="">Select Relevance</option>
          {relevanceOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}
      <button onClick={generateHeatmap}>Generate Heatmap</button>
      <button onClick={downloadHeatmap}>Download Heatmap</button>
      <div id="heatmapContainer" style={{ width: '500px', height: '500px', position: 'relative' }}>
        {image && <img src={image.toString()} alt="Uploaded" style={{ width: '100%', height: '100%' }} />}
      </div>
    </div>
  );
};

export default HeatmapGenerator;
