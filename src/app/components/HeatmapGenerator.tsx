'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { Button, Form, InputGroup } from 'react-bootstrap';

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

        // Loga a estrutura completa do JSON
        console.log('JSON Data:', jsonData);

        let deepstreamMessages: string[] = [];
        if (jsonData['hits'] && Array.isArray(jsonData['hits']['hits'])) {
          jsonData['hits']['hits'].forEach((hit: any) => {
            if (hit.fields && hit.fields['deepstream-msg']) {
              deepstreamMessages = deepstreamMessages.concat(hit.fields['deepstream-msg']);
            }
          });
        }

        // Loga as mensagens deepstream extraídas
        console.log('Deepstream Messages:', deepstreamMessages);

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

        // Loga as opções de relevância identificadas
        console.log('Relevance Options:', Array.from(relevanceSet));
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

        // Loga os pontos gerados a partir das mensagens
        console.log('Heatmap Points:', points);
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
    <div className="main-container">
      <h1 className="text-center">Heatmap Generator with D3.js</h1>
      <Form className="d-flex justify-content-center flex-column">
        <InputGroup className="d-flex justify-content-center flex-row">
          <Form.Group controlId="formFileImage" className="m-3 text-center d-flex flex-column justify-content-center">
            <Form.Label>Upload Image</Form.Label>
            <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
          </Form.Group>
          <Form.Group controlId="formFileJSON" className="m-3 text-center d-flex flex-column justify-content-center">
            <Form.Label>Upload JSON</Form.Label>
            <Form.Control type="file" accept="application/json" onChange={handleJSONUpload} />
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
      <Button className="my-3" style={{ width: '240px' }} variant="warning" onClick={handleDownload}>Download Heatmap</Button>
    </div>
  );
};

export default HeatmapGenerator;
