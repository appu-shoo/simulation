import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Text, 
  Line as ThreeLine, 
  Html,
  Environment,
  ContactShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Zap, 
  Camera as CameraIcon, 
  Waves, 
  Radio, 
  Binary,
  Settings,
  Info,
  Layers,
  Cpu,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const COLORS = {
  power: '#ff4444', // power
  ground: '#000000', // gnd
  data: '#facc15', // data
  pwm: '#3b82f6',   // pwm
  highlight: '#66fcf1', // accent
  background: '#0b0c10', // bg
  node: '#1f2833', // card
  dim: '#45a29e'  // dim
};

const BINS = [
  { id: 'metal', color: '#6b7280', label: 'METAL', icon: Radio, targetX: 3.5, targetZ: -4, angle: -Math.PI/3 },
  { id: 'wet', color: '#22c55e', label: 'WET', icon: Waves, targetX: 5.5, targetZ: -1.5, angle: -Math.PI/6 },
  { id: 'plastic', color: '#3b82f6', label: 'PLASTIC', icon: Cpu, targetX: 5.5, targetZ: 1.5, angle: Math.PI/6 },
  { id: 'ewaste', color: '#eab308', label: 'E-WASTE', icon: Monitor, targetX: 3.5, targetZ: 4, angle: Math.PI/3 },
  { id: 'dry', color: '#78350f', label: 'DRY/OTHER', icon: Info, targetX: 0, targetZ: 5.5, angle: Math.PI/2 }
];

const CATEGORIES = [
  { id: 'metal', name: 'Metal', sensor: 'Inductive', logic: 'Inductive High → Ch 0 (90°)', description: 'Detects metallic objects using electromagnetic induction.', gpio: '27', channel: '0' },
  { id: 'wet', name: 'Wet', sensor: 'Moisture', logic: 'Moisture High → Ch 1 (90°)', description: 'Measures electrical conductivity to identify organic/wet waste.', gpio: '22', channel: '1' },
  { id: 'plastic', name: 'Plastic', sensor: 'AI Camera', logic: 'AI Identify → Ch 2 (90°)', description: 'Uses computer vision models to identify plastic resins.', gpio: 'CSI', channel: '2' },
  { id: 'ewaste', name: 'E-Waste', sensor: 'AI Camera', logic: 'AI Identify → Ch 3 (90°)', description: 'Object detection for circuit boards and electronic scrap.', gpio: 'CSI', channel: '3' },
  { id: 'dry', name: 'Dry/Other', sensor: 'Dry/Other', logic: 'Default → Ch 4 (90°)', description: 'Standard fallback for non-classified dry materials.', gpio: 'Internal', channel: '4' }
];

// --- Schematic Component ---

const BlueprintBox = ({ children, title, className = "" }: { children: React.ReactNode, title: string, className?: string }) => (
  <div className={`relative border-2 border-dashed border-[#45a29e]/40 p-6 rounded-lg bg-black/60 shadow-[0_0_30px_rgba(102,252,241,0.05)] ${className}`}>
    <div className="absolute -top-3 left-4 bg-[#0b0c10] px-3 text-[11px] font-black tracking-[0.2em] text-[#66fcf1] border-x border-[#66fcf1]/30">
      {title}
    </div>
    {children}
  </div>
);

const Pin = ({ label, number, color = "#45a29e", side = "left" }: { label: string, number?: string, color?: string, side?: "left" | "right" }) => (
  <div className={`flex items-center gap-3 py-1 group ${side === "right" ? "flex-row-reverse" : ""}`}>
    <div 
      className="w-2 h-2 rounded-full border-2 transition-all group-hover:scale-125" 
      style={{ borderColor: color, backgroundColor: 'transparent' }} 
    />
    <span 
      className={`text-[10px] opacity-80 min-w-[60px] ${side === "right" ? "text-right" : ""}`}
      style={{ color }}
    >
      {label}
    </span>
    {number && <span className="text-[9px] text-[#c5c6c7]/40 font-mono">[{number}]</span>}
  </div>
);

