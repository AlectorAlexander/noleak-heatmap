'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { HeatmapData } from '@/Interfaces & Types/types';
import { JSONData } from '@/Interfaces & Types/interfaces';


const HeatmapGenerator: React.FC = () => {
  const [image, setImage] = useState<string | ArrayBuffer | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData>([]);
  const [relevanceOptions, setRelevanceOptions] = useState<string[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Função para lidar com a mudança de imagem
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

  // Função para lidar com o upload de JSON
  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const jsonData: JSONData = JSON.parse(text);

        console.log('JSON Data:', jsonData);

        let deepstreamMessages: string[] = [];

        if (jsonData.hits && Array.isArray(jsonData.hits.hits)) {
          jsonData.hits.hits.forEach((hit) => {
            if (hit.fields && hit.fields['deepstream-msg']) {
              deepstreamMessages = deepstreamMessages.concat(hit.fields['deepstream-msg']);
            }
          });
        }

        console.log('Deepstream Messages:', deepstreamMessages);

        if (!deepstreamMessages.length) {
          console.error('JSON does not contain deepstream-msg');
          return;
        }

        const relevanceSet = new Set<string>();
        deepstreamMessages.forEach((msg) => {
          const parts = msg.split('|');
          const object = parts[5];
          relevanceSet.add(object);
        });

        console.log('Relevance Options:', Array.from(relevanceSet));
        setRelevanceOptions(Array.from(relevanceSet));

        const points = deepstreamMessages.map((msg) => {
          const parts = msg.split('|');
          const xMin = parseFloat(parts[1]);
          const yMin = parseFloat(parts[2]);
          const xMax = parseFloat(parts[3]);
          const yMax = parseFloat(parts[4]);
          const x = (xMin + xMax) / 2;
          const y = (yMin + yMax) / 2;
          let value = parseFloat(parts[6]);
          if (isNaN(value)) {
            value = Math.abs((xMax - xMin) * (yMax - yMin));
          }
          if (isNaN(value)) {
            console.warn('Invalid value for heatmap point:', parts[6]);
            value = Math.random() * 100; // Valor aleatório como fallback
          }
          return { x, y, value, object: parts[5] };
        });

        console.log('Heatmap Points:', points);
        setHeatmapData(points);

      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
  };

  // Função para desenhar o heatmap
  const drawHeatmap = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;

    context.clearRect(0, 0, width, height);

    const img = new Image();
    img.src = image as string;

    img.onload = () => {
      context.globalAlpha = 1;
      context.drawImage(img, 0, 0, width, height);

      const filteredData = heatmapData.filter(d => d.object === selectedRelevance);

      const maxVal = d3.max(filteredData, d => d.value) || 1;
      const minVal = d3.min(filteredData, d => d.value) || 0;

      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([maxVal, minVal]);

      const radiusScale = d3.scaleSqrt()
        .domain([0, maxVal])
        .range([0, 20]);

      const xAdjustment = 0.16;
      const yAdjustment = -0.05;
      const transparency = 0.3;

      filteredData.forEach(d => {
        const x = d.x * width / img.width;
        const y = d.y * height / img.height;
        const xAdjusted = x + width * xAdjustment;
        const yAdjusted = y + height * yAdjustment;

        context.beginPath();
        context.arc(xAdjusted, yAdjusted, radiusScale(d.value), 0, 2 * Math.PI);
        context.fillStyle = colorScale(d.value) as string;
        context.globalAlpha = transparency;
        context.fill();
      });
    };
  };

  useEffect(() => {
    if (image && heatmapData.length > 0) {
      drawHeatmap();
    }
  }, [image, heatmapData, selectedRelevance]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = 'heatmap.png';
    link.click();
  };

  return (
    <div className="main-container">
      <h1 className="text-center">Heatmap Generator</h1>
      <Form className="d-flex justify-content-center flex-column">
        <InputGroup className="d-flex justify-content-center flex-row">
          <Form.Group controlId="formFileImage" className="m-3 text-center d-flex flex-column justify-content-center">
            <Form.Label>Upload Image</Form.Label>
            <Form.Control className='inputType form-control-sm text-center' type="file" accept="image/*" onChange={handleImageChange} />
          </Form.Group>
          <Form.Group controlId="formFileJSON" className="m-3 text-center d-flex flex-column justify-content-center">
            <Form.Label>Upload JSON</Form.Label>
            <Form.Control className='inputType form-control-sm text-center' type="file" accept="application/json" onChange={handleJSONUpload} />
          </Form.Group>
        </InputGroup>
        {relevanceOptions.length > 0 && (
          <Form.Group controlId="formSelectRelevance" className="my-3 w-100 d-flex flex-column align-items-center text-center">
            <Form.Control
              as="select"
              onChange={(e) => setSelectedRelevance(e.target.value)}
              style={{ width: '250px' }}
              value={selectedRelevance}
            >
              <option value="">Select Relevance</option>
              {relevanceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        )}
      </Form>

      <div className="heatmap-container">
        <canvas ref={canvasRef} className="heatmap-canvas"></canvas>
        {image && <img src={image.toString()} alt="Uploaded" className="hidden-image" />}
      </div>
      {relevanceOptions.length > 0 && (
        <Button className="my-3" style={{ width: '240px' }} variant="warning" onClick={handleDownload}>
          Download Heatmap
        </Button>
      )}
    </div>
  );
};

export default HeatmapGenerator;
