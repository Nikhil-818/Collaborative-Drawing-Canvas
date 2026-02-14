"use client";

import {useEffect, useState, useRef} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Activity, Zap, Layers} from 'lucide-react';
import type {PerformanceMetrics} from '@/lib/types';

type PerformanceMonitorProps = {
    elementsCount: number;
    pointsRendered: number;
    enabled?: boolean;
};

export function PerformanceMonitor(
    {
        elementsCount,
        pointsRendered,
        enabled = true
    }: PerformanceMonitorProps) {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 0,
        latency: 0,
        pointsRendered: 0,
        elementsCount: 0,
    });

    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(Date.now());
    const pingStartRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) return;

        let animationFrameId: number;

        const measureFPS = () => {
            frameCountRef.current++;
            const now = Date.now();
            const elapsed = now - lastTimeRef.current;

            if (elapsed >= 1000) {
                const fps = Math.round((frameCountRef.current * 1000) / elapsed);
                setMetrics((prev) => ({
                    ...prev,
                    fps,
                    pointsRendered,
                    elementsCount,
                }));
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }

            animationFrameId = requestAnimationFrame(measureFPS);
        };

        animationFrameId = requestAnimationFrame(measureFPS);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [enabled, pointsRendered, elementsCount]);

    // Measure network latency (ping)
    useEffect(() => {
        if (!enabled) return;

        const measureLatency = () => {
            pingStartRef.current = Date.now();
            // Simulate ping measurement
            const latency = Math.floor(Math.random() * 50) + 20; // 20-70ms simulation
            setMetrics((prev) => ({...prev, latency}));
        };

        const interval = setInterval(measureLatency, 2000);
        return () => clearInterval(interval);
    }, [enabled]);

    if (!enabled) return null;

    const getFPSColor = (fps: number) => {
        if (fps >= 50) return 'text-green-500';
        if (fps >= 30) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getLatencyColor = (latency: number) => {
        if (latency <= 50) return 'text-green-500';
        if (latency <= 100) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <Card className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm shadow-lg border">
            <CardContent className="p-3">
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4"/>
                        <span className="text-muted-foreground">FPS:</span>
                        <span className={`font-mono font-bold ${getFPSColor(metrics.fps)}`}>
              {metrics.fps}
            </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4"/>
                        <span className="text-muted-foreground">Latency:</span>
                        <span className={`font-mono font-bold ${getLatencyColor(metrics.latency)}`}>
              {metrics.latency}ms
            </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4"/>
                        <span className="text-muted-foreground">Elements:</span>
                        <span className="font-mono font-bold">{metrics.elementsCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground ml-6">Points:</span>
                        <span className="font-mono font-bold">{metrics.pointsRendered}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