const TechnicalSchematic = () => {
  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-auto p-12 flex justify-center items-start font-mono bg-[linear-gradient(rgba(69,162,158,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(69,162,158,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
      <div className="relative flex flex-col gap-16 items-center min-w-[1000px] border border-[#45a29e]/20 p-12 rounded-2xl bg-black/40">
        
        {/* Layer A: Input */}
        <BlueprintBox title="LAYER A: INPUT (SENSORS)" className="w-full">
          <div className="flex justify-around gap-8">
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Radio size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">IR SENSOR</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO17)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Zap size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">INDUCTIVE PROXIMITY</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO27)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Waves size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">MOISTURE SENSOR</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO22)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <CameraIcon size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">CAMERA</div>
              <div className="text-[8px] text-[#45a29e]">(CSI PORT)</div>
            </div>
          </div>
        </BlueprintBox>

        <div className="flex gap-12 w-full justify-center">
          {/* Layer B: Brain */}
          <BlueprintBox title="LAYER B: BRAIN (RASPBERRY PI 4)" className="w-[400px]">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#ff4444] text-[9px]">PIN 1 (3.3V)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 VCC</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#facc15] text-[9px]">PIN 3 (SDA)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 SDA</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#facc15] text-[9px]">PIN 5 (SCL)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 SCL</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#c5c6c7] text-[9px]">PIN 9 (GND)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 GND</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-[#66fcf1]/5 p-2 rounded border border-[#66fcf1]/20">
                  <div className="text-[8px] text-[#66fcf1]">GPIO17</div>
                  <div className="text-[7px] opacity-50">IR Arrival</div>
                </div>
                <div className="bg-[#66fcf1]/5 p-2 rounded border border-[#66fcf1]/20">
                  <div className="text-[8px] text-[#66fcf1]">GPIO27</div>
                  <div className="text-[7px] opacity-50">Metal Sensor</div>
                </div>
              </div>
            </div>
          </BlueprintBox>

          <div className="flex flex-col gap-4">
            <BlueprintBox title="SERVO DRIVER (PCA9685)" className="w-[250px]">
              <div className="text-[8px] text-[#45a29e] mb-2">I2C INTERFACE</div>
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-[#3b82f6]/20 rounded" />
                <div className="h-1.5 w-full bg-[#3b82f6]/20 rounded" />
                <div className="h-1.5 w-full bg-[#333] rounded" />
              </div>
              <div className="mt-4 text-[9px] text-[#ff4444]">V+ POWER (5V EXT)</div>
            </BlueprintBox>

            <BlueprintBox title="EXTERNAL PSU" className="w-[250px] border-solid border-[#ff4444]/30">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-[#ff4444]" />
                <div>
                  <div className="text-[10px] text-white">5V 10A DC</div>
                  <div className="text-[8px] text-[#45a29e]">HIGH CURRENT RAIL</div>
                </div>
              </div>
            </BlueprintBox>
          </div>
        </div>

        {/* Layer C: Output */}
        <BlueprintBox title="LAYER C: OUTPUT (ACTUATORS - SERVO MOTORS)" className="w-full">
          <div className="flex justify-around gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex flex-col items-center p-3 bg-black/40 border border-white/5 rounded w-32">
                <Settings size={18} className="text-[#3b82f6] mb-2 animate-spin-slow" />
                <div className="text-[9px] text-white font-bold uppercase transition-colors">Servo {i}</div>
                <div className="text-[7px] text-[#3b82f6]">CH {i-1} (PWM)</div>
              </div>
            ))}
          </div>
        </BlueprintBox>

      </div>
      
      {/* Legend */}
      <div className="fixed bottom-12 left-12 bg-black/80 border border-[#45a29e]/30 p-4 rounded-lg">
        <div className="text-[9px] font-bold text-[#66fcf1] mb-3 tracking-widest uppercase">Wiring Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#ff4444]" />
            <span className="text-[8px] text-[#c5c6c7]">+5V / 3.3V POWER</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-black border border-white/20" />
            <span className="text-[8px] text-[#c5c6c7]">GND (GROUND)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#facc15]" />
            <span className="text-[8px] text-[#c5c6c7]">DATA / SIGNAL</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#3b82f6]" />
            <span className="text-[8px] text-[#c5c6c7]">PWM SIGNAL (SERVOS)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Subcomponents ---

const PanelTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase font-bold tracking-widest text-[#45a29e] border-l-2 border-[#66fcf1] pl-2 mb-3">
    {children}
  </div>
);

const WiringPanel = () => (
  <div className="bg-[#1f2833] border border-white/5 rounded-lg p-4 h-full flex flex-col gap-6 overflow-y-auto">
    <div>
      <PanelTitle>PI TO PCA9685 (I2C)</PanelTitle>
      <table className="w-full text-left font-mono text-[10px]">
        <thead>
          <tr className="text-[#45a29e] border-b border-white/5">
            <th className="pb-2">SIGNAL</th>
            <th className="pb-2 text-center">PI PIN</th>
            <th className="pb-2 text-right">PCA9685</th>
          </tr>
        </thead>
        <tbody className="text-[#c5c6c7]">
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#ff4444]">VCC (3.3V)</td>
            <td className="py-2 text-center text-[#ff4444]">Pin 1</td>
            <td className="py-2 text-right text-[#ff4444]">VCC</td>
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#facc15]">SDA</td>
            <td className="py-2 text-center text-[#facc15]">Pin 3</td>
            <td className="py-2 text-right text-[#facc15]">SDA</td>
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#facc15]">SCL</td>
            <td className="py-2 text-center text-[#facc15]">Pin 5</td>
            <td className="py-2 text-right text-[#facc15]">SCL</td>
          </tr>
          <tr>
            <td className="py-2 opacity-60">GND</td>
            <td className="py-2 text-center opacity-60">Pin 9</td>
            <td className="py-2 text-right opacity-60">GND</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <PanelTitle>GPIO INPUT CONFIG</PanelTitle>
      <table className="w-full text-left font-mono text-[10px]">
        <thead>
          <tr className="text-[#45a29e] border-b border-white/5">
            <th className="pb-2">SENSOR</th>
            <th className="pb-2 text-center">GPIO</th>
            <th className="pb-2 text-right">PROTECT</th>
          </tr>
        </thead>
        <tbody className="text-[#c5c6c7]">
          <tr className="border-b border-white/5">
            <td>Inductive</td>
            <td className="text-center">27</td>
            <td className="text-right">10kΩ</td>
          </tr>
          <tr className="border-b border-white/5">
            <td>IR Sensor</td>
            <td className="text-center">17</td>
            <td className="text-right">Direct</td>
          </tr>
          <tr className="border-b border-white/5">
            <td>Moisture</td>
            <td className="text-center">22</td>
            <td className="text-right">Direct</td>
          </tr>
          <tr>
            <td>Camera</td>
            <td className="text-center">CSI</td>
            <td className="text-right">Ribbon</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mt-auto flex gap-4 border-t border-white/5 pt-4">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" /> PWR
      </div>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]" /> DATA
      </div>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> PWM
      </div>
    </div>
  </div>
);

const LogicMap = ({ onSimulate }: { onSimulate: (id: string) => void }) => (
  <div className="grid grid-cols-5 gap-3">
    {CATEGORIES.map((cat, i) => (
      <button 
        key={cat.id}
        onClick={() => onSimulate(cat.id)}
        className="bg-[#1f2833]/50 border border-white/10 p-3 rounded text-left hover:border-[#66fcf1]/50 hover:bg-[#1f2833] transition-all group"
      >
        <div className="text-[9px] font-mono text-[#45a29e] mb-1">0{i+1}. {cat.id.toUpperCase()}</div>
        <h4 className="text-[11px] font-bold text-[#66fcf1] mb-1 group-hover:translate-x-1 transition-transform">{cat.name}</h4>
        <p className="text-[9px] text-[#c5c6c7] opacity-60 line-clamp-1">{cat.logic}</p>
      </button>
    ))}
  </div>
);

const WasteItem = ({ categoryId, startTime, onComplete }: { categoryId: string, startTime: number, onComplete: () => void }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);
  const targetBin = BINS.find(b => b.id === categoryId);
  const DURATION = 3000; // ms

  const completed = useRef(false);

  useFrame((state, delta) => {
    const elapsed = Date.now() - startTime;
    const currentProgress = Math.min(1, elapsed / DURATION);
    setProgress(currentProgress);

    if (currentProgress < 1) {
      if (meshRef.current) {
        meshRef.current.rotation.x += delta * 5;
        meshRef.current.rotation.y += delta * 3;
      }
    } else if (!completed.current) {
      completed.current = true;
      onComplete();
    }
  });

  const position = useMemo(() => {
    if (!targetBin) return new THREE.Vector3(-6.5, 6, 0);
    
    const t = progress;
    const startX = -7.5;
    const hubX = 0;
    const hubZ = 0;
    const beltY = 1.2;

    if (t < 0.15) {
      // Phase 1: Vertical drop onto the start of the conveyor
      const rt = t / 0.15;
      return new THREE.Vector3(startX, 4.5 - rt * 3.3, 0);
    } else if (t < 0.5) {
      // Phase 2: Move along main belt to central hub
      const rt = (t - 0.15) / 0.35;
      return new THREE.Vector3(startX + (hubX - startX) * rt, beltY, 0);
    } else if (t < 0.85) {
      // Phase 3: Move along branching chute to target bin
      const rt = (t - 0.5) / 0.35;
      return new THREE.Vector3(
        hubX + (targetBin.targetX - hubX) * rt,
        beltY,
        hubZ + (targetBin.targetZ - hubZ) * rt
      );
    } else {
      // Phase 4: Drop into bin
      const ft = (t - 0.85) / 0.15;
      return new THREE.Vector3(
        targetBin.targetX,
        beltY - ft * 4.5,
        targetBin.targetZ
      );
    }
  }, [progress, targetBin]);

  const scale = progress < 0.9 ? 1 : 1 - (progress - 0.9) * 10;

  return (
    <group ref={meshRef} position={position} scale={[scale, scale, scale]}>
      {categoryId === 'plastic' && (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.4, 8]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} roughness={0.1} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        </group>
      )}
      {categoryId === 'metal' && (
        <mesh castShadow>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.2} />
        </mesh>
      )}
      {categoryId === 'wet' && (
        <mesh castShadow>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#166534" roughness={1} />
        </mesh>
      )}
      {categoryId === 'ewaste' && (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.05, 0.4]} />
            <meshStandardMaterial color="#065f46" roughness={0.5} />
          </mesh>
          <mesh position={[0.05, 0.03, 0.05]}>
            <boxGeometry args={[0.1, 0.02, 0.1]} />
            <meshStandardMaterial color="#66fcf1" emissive="#66fcf1" emissiveIntensity={2} />
          </mesh>
        </group>
      )}
      {categoryId === 'dry' && (
        <mesh castShadow>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
};

const Bin = ({ position, color, label }: { position: [number, number, number], color: string, label: string }) => (
  <group position={position}>
    {/* Main Bin Solid (Outer Shell) */}
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.3, 1.8, 1.3]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
    </mesh>
    {/* Rim at top */}
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[1.4, 0.15, 1.4]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
    {/* Dark interior hole - larger and slightly recessed */}
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[1.15, 0.02, 1.15]} />
      <meshStandardMaterial color="#000" />
    </mesh>
    {/* Label Plate */}
    <mesh position={[0, -0.4, 0.66]}>
      <planeGeometry args={[1, 0.4]} />
      <meshStandardMaterial color="#000" opacity={0.6} transparent />
    </mesh>
    <Text
      position={[0, -0.4, 0.67]}
      fontSize={0.16}
      color="white"
      fontWeight="bold"
      anchorY="middle"
    >
      {label}
    </Text>
    <group position={[0, 0.1, 0.67]}>
       <mesh>
         <sphereGeometry args={[0.07, 12, 12]} />
         <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.2} />
       </mesh>
    </group>
  </group>
);

