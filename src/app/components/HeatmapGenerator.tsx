'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

const HeatmapGenerator: React.FC = () => {
  const [image, setImage] = useState<string | ArrayBuffer | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [relevanceOptions, setRelevanceOptions] = useState<string[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Pega uma imagem e lê ela  */
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

  /* Pega o arquivo json e o converte, destrincha, e o disponibiliza no estado global para que se possa utilizar as coordenadas do arquivo JSON para a marcação dos pontos de calor */
  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        console.log(jsonData);

        let deepstreamMessages: string[] = [];
        if (jsonData['hits'] && Array.isArray(jsonData['hits']['hits'])) {
          jsonData['hits']['hits'].forEach((hit: any) => {
            if (hit.fields && hit.fields['deepstream-msg']) {
              deepstreamMessages = deepstreamMessages.concat(hit.fields['deepstream-msg']);
            }
          });
        }

        if (!deepstreamMessages.length) {
          console.error('JSON does not contain deepstream-msg');
          return;
        }

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
          const value = parseFloat(parts[6]) || 1; // Usando valor do JSON se disponível
          return { x, y, value, object: parts[5] };
        });
        setHeatmapData(points);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
  };



  const drawHeatmap = () => {
    if (!canvasRef.current) return;
    // Verifica se o canvas está disponível

    const canvas = canvasRef.current;
    // Obtém a referência do canvas
    const context = canvas.getContext('2d');
    // Obtém o contexto 2D do canvas
    if (!context) return;
    // Verifica se o contexto 2D foi obtido com sucesso

    const width = canvas.width;
    // Define a largura do canvas
    const height = canvas.height;
    // Define a altura do canvas

    context.clearRect(0, 0, width, height);
    // Limpa o canvas

    const img = new Image();
    // Cria uma nova imagem
    img.src = image as string;
    // Define a fonte da imagem como o estado da imagem carregada
    img.onload = () => {
      // Define uma função para executar quando a imagem for carregada
      context.globalAlpha = 1;
      // Redefine a opacidade global para 1 antes de desenhar a imagem
      context.drawImage(img, 0, 0, width, height);
      // Desenha a imagem no canvas

      const colorScale = d3.scaleSequential(d3.interpolateViridis)
      // Cria uma escala de cores usando d3.interpolateViridis
        .domain([0, d3.max(heatmapData, d => d.value) as number]);
      // Define o domínio da escala de cores

      const filteredData = heatmapData.filter(d => d.object === selectedRelevance);
      // Filtra os dados do heatmap para incluir apenas os dados relevantes selecionados

      const radiusScale = d3.scaleSqrt()
      // Cria uma escala para o raio dos círculos baseado no valor dos dados
        .domain([0, d3.max(filteredData, d => d.value) as number])
      // Define o domínio da escala de raio
        .range([0, 20]);
      // Define a faixa de valores da escala de raio

      // Adiciona parâmetros de ajuste fino
      const xAdjustment = 0.16; // Ajuste para a coordenada x
      const yAdjustment = -0.05; // Ajuste para a coordenada y

      // Define a transparência dos pontos de calor
      const transparency = 0.2; // Ajuste este valor para testar diferentes transparências

      filteredData.forEach(d => {
        // Para cada dado filtrado
        const x = d.x * width / img.width;
        // Calcula as coordenadas escaladas para o tamanho do canvas
        const y = d.y * height / img.height;
        // Calcula as coordenadas escaladas para o tamanho do canvas
        const xAdjusted = x + width * xAdjustment; // Ajusta a coordenada x
        const yAdjusted = y + height * yAdjustment; // Ajusta a coordenada y
        context.beginPath();
        // Inicia um novo caminho no canvas
        context.arc(xAdjusted, yAdjusted, radiusScale(d.value), 0, 2 * Math.PI);
        // Desenha um arco (círculo) no canvas
        context.fillStyle = colorScale(d.value) as string;
        // Define a cor de preenchimento do círculo
        context.globalAlpha = transparency;
        // Define a opacidade global para os pontos de calor
        context.fill();
        // Preenche o círculo com a cor definida
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
    <div className="main-conteiner">
      <h1>Heatmap Generator with D3.js</h1>
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
      <div className="heatmap-container" style={{ position: 'relative', minWidth: '100%', minHeight: '100%', border: '1px solid black' }}>
        <canvas className="heatmap-canvas" ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }}></canvas>
        {image && <img src={image.toString()} alt="Uploaded" style={{ display: 'none' }} />}
      </div>
      <button onClick={handleDownload}>Download Heatmap</button>
    </div>
  );
};

export default HeatmapGenerator;
