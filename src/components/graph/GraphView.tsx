import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getGraphData } from '../../lib/fs';

interface GraphNode {
    id: string;
    name: string;
    val: number;
}

interface GraphLink {
    source: string;
    target: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

const GraphView: React.FC = () => {
    const vaultPath = useAppStore(state => state.vaultPath);
    const fileTreeGeneration = useAppStore(state => state.fileTreeGeneration); // Increments on file changes
    const openNote = useAppStore(state => state.openNote);
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);

    // Handle resize with ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Load graph data when vault changes OR when files are modified
    // fileTreeGeneration increments whenever files change, triggering a single refresh
    useEffect(() => {
        const loadGraph = async () => {
            if (vaultPath) {
                // console.log('[GRAPH] Loading graph data, fileTreeGeneration:', fileTreeGeneration);
                try {
                    const graphData = await getGraphData(vaultPath);
                    setData(graphData);
                    // console.log('[GRAPH] Graph loaded successfully');
                } catch (e) {
                    console.error('Failed to load graph data:', e);
                }
            }
        };

        loadGraph();
    }, [vaultPath, fileTreeGeneration]);

    const handleNodeClick = useCallback((node: any) => {
        if (node && node.id) {
            openNote(node.id);
            // Center graph on node?
            // fgRef.current?.centerAt(node.x, node.y, 1000);
            // fgRef.current?.zoom(8, 2000);
        }
    }, [openNote]);

    // Get colors from CSS variables (theme system)
    const getThemeColor = (varName: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        // CSS variables are in hsl format, convert to hex if needed, or return as-is
        return value.startsWith('hsl') ? `hsl(${value})` : value;
    };

    const { settings } = useSettingsStore();
    const bgColor = getThemeColor('--background');
    const nodeColor = getThemeColor('--accent');
    const linkColor = getThemeColor('--border');
    const textColor = getThemeColor('--foreground');

    const nodeColorFn = useCallback(() => nodeColor, [nodeColor]);
    const linkColorFn = useCallback(() => linkColor, [linkColor]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (settings.graphShowLabels) {
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            ctx.fillStyle = 'rgba(255, 255, 255, 0.0)'; // Transparent bg
            // ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw text below node
            ctx.fillStyle = textColor;
            ctx.fillText(label, node.x, node.y + 8);

            node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        }
    }, [nodeColor, textColor, settings.graphShowLabels]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div className="h-14 border-b border-l border-border flex justify-between items-center px-4 shrink-0 bg-secondary/30">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                    Knowledge Graph
                </h2>
                <div className="text-xs text-muted-foreground">
                    {data.nodes.length} Notes • {data.links.length} Links
                </div>
            </div>
            <div ref={containerRef} className="flex-1 border-l border-border overflow-hidden relative">
                <ForceGraph2D
                    ref={fgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={data}
                    nodeLabel="name"
                    nodeColor={nodeColorFn}
                    linkColor={linkColorFn}
                    backgroundColor={bgColor}
                    onNodeClick={handleNodeClick}
                    nodeRelSize={6}
                    linkWidth={1}
                    linkDirectionalParticles={settings.graphShowParticles ? 2 : 0}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.005}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.1}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    nodeCanvasObject={nodeCanvasObject}
                />
            </div>
        </div>
    );
};

export default GraphView;