const SegregatorStructure = ({ activeCategories }: { activeCategories: string[] }) => (
  <group>
    {/* Base Plate - Larger for radial layout */}
    <mesh position={[0, -5.2, 0]} receiveShadow opacity={0.3} transparent>
      <boxGeometry args={[25, 0.2, 25]} />
      <meshStandardMaterial color="#1f1f1f" />
    </mesh>
    
    {/* Main Horizontal Conveyor (Inlet) */}
    <mesh position={[-3.75, 1, 0]} castShadow receiveShadow>
      <boxGeometry args={[7.5, 0.2, 1.2]} />
      <meshStandardMaterial color="#222" roughness={0.9} />
    </mesh>
    <mesh position={[-3.75, 1.11, 0]}>
      <boxGeometry args={[7.3, 0.02, 1.1]} />
      <meshStandardMaterial color="#111" />
    </mesh>
    
    {/* Side Walls for Main Conveyor */}
    <mesh position={[-3.75, 1.1, -0.65]}>
      <boxGeometry args={[7.5, 0.3, 0.1]} />
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[-3.75, 1.1, 0.65]}>
      <boxGeometry args={[7.5, 0.3, 0.1]} />
      <meshStandardMaterial color="#333" />
    </mesh>

    {/* Distribution Hub at center */}
    <mesh position={[0, 1, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.5, 1.5, 0.4, 32]} />
      <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 1.21, 0]}>
      <cylinderGeometry args={[1.4, 1.4, 0.05, 32]} />
      <meshStandardMaterial color="#66fcf1" emissive="#66fcf1" emissiveIntensity={0.5} transparent opacity={0.2} />
    </mesh>

    {/* Branching Chutes/Conveyors leading to respective containers */}
    {BINS.map(bin => {
      const dist = Math.sqrt(bin.targetX**2 + bin.targetZ**2);
      const angle = Math.atan2(bin.targetZ, bin.targetX);
      const isActive = activeCategories.includes(bin.id);
      
      return (
        <group key={`chute-${bin.id}`} rotation={[0, -angle, 0]} position={[0, 1, 0]}>
          <mesh position={[dist/2, 0.05, 0]}>
            <boxGeometry args={[dist, 0.1, 1]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[dist/2, 0.15, -0.55]}>
            <boxGeometry args={[dist + 0.2, 0.4, 0.1]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
          <mesh position={[dist/2, 0.15, 0.55]}>
            <boxGeometry args={[dist + 0.2, 0.4, 0.1]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
          
          {/* Servo Motor Actuator */}
          <Servo 
            position={[1.2, 0.5, 0]} 
            active={isActive} 
            label="" 
          />
        </group>
      );
    })}

    {/* Sensors along main belt (IR, Moisture, Inductive) */}
    <group position={[-5.5, 1.3, 0]}>
       <mesh position={[0, 0, -0.8]}> {/* IR */}
         <boxGeometry args={[0.3, 0.3, 0.3]} />
         <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={2} />
       </mesh>
       <mesh position={[2, 0, -0.8]}> {/* Moisture */}
         <boxGeometry args={[0.3, 0.3, 0.3]} />
         <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
       </mesh>
       <mesh position={[4, 0, -0.8]}> {/* Inductive */}
         <boxGeometry args={[0.3, 0.3, 0.3]} />
         <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
       </mesh>
    </group>

    {/* Support legs */}
    <mesh position={[-7, -2.1, 0]}>
      <boxGeometry args={[0.2, 6, 0.2]} />
      <meshStandardMaterial color="#444" />
    </mesh>
    <mesh position={[0, -2.1, 0]}>
      <boxGeometry args={[0.2, 6, 0.2]} />
      <meshStandardMaterial color="#444" />
    </mesh>

    {/* Waste Inlet Head */}
    <group position={[-7.5, 4.5, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <Text position={[0, 1, 0]} fontSize={0.15} color="#66fcf1" anchorY="bottom">
        INLET_SOURCE
      </Text>
    </group>

    {/* Camera Post / AI Vision System */}
    <group position={[-1.5, 1, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, 3, 0.3]}>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 3, 0.6]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#000" roughness={0} metalness={1} />
      </mesh>
      <Text position={[0, 3.4, 0.6]} fontSize={0.12} color="#66fcf1">AI_CAM</Text>
    </group>

    {/* Control Box */}
    <group position={[-7.5, 1, 1.5]}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 2, 0.5]} />
        <meshStandardMaterial color="#1f2833" />
      </mesh>
      <Text rotation={[0, 0, 0]} position={[0, 0, 0.26]} fontSize={0.1} color="#facc15">
        PLC_SYSTEM
      </Text>
    </group>
  </group>
);

