import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getGraphData } from '../../lib/fs';

interface GraphNode {
    id: string;
    name: string;
    val: number;
    __bckgDimensions?: number[]; // Cache for text dimensions
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
    const vaultPath = useSettingsStore(state => state.currentVaultPath);
    const fileTreeGeneration = useAppStore(state => state.fileTreeGeneration); // Increments on file changes
    const openNote = useAppStore(state => state.openNote);
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);

    const { settings } = useSettingsStore();
    const activeThemeId = useThemeStore(state => state.activeThemeId);

    // Helper to get theme colors from CSS variables
    const getThemeColor = useCallback((varName: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return value.startsWith('hsl') ? `hsl(${value})` : value || (varName === '--background' ? '#000000' : '#ffffff');
    }, []);

    // Theme colors state - using state instead of refs to ensure re-renders when colors change
    const [themeColors, setThemeColors] = useState(() => ({
        background: getThemeColor('--background'),
        accent: getThemeColor('--accent'),
        border: getThemeColor('--border'),
        foreground: getThemeColor('--foreground')
    }));

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
                try {
                    const graphData = await getGraphData(vaultPath);
                    setData(graphData);
                } catch (e) {
                    console.error('Failed to load graph data:', e);
                }
            }
        };

        loadGraph();
    }, [vaultPath, fileTreeGeneration]);

    // Update theme colors when theme settings change
    useEffect(() => {
        // Small delay to ensure CSS variables are updated after theme change
        const timer = setTimeout(() => {
            setThemeColors({
                background: getThemeColor('--background'),
                accent: getThemeColor('--accent'),
                border: getThemeColor('--border'),
                foreground: getThemeColor('--foreground')
            });
        }, 60);

        return () => clearTimeout(timer);
    }, [settings.theme, settings.grainLevel, activeThemeId, getThemeColor]);

    const handleNodeClick = useCallback((node: any) => {
        if (node && node.id) {
            openNote(node.id);
        }
    }, [openNote]);

    // Memoize color accessors
    const nodeColorFn = useCallback(() => themeColors.accent, [themeColors.accent]);
    const linkColorFn = useCallback(() => themeColors.border, [themeColors.border]);

    // Cache font string
    const fontCache = useRef<string>('');
    const lastScale = useRef<number>(0);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;

        // Only update font string if scale changes significantly
        if (Math.abs(globalScale - lastScale.current) > 0.1 || !fontCache.current) {
            const fontSize = 12 / globalScale;
            fontCache.current = `${fontSize}px Sans-Serif`;
            lastScale.current = globalScale;
        }

        ctx.font = fontCache.current;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = themeColors.accent;
        ctx.fill();

        if (settings.graphShowLabels && globalScale > 1.2) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw text below node
            ctx.fillStyle = themeColors.foreground;
            ctx.fillText(label, node.x, node.y + 8);
        }
    }, [settings.graphShowLabels, themeColors]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background rounded-lg">
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
                    backgroundColor={themeColors.background}
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