const ComponentBox = ({ position, label, color = COLORS.node, icon: Icon, onClick }: any) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group position={position} onClick={onClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.6, 0.3]} />
        <meshStandardMaterial color={hovered ? '#45a29e' : color} roughness={0.1} metalness={0.8} />
      </mesh>
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.1}
        color={hovered ? "white" : "#c5c6c7"}
      >
        {label}
      </Text>
      <Html position={[0, 0.4, 0]} center>
         <div className={`p-1 rounded bg-[#1f2833]/80 border border-[#45a29e]/30 pointer-events-none transition-transform ${hovered ? 'scale-110 border-[#66fcf1]' : 'scale-100'}`}>
            {Icon && <Icon size={10} className={hovered ? "text-[#66fcf1]" : "text-[#45a29e]"} />}
         </div>
      </Html>
    </group>
  );
};

const RaspberryPi = ({ position }: any) => {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 0.1]} />
        <meshStandardMaterial color="#145a32" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* CPU */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#333" metalness={1} />
      </mesh>
      {/* Ports */}
      <mesh position={[0.8, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 1]} />
        <meshStandardMaterial color="#c5c6c7" />
      </mesh>
      <Text position={[0, 0.4, 0]} fontSize={0.12} color="#66fcf1" anchorY="bottom">
        RPI 4B
      </Text>
    </group>
  );
};

const Servo = ({ position, active, label }: any) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (active && meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, Math.PI / 2, 0.1);
    } else if (meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color="#1f2833" />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1.05, 1.05, 1.05]}>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshBasicMaterial color="#66fcf1" transparent opacity={0.05} />
      </mesh>
      <group ref={meshRef} position={[0, 0.4, 0]}>
        <mesh position={[0, 0.1, 0.3]}>
          <boxGeometry args={[1.2, 0.1, 0.2]} />
          <meshStandardMaterial color="#c5c6c7" />
        </mesh>
      </group>
      <Text position={[0, -0.8, 0]} fontSize={0.12} color="#45a29e">
        {label}
      </Text>
    </group>
  );
};

const DataPulse = ({ points, color, speed = 1, onComplete }: { points: THREE.Vector3[], color: string, speed?: number, onComplete?: () => void }) => {
  const [progress, setProgress] = useState(0);
  const totalSteps = points.length - 1;

  useFrame((state, delta) => {
    if (progress < totalSteps) {
      const nextProgress = progress + delta * speed;
      if (nextProgress >= totalSteps) {
        setProgress(totalSteps);
        onComplete?.();
      } else {
        setProgress(nextProgress);
      }
    }
  });

  const segments = useMemo(() => {
    const p = Math.floor(progress);
    const subProgress = progress - p;
    if (p >= totalSteps) return points[totalSteps];
    
    return new THREE.Vector3().lerpVectors(points[p], points[p + 1], subProgress);
  }, [progress, points, totalSteps]);

  return (
    <mesh position={[segments.x, segments.y, segments.z]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} />
      <pointLight color={color} intensity={0.5} distance={1} />
    </mesh>
  );
};

// --- Main Application ---

export default function App() {
  const [activeItems, setActiveItems] = useState<{ id: string, categoryId: string, startTime: number }[]>([]);
  const [viewMode, setViewMode] = useState<'3D' | 'SCHEMATIC'>('3D');

  const startSimulation = (categoryId: string) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId,
      startTime: Date.now()
    };
    setActiveItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setActiveItems(prev => prev.filter(item => item.id !== id));
  };

  const triggerRandom = () => {
    const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    startSimulation(randomCat.id);
  };

  const cablePaths = useMemo(() => {
    return CATEGORIES.reduce((acc: any, cat, idx) => {
      // Adjusted positions for sensors on main belt and Pi
      const sensorPos = new THREE.Vector3(-5.5 + idx * 1.5, 1.3, -0.8);
      const piPos = new THREE.Vector3(-5, -4, 5); 
      const bin = BINS.find(b => b.id === cat.id);
      const servoPos = new THREE.Vector3(bin?.targetX ? bin.targetX * 0.2 : 0, 1.4, bin?.targetZ ? bin.targetZ * 0.2 : 0);

      acc[cat.id] = {
        sensorToPi: [
          sensorPos, 
          new THREE.Vector3(sensorPos.x, sensorPos.y, 5),
          piPos
        ],
        piToServo: [
          piPos, 
          new THREE.Vector3(servoPos.x, -4, 5),
          servoPos
        ]
      };
      return acc;
    }, {});
  }, []);

  return (
    <div className="h-screen w-full bg-[#0b0c10] text-[#c5c6c7] p-6 flex flex-col gap-5 overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#45a29e] pb-3">
        <div className="flex items-center gap-6 text-white">
          <div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-[#66fcf1] uppercase">5-Category Waste Segregator</h1>
            <p className="text-[10px] text-[#45a29e] font-mono tracking-wider">3D CIRCUIT ARCHITECTURE & LOGIC FLOW</p>
          </div>
          
          <div className="flex bg-[#1f2833] p-1 rounded border border-white/5">
            <button 
              onClick={() => setViewMode('3D')}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-all text-[10px] font-bold ${viewMode === '3D' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-[#45a29e] hover:text-[#c5c6c7]'}`}
            >
              <Cpu size={12} /> 3D FLOW
            </button>
            <button 
              onClick={() => setViewMode('SCHEMATIC')}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-all text-[10px] font-bold ${viewMode === 'SCHEMATIC' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-[#45a29e] hover:text-[#c5c6c7]'}`}
            >
              <Layers size={12} /> SCHEMATIC
            </button>
          </div>
        </div>
        
        <div className="font-mono text-[10px] bg-[#66fcf1]/10 px-3 py-1 border border-[#66fcf1] rounded text-[#66fcf1] tracking-widest flex items-center gap-4">
          <button 
            onClick={triggerRandom}
            disabled={activeItems.length > 0}
            className={`px-2 py-0.5 rounded bg-[#66fcf1] text-[#0b0c10] font-black hover:opacity-80 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2`}
          >
            <Zap size={10} fill="currentColor" /> TEST_TRIGGER
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full bg-[#66fcf1] ${activeItems.length > 0 ? 'animate-ping' : 'animate-pulse'}`} />
            {activeItems.length > 0 ? `SIMULATING_${activeItems.length}_FLOWS...` : 'SYSTEM_READY // I2C_IDLE'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewMode === '3D' ? (
            <motion.div 
              key="3d" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-full w-full grid grid-cols-[300px_1fr] gap-5"
            >
              <WiringPanel />
              
              <div className="relative bg-black border border-[#45a29e]/30 rounded-xl overflow-hidden group">
                <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
                  <color attach="background" args={['#0b0c10']} />
                  <PerspectiveCamera makeDefault position={[8, 4, 12]} fov={40} />
                  <OrbitControls 
                    enablePan={false} 
                    maxPolarAngle={Math.PI / 2} 
                    minPolarAngle={Math.PI / 6}
                    maxDistance={25}
                    minDistance={5}
                  />

                    <Suspense fallback={<mesh><sphereGeometry args={[0.1]} /><meshStandardMaterial color="#66fcf1" emissive="#66fcf1" /></mesh>}>
                      <ambientLight intensity={0.5} />
                      <Environment preset="city" />
                      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                      <pointLight position={[-10, 5, 5]} intensity={0.5} />

                      <SegregatorStructure activeCategories={activeItems.map(i => i.categoryId)} />

                      {activeItems.map(item => (
                        <WasteItem 
                          key={item.id}
                          categoryId={item.categoryId} 
                          startTime={item.startTime}
                          onComplete={() => removeItem(item.id)}
                        />
                      ))}

                      <group position={[0, -3.5, 0]}>
                        {BINS.map(bin => (
                          <Bin 
                            key={bin.id}
                            position={[bin.targetX, 0, bin.targetZ]} 
                            color={bin.color} 
                            label={bin.label} 
                          />
                        ))}
                      </group>

                    <group position={[0, 0, 0]}>
                      {/* Sensor UI Labels */}
                      <ComponentBox 
                        position={[-5.5, 2, -0.8]} 
                        label="IR_SENSE"
                        icon={Radio}
                      />
                      <ComponentBox 
                        position={[-3.5, 2, -0.8]} 
                        label="MOIST_SENSE"
                        icon={Waves}
                      />
                      <ComponentBox 
                        position={[-1.5, 2, -0.8]} 
                        label="METAL_SENSE"
                        icon={Zap}
                      />

                      <RaspberryPi position={[-8, -4, 5]} rotation={[0, 0, 0]} />
                      
                      {/* Remote Labels for Servos / Bins logic visualization removed as they are integrated now */}
                      
                      {/* Circuit Floor Plane */}
                      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]} receiveShadow>
                        <planeGeometry args={[30, 30]} />
                        <meshStandardMaterial color="#0b0c10" roughness={1} metalness={0} opacity={0.5} transparent />
                      </mesh>

                      {CATEGORIES.map((cat) => {
                        const path = cablePaths[cat.id];
                        const isActive = activeItems.some(item => item.categoryId === cat.id);
                        return (
                          <group key={`wires-${cat.id}`}>
                            <ThreeLine 
                              points={path.sensorToPi} 
                              color={isActive ? COLORS.highlight : COLORS.data} 
                              lineWidth={isActive ? 3 : 1} 
                              transparent 
                              opacity={isActive ? 0.8 : 0.1} 
                            />
                            <ThreeLine 
                              points={path.piToServo} 
                              color={isActive ? COLORS.highlight : COLORS.pwm} 
                              lineWidth={isActive ? 3 : 1} 
                              transparent 
                              opacity={isActive ? 0.8 : 0.1} 
                            />
                            {isActive && (
                              <>
                                <DataPulse points={path.sensorToPi} color={COLORS.highlight} speed={6} />
                                <DataPulse points={path.piToServo} color={COLORS.highlight} speed={6} />
                              </>
                            )}
                          </group>
                        );
                      })}
                    </group>
                  </Suspense>
                </Canvas>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="schematic" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-full w-full rounded-xl overflow-hidden border border-[#45a29e]/30"
            >
              <TechnicalSchematic />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="h-auto">
        <LogicMap onSimulate={startSimulation} />
      </footer>
    </div>
  );
}
